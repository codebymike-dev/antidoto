"use server";

import { revalidatePath } from "next/cache";
import { one, run } from "./db";
import { endSessions, hashPassword, verifyPassword } from "./auth";
import { audit, requireSuper, requireUser } from "./admin-guard";
import { generatePassword, normalizeUsername, passwordError, usernameError } from "./admin-users";
import { rateLimit } from "./rate-limit";

// Usuarios del portal. Los crea el superadmin con una contraseña generada que se muestra
// una sola vez; cada quien la cambia después en Mi cuenta. Desactivar no borra: el nombre
// sigue en el historial y en las partidas que lanzó.

/** Lo que ve el superadmin tras crear un acceso o generar otra contraseña. */
export type CredentialsState = { ok: true; username: string; password: string } | { ok: false; error: string } | null;

export type ChangePasswordState = { ok: true } | { ok: false; error: string } | null;

/** Id numérico positivo de un campo del form, o null. */
function formId(formData: FormData, key: string): number | null {
  const n = Number(formData.get(key));
  return Number.isInteger(n) && n > 0 ? n : null;
}

interface Target {
  id: number;
  username: string;
  role: "super" | "empresa";
  company_id: number | null;
  company_name: string | null;
  disabled: boolean;
}

async function targetFromForm(formData: FormData): Promise<Target | null> {
  const id = formId(formData, "userId");
  if (!id) return null;
  const row = await one<Omit<Target, "disabled"> & { disabled_at: string | null }>(
    `SELECT u.id, u.username, u.role, u.company_id, c.name AS company_name, d.disabled_at
     FROM admin_users u
     LEFT JOIN companies c ON c.id = u.company_id
     LEFT JOIN admin_user_disabled d ON d.admin_user_id = u.id
     WHERE u.id = ?`,
    [id]
  );
  if (!row) return null;
  const { disabled_at, ...rest } = row;
  return { ...rest, id: Number(rest.id), company_id: rest.company_id === null ? null : Number(rest.company_id), disabled: disabled_at !== null };
}

function who(t: Pick<Target, "username" | "company_name">) {
  return t.company_name ? `"${t.username}" de ${t.company_name}` : `superadmin "${t.username}"`;
}

function revalidateUsers(companyId: number | null) {
  revalidatePath(companyId === null ? "/admin/ajustes" : `/admin/empresas/${companyId}`);
}

/** Crea un admin de la empresa del form, o un superadmin si el form no trae empresa. */
export async function createPortalUser(_prev: CredentialsState, formData: FormData): Promise<CredentialsState> {
  const user = await requireSuper();
  const companyId = formId(formData, "companyId");
  const username = normalizeUsername(String(formData.get("username") ?? ""));

  const invalid = usernameError(username);
  if (invalid) return { ok: false, error: invalid };

  let companyName: string | null = null;
  if (companyId !== null) {
    const company = await one<{ name: string; archived: number }>(
      `SELECT name, EXISTS (SELECT 1 FROM company_archive ca WHERE ca.company_id = c.id) AS archived
       FROM companies c WHERE id = ?`,
      [companyId]
    );
    if (!company) return { ok: false, error: "No encontramos la empresa." };
    if (Number(company.archived) === 1) return { ok: false, error: "La empresa está archivada: restáurala antes de darle acceso a alguien." };
    companyName = company.name;
  }

  if (await one("SELECT 1 FROM admin_users WHERE username = ?", [username])) {
    return { ok: false, error: `Ya existe alguien con el usuario "${username}". Elige otro.` };
  }

  const password = generatePassword();
  try {
    await run("INSERT INTO admin_users (username, password_hash, role, company_id) VALUES (?, ?, ?, ?)", [
      username,
      await hashPassword(password),
      companyId === null ? "super" : "empresa",
      companyId,
    ]);
  } catch {
    // Dos altas a la vez con el mismo usuario: el UNIQUE frena la segunda.
    return { ok: false, error: `Ya existe alguien con el usuario "${username}". Elige otro.` };
  }

  await audit(`Acceso al portal creado para ${who({ username, company_name: companyName })}.`, user, companyId);
  revalidateUsers(companyId);
  return { ok: true, username, password };
}

/** Genera otra contraseña para alguien que olvidó la suya. Cierra sus sesiones abiertas. */
export async function resetPortalPassword(_prev: CredentialsState, formData: FormData): Promise<CredentialsState> {
  const user = await requireSuper();
  const target = await targetFromForm(formData);
  if (!target) return { ok: false, error: "No encontramos ese usuario." };
  if (target.id === user.id) return { ok: false, error: "Tu propia contraseña se cambia en Mi cuenta." };

  const password = generatePassword();
  await run("UPDATE admin_users SET password_hash = ? WHERE id = ?", [await hashPassword(password), target.id]);
  await endSessions(target.id);
  await audit(`Nueva contraseña generada para ${who(target)}.`, user, target.company_id);
  revalidateUsers(target.company_id);
  return { ok: true, username: target.username, password };
}

/** Desactivar o reactivar. Desactivado no puede entrar y se le cierran las sesiones. */
export async function setPortalUserDisabled(formData: FormData) {
  const user = await requireSuper();
  const target = await targetFromForm(formData);
  if (!target || target.id === user.id) return;
  const disable = formData.get("disabled") === "1";

  if (disable) {
    // Nunca dejar el portal sin un superadmin activo. La interfaz ya esconde el botón
    // (el último superadmin activo es quien está aquí), esto cubre una carrera entre dos.
    if (target.role === "super") {
      const others = await one<{ n: number }>(
        `SELECT COUNT(*) AS n FROM admin_users u
         WHERE u.role = 'super' AND u.id <> ?
           AND NOT EXISTS (SELECT 1 FROM admin_user_disabled d WHERE d.admin_user_id = u.id)`,
        [target.id]
      );
      if (!others || Number(others.n) === 0) return;
    }
    await run("INSERT OR IGNORE INTO admin_user_disabled (admin_user_id) VALUES (?)", [target.id]);
    await endSessions(target.id);
    await audit(`Acceso al portal desactivado para ${who(target)}.`, user, target.company_id);
  } else {
    await run("DELETE FROM admin_user_disabled WHERE admin_user_id = ?", [target.id]);
    await audit(`Acceso al portal reactivado para ${who(target)}.`, user, target.company_id);
  }
  revalidateUsers(target.company_id);
}

/** Cada quien cambia su contraseña. Pide la actual y cierra las demás sesiones. */
export async function changeOwnPassword(_prev: ChangePasswordState, formData: FormData): Promise<ChangePasswordState> {
  const user = await requireUser();
  const current = String(formData.get("current") ?? "");
  const next = String(formData.get("next") ?? "");
  const confirm = String(formData.get("confirm") ?? "");

  if (!current || !next || !confirm) return { ok: false, error: "Llena los tres campos." };
  // Igual que el login: con una sesión robada no se puede adivinar la contraseña a ciegas.
  if (!(await rateLimit(`password:user:${user.id}`, 5, 900))) {
    return { ok: false, error: "Demasiados intentos. Espera unos minutos y vuelve a intentarlo." };
  }

  const row = await one<{ password_hash: string }>("SELECT password_hash FROM admin_users WHERE id = ?", [user.id]);
  if (!row || !(await verifyPassword(current, row.password_hash))) {
    return { ok: false, error: "La contraseña actual no es correcta." };
  }
  if (next !== confirm) return { ok: false, error: "La nueva contraseña y su confirmación no coinciden." };
  const invalid = passwordError(next);
  if (invalid) return { ok: false, error: invalid };
  if (next === current) return { ok: false, error: "La nueva contraseña debe ser distinta de la actual." };

  await run("UPDATE admin_users SET password_hash = ? WHERE id = ?", [await hashPassword(next), user.id]);
  await endSessions(user.id, true);
  await audit(`${who({ username: user.username, company_name: user.company_name })} cambió su contraseña.`, user, user.company_id);
  return { ok: true };
}
