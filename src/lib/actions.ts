"use server";

import { randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { one, run } from "./db";
import { destroySession, login } from "./auth";
import { audit, requireSuper, requireUser } from "./admin-guard";
import { findByCode } from "./queries";
import { ensureExperienceMission } from "./experience-data";
import { getExperience, seriesEntry } from "./experiences/catalog";
import { PARTICIPATION_COOKIE } from "./participation";
import { clientIp, isLimited, rateLimit, recordHit } from "./rate-limit";
import { formatExpiryDate, isDateOnly } from "./expiry";

// --- Participante ---------------------------------------------------------

export type JoinState = { error: string } | null;

export async function joinActivity(_prev: JoinState, formData: FormData): Promise<JoinState> {
  const name = String(formData.get("name") ?? "").trim();
  const code = String(formData.get("code") ?? "").trim();
  const accepted = formData.get("acceptedPolicy") === "on";

  if (!name) return { error: "Ingresa tu nombre." };
  if (!code) return { error: "Ingresa el código de tu actividad." };
  if (!accepted) return { error: "Debes aceptar la política de tratamiento de datos." };

  // Los códigos son cortos: sin límite, serían adivinables por fuerza bruta. Se cuentan
  // solo los códigos inexistentes: un grupo entero entra desde la misma IP de la oficina.
  const ip = await clientIp();
  const failKey = `join-fail:${ip}`;
  if (await isLimited(failKey, 15, 60)) {
    return { error: "Demasiados intentos. Espera un minuto y vuelve a intentarlo." };
  }

  const match = await findByCode(code);
  if (!match) {
    await recordHit(failKey);
    return { error: "Código no encontrado o inválido. Verifica con tu administrador." };
  }
  if (match.archivado) {
    return { error: "Esta actividad ya no está disponible. Contacta a tu administrador." };
  }
  if (match.estado === "vencido") {
    const fecha = match.expira ? formatExpiryDate(match.expira) : "";
    return { error: `Este código venció el ${fecha}. Contacta a tu administrador.` };
  }

  const id = randomBytes(16).toString("hex");
  await run(
    `INSERT INTO participations (id, activity_code_id, participant_name, accepted_policy_at)
     VALUES (?, ?, ?, datetime('now'))`,
    [id, match.activity_code_id, name]
  );

  const jar = await cookies();
  jar.set(PARTICIPATION_COOKIE, id, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });

  redirect("/mision");
}

export async function completeMission() {
  const jar = await cookies();
  const id = jar.get(PARTICIPATION_COOKIE)?.value;
  if (!id) redirect("/");

  await run(
    `UPDATE participations
     SET completed_at = datetime('now'), avance = 100, puntaje = COALESCE(puntaje, 8.0)
     WHERE id = ? AND completed_at IS NULL`,
    [id]
  );

  revalidatePath("/mision");
  redirect("/mision/completada");
}

export async function leaveActivity() {
  const jar = await cookies();
  jar.delete(PARTICIPATION_COOKIE);
  redirect("/");
}

// --- Auth admin -----------------------------------------------------------

export type LoginState = { error: string } | null;

export async function loginAction(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const username = String(formData.get("username") ?? "");
  const password = String(formData.get("password") ?? "");

  if (!username || !password) return { error: "Ingresa tu usuario y contraseña." };

  // El límite por usuario va atado a la IP: si contara global, cualquiera podría dejar
  // al superadmin sin acceso con 5 intentos fallidos desde su casa.
  const ip = await clientIp();
  const ipOk = await rateLimit(`login:ip:${ip}`, 10, 300);
  const userOk = await rateLimit(`login:user:${username.trim().toLowerCase()}:${ip}`, 5, 900);
  if (!ipOk || !userOk) {
    return { error: "Demasiados intentos. Espera unos minutos y vuelve a intentarlo." };
  }

  if (!(await login(username, password))) return { error: "Usuario o contraseña incorrectos." };

  redirect("/admin");
}

export async function logoutAction() {
  await destroySession();
  redirect("/");
}

// --- Portal admin --------------------------------------------------

// Sin 0/O ni 1/I, que se confunden al dictar o copiar el código. Son 32 símbolos:
// byte % 32 no tiene sesgo. 6 caracteres dan ~1.000 millones de combinaciones, así
// que conocer la misión y la empresa ya no basta para adivinar un código.
const CODE_ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";

function randomCodeSuffix(length = 6): string {
  return Array.from(randomBytes(length), (b) => CODE_ALPHABET[b % CODE_ALPHABET.length]).join("");
}

/** Id numérico positivo de un campo del form, o null. */
function formId(formData: FormData, key: string): number | null {
  const n = Number(formData.get(key));
  return Number.isInteger(n) && n > 0 ? n : null;
}

async function uniqueCode(missionTitle: string, companyName: string): Promise<string | null> {
  const prefix = missionTitle.replace(/[^A-Za-z]/g, "").slice(0, 2).toUpperCase();
  const slug = companyName.split(/\s+/)[0].normalize("NFD").replace(/[^A-Za-z0-9]/g, "").toUpperCase().slice(0, 6);
  // code es UNIQUE: si el sufijo aleatorio choca, se reintenta.
  for (let attempt = 0; attempt < 10; attempt++) {
    const candidate = `${prefix}-${slug || "EMP"}-${randomCodeSuffix()}`;
    const taken = await one("SELECT 1 FROM activity_codes WHERE code = ?", [candidate]);
    if (!taken) return candidate;
  }
  return null;
}

function revalidateCompany(companyId: number) {
  revalidatePath("/admin");
  revalidatePath("/admin/empresas");
  revalidatePath(`/admin/empresas/${companyId}`);
}

export type AssignState = { error: string } | null;

/**
 * Asigna una actividad de la biblioteca a una empresa: crea su código. La empresa se
 * elige de la lista (nunca se crea una por un nombre mal escrito).
 */
export async function assignActivity(_prev: AssignState, formData: FormData): Promise<AssignState> {
  const user = await requireSuper();
  const companyId = formId(formData, "companyId");
  if (!companyId) return { error: "Elige la empresa." };
  const def = getExperience(String(formData.get("experience") ?? ""));
  if (!def) return { error: "Elige la actividad." };
  const expira = String(formData.get("expira") ?? "").trim();
  // Solo lo que envía <input type="date">: un texto libre nunca vencería.
  if (expira && !isDateOnly(expira)) return { error: "La fecha de cierre no es válida." };

  const company = await one<{ name: string; archived: number }>(
    `SELECT name, EXISTS (SELECT 1 FROM company_archive WHERE company_id = companies.id) AS archived
     FROM companies WHERE id = ?`,
    [companyId]
  );
  if (!company) return { error: "Esa empresa ya no existe." };
  if (Number(company.archived) === 1) return { error: "Esa empresa está archivada. Restáurala antes de asignarle actividades." };

  // Una serie (la Ruta del café) se asigna siempre desde su primera estación.
  const entry = seriesEntry(def);
  const missionId = await ensureExperienceMission(entry);
  const missionTitle = (await one<{ title: string }>("SELECT title FROM missions WHERE id = ?", [missionId]))!.title;
  const code = await uniqueCode(entry.series, company.name);
  if (!code) return { error: "No pudimos generar el código. Inténtalo de nuevo." };

  await run(
    `INSERT INTO activity_codes (code, mission_id, company_id, estado, expires_at) VALUES (?, ?, ?, 'activo', ?)`,
    [code, missionId, companyId, expira || null]
  );
  await audit(`Actividad "${missionTitle}" asignada a ${company.name} con el código ${code}.`, user, companyId);

  revalidateCompany(companyId);
  redirect(`/admin/empresas/${companyId}?asignada=${encodeURIComponent(code)}`);
}

/** El código de actividad del form, con su empresa, si existe. */
async function codeFromForm(formData: FormData) {
  const id = formId(formData, "codeId");
  if (!id) return null;
  const row = await one<{ id: number; code: string; company_id: number; empresa: string }>(
    `SELECT ac.id, ac.code, ac.company_id, c.name AS empresa
     FROM activity_codes ac JOIN companies c ON c.id = ac.company_id WHERE ac.id = ?`,
    [id]
  );
  return row ? { ...row, id: Number(row.id), company_id: Number(row.company_id) } : null;
}

/** Pausar o reanudar: pausado, quien entra con el código ve un aviso y no puede jugar. */
export async function setCodePaused(formData: FormData) {
  const user = await requireSuper();
  const code = await codeFromForm(formData);
  if (!code) return;
  const paused = formData.get("paused") === "1";
  await run("UPDATE activity_codes SET estado = ? WHERE id = ?", [paused ? "pausado" : "activo", code.id]);
  await audit(`Código ${code.code} de ${code.empresa} ${paused ? "pausado" : "reanudado"}.`, user, code.company_id);
  revalidateCompany(code.company_id);
}

export async function setCodeExpiry(formData: FormData) {
  const user = await requireSuper();
  const code = await codeFromForm(formData);
  if (!code) return;
  const expira = String(formData.get("expira") ?? "").trim();
  if (expira && !isDateOnly(expira)) return;
  await run("UPDATE activity_codes SET expires_at = ? WHERE id = ?", [expira || null, code.id]);
  await audit(
    expira ? `Código ${code.code} de ${code.empresa} ahora cierra el ${formatExpiryDate(expira)}.` : `Código ${code.code} de ${code.empresa} ya no tiene fecha de cierre.`,
    user,
    code.company_id
  );
  revalidateCompany(code.company_id);
}

/** Quitar una actividad a una empresa: se archiva, los resultados se conservan. */
export async function archiveCode(formData: FormData) {
  const user = await requireSuper();
  const code = await codeFromForm(formData);
  if (!code) return;
  await run("INSERT OR IGNORE INTO activity_code_archive (activity_code_id) VALUES (?)", [code.id]);
  await audit(`Código ${code.code} quitado a ${code.empresa} (archivado).`, user, code.company_id);
  revalidateCompany(code.company_id);
}

export async function restoreCode(formData: FormData) {
  const user = await requireSuper();
  const code = await codeFromForm(formData);
  if (!code) return;
  await run("DELETE FROM activity_code_archive WHERE activity_code_id = ?", [code.id]);
  await audit(`Código ${code.code} de ${code.empresa} restaurado.`, user, code.company_id);
  revalidateCompany(code.company_id);
}

/**
 * Archivar una empresa: sale de las listas, sus códigos dejan de aceptar participantes y
 * su admin pierde el acceso. Nada se borra y se puede restaurar.
 */
export async function archiveCompany(formData: FormData) {
  const user = await requireSuper();
  const id = formId(formData, "companyId");
  if (!id) return;
  const company = await one<{ name: string }>("SELECT name FROM companies WHERE id = ?", [id]);
  if (!company) return;
  await run("INSERT OR IGNORE INTO company_archive (company_id) VALUES (?)", [id]);
  // Cierra las sesiones abiertas de su admin: sin esto seguiría dentro hasta que venzan.
  await run("DELETE FROM sessions WHERE admin_user_id IN (SELECT id FROM admin_users WHERE company_id = ?)", [id]);
  await audit(`Empresa "${company.name}" archivada.`, user, id);
  revalidateCompany(id);
  redirect("/admin/empresas");
}

export async function restoreCompany(formData: FormData) {
  const user = await requireSuper();
  const id = formId(formData, "companyId");
  if (!id) return;
  const company = await one<{ name: string }>("SELECT name FROM companies WHERE id = ?", [id]);
  if (!company) return;
  await run("DELETE FROM company_archive WHERE company_id = ?", [id]);
  await audit(`Empresa "${company.name}" restaurada.`, user, id);
  revalidateCompany(id);
  redirect(`/admin/empresas/${id}`);
}

export async function updateLegalText(formData: FormData) {
  const user = await requireUser();
  if (user.role !== "super") return;

  const key = String(formData.get("key") ?? "");
  const body = String(formData.get("body") ?? "");
  if (key !== "privacidad" && key !== "terminos") return;

  await run(
    `INSERT INTO legal_texts (key, body, updated_at) VALUES (?, ?, datetime('now'))
     ON CONFLICT(key) DO UPDATE SET body = excluded.body, updated_at = excluded.updated_at`,
    [key, body]
  );
  await audit(`Texto legal "${key}" actualizado.`, user);
  revalidatePath("/admin/ajustes");
  revalidatePath("/");
}

export async function markNotificationsRead() {
  const user = await requireUser();
  await run("UPDATE admin_users SET notifications_read_at = datetime('now') WHERE id = ?", [user.id]);
  revalidatePath("/admin", "layout");
}
