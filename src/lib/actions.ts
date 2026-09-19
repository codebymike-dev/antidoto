"use server";

import { randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { all, one, run } from "./db";
import { currentUser, destroySession, login, type AdminUser } from "./auth";
import { findByCode } from "./queries";

const PARTICIPATION_COOKIE = "antidoto_participacion";

async function requireUser(): Promise<AdminUser> {
  const user = await currentUser();
  if (!user) redirect("/admin/login");
  return user;
}

async function audit(text: string, user: AdminUser | null, companyId: number | null = null) {
  await run("INSERT INTO audit_log (text, admin_user_id, company_id) VALUES (?, ?, ?)", [
    text,
    user?.id ?? null,
    companyId,
  ]);
}

// --- Participante ---------------------------------------------------------

export type JoinState = { error: string } | null;

export async function joinActivity(_prev: JoinState, formData: FormData): Promise<JoinState> {
  const name = String(formData.get("name") ?? "").trim();
  const code = String(formData.get("code") ?? "").trim();
  const accepted = formData.get("acceptedPolicy") === "on";

  if (!name) return { error: "Ingresa tu nombre." };
  if (!code) return { error: "Ingresa el código de tu actividad." };
  if (!accepted) return { error: "Debes aceptar la política de tratamiento de datos." };

  const match = await findByCode(code);
  if (!match) return { error: "Código no encontrado o inválido. Verifica con tu administrador." };
  if (match.estado === "vencido") {
    const fecha = match.expira ? new Date(match.expira).toLocaleDateString("es-CO") : "";
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

export async function currentParticipation() {
  const jar = await cookies();
  const id = jar.get(PARTICIPATION_COOKIE)?.value;
  if (!id) return null;

  return one<{
    id: string;
    participant_name: string;
    avance: number;
    completed_at: string | null;
    codigo: string;
    estado: string;
    expira: string | null;
    empresa: string;
    mission_tag: string;
    mission_title: string;
    mission_description: string;
    participantes: number;
    company_avance: number;
  }>(
    `SELECT p.id, p.participant_name, p.avance, p.completed_at,
            ac.code AS codigo, ac.estado, ac.expires_at AS expira,
            c.name AS empresa, m.tag AS mission_tag, m.title AS mission_title,
            m.description AS mission_description,
            (SELECT COUNT(*) FROM participations WHERE activity_code_id = ac.id) AS participantes,
            (SELECT CAST(COALESCE(AVG(avance), 0) AS INTEGER) FROM participations
              WHERE activity_code_id = ac.id) AS company_avance
     FROM participations p
     JOIN activity_codes ac ON ac.id = p.activity_code_id
     JOIN companies c ON c.id = ac.company_id
     JOIN missions m ON m.id = ac.mission_id
     WHERE p.id = ?`,
    [id]
  );
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
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");

  if (!email || !password) return { error: "Ingresa tu usuario y contraseña." };

  const user = await login(email, password);
  if (!user) return { error: "Usuario o contraseña incorrectos." };

  redirect("/admin");
}

export async function logoutAction() {
  await destroySession();
  redirect("/");
}

// --- Configuración admin --------------------------------------------------

export async function generateCode(formData: FormData) {
  const user = await requireUser();
  const missionId = String(formData.get("missionId") ?? "");
  const estado = String(formData.get("estado") ?? "activo") === "pausado" ? "pausado" : "activo";
  const expira = String(formData.get("expira") ?? "").trim();

  // Un admin de empresa solo puede generar códigos para la suya.
  const companyName =
    user.role === "empresa" ? user.company_name! : String(formData.get("empresa") ?? "").trim();
  if (!companyName || !missionId) return;

  const mission = await one<{ title: string }>("SELECT title FROM missions WHERE id = ?", [missionId]);
  if (!mission) return;

  let company = await one<{ id: number }>("SELECT id FROM companies WHERE name = ?", [companyName]);
  if (!company) {
    await run("INSERT INTO companies (name) VALUES (?)", [companyName]);
    company = await one<{ id: number }>("SELECT id FROM companies WHERE name = ?", [companyName]);
  }

  const prefix = mission.title.replace(/[^A-Za-z]/g, "").slice(0, 2).toUpperCase();
  const slug = companyName.split(/\s+/)[0].toUpperCase().slice(0, 6);
  let code = "";
  // El código es único en la tabla: si choca, se reintenta con otro sufijo.
  for (let attempt = 0; attempt < 10; attempt++) {
    const candidate = `${prefix}-${slug}${Math.floor(10 + Math.random() * 89)}`;
    const taken = await one("SELECT 1 FROM activity_codes WHERE code = ?", [candidate]);
    if (!taken) {
      code = candidate;
      break;
    }
  }
  if (!code) return;

  await run(
    `INSERT INTO activity_codes (code, mission_id, company_id, estado, expires_at)
     VALUES (?, ?, ?, ?, ?)`,
    [code, missionId, company!.id, estado, expira || null]
  );
  await audit(`Código ${code} generado para ${companyName} (${mission.title}).`, user, company!.id);

  revalidatePath("/admin/config");
  revalidatePath("/admin");
  return code;
}

export async function addCompany(formData: FormData) {
  const user = await requireUser();
  if (user.role !== "super") return;

  const name = String(formData.get("name") ?? "").trim();
  if (!name) return;

  const existing = await one("SELECT 1 FROM companies WHERE name = ?", [name]);
  if (existing) return;

  await run("INSERT INTO companies (name) VALUES (?)", [name]);
  await audit(`Empresa "${name}" añadida.`, user);
  revalidatePath("/admin/config");
}

export async function deleteCompany(formData: FormData) {
  const user = await requireUser();
  if (user.role !== "super") return;

  const id = Number(formData.get("id"));
  const company = await one<{ name: string }>("SELECT name FROM companies WHERE id = ?", [id]);
  if (!company) return;

  await run("DELETE FROM companies WHERE id = ?", [id]);
  await audit(`Empresa "${company.name}" eliminada.`, user);
  revalidatePath("/admin/config");
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
  revalidatePath("/admin/config");
  revalidatePath("/");
}

export async function duplicateMission(formData: FormData) {
  const user = await requireUser();
  if (user.role !== "super") return;

  const missionId = String(formData.get("missionId") ?? "");
  const mission = await one<{ tag: string; title: string; description: string }>(
    "SELECT tag, title, description FROM missions WHERE id = ?",
    [missionId]
  );
  if (!mission) return;

  const newId = "m" + randomBytes(6).toString("hex");
  await run("INSERT INTO missions (id, tag, title, description) VALUES (?, ?, ?, ?)", [
    newId,
    mission.tag,
    `${mission.title} (copia)`,
    mission.description,
  ]);
  await audit(`Actividad "${mission.title}" duplicada.`, user);
  revalidatePath("/admin");
}

export async function markNotificationsRead() {
  const user = await requireUser();
  await run("UPDATE admin_users SET notifications_read_at = datetime('now') WHERE id = ?", [user.id]);
  revalidatePath("/admin", "layout");
}

export async function saveLiveSession(formData: FormData) {
  const user = await requireUser();
  const missionId = String(formData.get("missionId") ?? "");
  const connected = Number(formData.get("connected") ?? 0);
  const rounds = Number(formData.get("rounds") ?? 0);
  const scores = String(formData.get("scores") ?? "{}");

  await run(
    `INSERT INTO live_sessions (mission_id, host_user_id, connected, rounds_completed, scores_json, finished_at)
     VALUES (?, ?, ?, ?, ?, datetime('now'))`,
    [missionId, user.id, connected, rounds, scores]
  );

  const mission = await one<{ title: string }>("SELECT title FROM missions WHERE id = ?", [missionId]);
  await audit(`Sesión en vivo de "${mission?.title ?? missionId}" finalizada.`, user);
  revalidatePath("/admin");
}

/** Filas para el CSV, respetando los filtros activos de la tabla. */
export async function exportRows(missionId: string, search: string, estado: string) {
  const user = await requireUser();
  const { listGroups } = await import("./queries");
  const groups = await listGroups(missionId, user);
  return groups.filter(
    (g) =>
      (estado === "todos" || g.estado === estado) &&
      (!search.trim() || g.empresa.toLowerCase().includes(search.trim().toLowerCase()))
  );
}

export { all };
