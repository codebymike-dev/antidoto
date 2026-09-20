import "server-only";
import { all, one } from "./db";
import type { AdminUser } from "./auth";
import type { Estado } from "./types";
import { companyFilter } from "./scope";

export interface GroupRow {
  id: number;
  codigo: string;
  empresa: string;
  company_id: number;
  participantes: number;
  avance: number;
  promedio: number;
  estado: Estado;
  fecha: string;
  expira: string | null;
}

export interface MissionOverview {
  id: string;
  tag: string;
  title: string;
  description: string;
  groupsCount: number;
  totalParticipantes: number;
  avgAvance: number;
}

const GROUP_METRICS = `
  COUNT(p.id) AS participantes,
  CAST(COALESCE(AVG(p.avance), 0) AS INTEGER) AS avance,
  COALESCE(ROUND(AVG(p.puntaje), 1), 0) AS promedio
`;

/** El estado 'vencido' se deriva de la fecha, nunca se guarda. */
function resolveEstado(estado: string, expiresAt: string | null): Estado {
  if (expiresAt && new Date(expiresAt) < new Date()) return "vencido";
  return estado === "pausado" ? "pausado" : "activo";
}

function scopeArgs(user: AdminUser): { clause: string; args: number[] } {
  return companyFilter(user.role, user.company_id);
}

export async function listMissions(user: AdminUser, search = ""): Promise<MissionOverview[]> {
  const { clause, args } = scopeArgs(user);
  const rows = await all<{
    id: string;
    tag: string;
    title: string;
    description: string;
    groups_count: number;
    total_participantes: number;
    avg_avance: number;
  }>(
    `SELECT m.id, m.tag, m.title, m.description,
            COUNT(DISTINCT ac.id) AS groups_count,
            COUNT(p.id) AS total_participantes,
            CAST(COALESCE(AVG(p.avance), 0) AS INTEGER) AS avg_avance
     FROM missions m
     LEFT JOIN activity_codes ac ON ac.mission_id = m.id ${clause}
     LEFT JOIN participations p ON p.activity_code_id = ac.id
     WHERE m.archived_at IS NULL
       AND (? = '' OR LOWER(m.title) LIKE '%' || LOWER(?) || '%')
     GROUP BY m.id
     ORDER BY m.created_at`,
    [...args, search.trim(), search.trim()]
  );

  return rows
    .map((r) => ({
      id: r.id,
      tag: r.tag,
      title: r.title,
      description: r.description,
      groupsCount: Number(r.groups_count),
      totalParticipantes: Number(r.total_participantes),
      avgAvance: Number(r.avg_avance),
    }))
    .filter((m) => user.role !== "empresa" || m.groupsCount > 0);
}

export async function getMission(missionId: string) {
  return one<{ id: string; tag: string; title: string; description: string }>(
    "SELECT id, tag, title, description FROM missions WHERE id = ? AND archived_at IS NULL",
    [missionId]
  );
}

export async function listGroups(missionId: string, user: AdminUser): Promise<GroupRow[]> {
  const { clause, args } = scopeArgs(user);
  const rows = await all<{
    id: number;
    codigo: string;
    empresa: string;
    company_id: number;
    participantes: number;
    avance: number;
    promedio: number;
    estado: string;
    fecha: string;
    expira: string | null;
  }>(
    `SELECT ac.id, ac.code AS codigo, c.name AS empresa, ac.company_id,
            ac.estado, ac.created_at AS fecha, ac.expires_at AS expira, ${GROUP_METRICS}
     FROM activity_codes ac
     JOIN companies c ON c.id = ac.company_id
     LEFT JOIN participations p ON p.activity_code_id = ac.id
     WHERE ac.mission_id = ? ${clause}
     GROUP BY ac.id
     ORDER BY avance DESC`,
    [missionId, ...args]
  );

  return rows.map((r) => ({
    ...r,
    participantes: Number(r.participantes),
    avance: Number(r.avance),
    promedio: Number(r.promedio),
    estado: resolveEstado(r.estado, r.expira),
  }));
}

/** Avance promedio por semana durante las últimas 6, para la línea de tendencia. */
export async function getTrend(missionId: string, user: AdminUser): Promise<number[]> {
  const { clause, args } = scopeArgs(user);
  const rows = await all<{ weeks_ago: number; avance: number }>(
    `SELECT CAST((julianday('now') - julianday(p.started_at)) / 7 AS INTEGER) AS weeks_ago,
            CAST(COALESCE(AVG(p.avance), 0) AS INTEGER) AS avance
     FROM participations p
     JOIN activity_codes ac ON ac.id = p.activity_code_id
     WHERE ac.mission_id = ? ${clause}
       AND p.started_at >= datetime('now', '-42 days')
     GROUP BY weeks_ago`,
    [missionId, ...args]
  );

  const byWeek = new Map(rows.map((r) => [Number(r.weeks_ago), Number(r.avance)]));
  // weeks_ago 5 es la más antigua: se invierte para que la línea avance hacia la derecha.
  return [5, 4, 3, 2, 1, 0].map((w) => byWeek.get(w) ?? 0);
}

export async function listParticipants(activityCodeId: number, limit = 3) {
  const rows = await all<{ nombre: string; avance: number; puntaje: number | null }>(
    `SELECT participant_name AS nombre, avance, puntaje
     FROM participations
     WHERE activity_code_id = ?
     ORDER BY avance DESC
     LIMIT ?`,
    [activityCodeId, limit]
  );
  return rows.map((r) => ({
    nombre: r.nombre,
    avance: Number(r.avance),
    puntaje: (Number(r.puntaje) || 0).toFixed(1),
  }));
}

export interface CodeMatch {
  activity_code_id: number;
  codigo: string;
  estado: Estado;
  expira: string | null;
  empresa: string;
  participantes: number;
  avance: number;
  mission_id: string;
  tag: string;
  title: string;
  description: string;
}

/** Usado por la landing: valida el código que teclea el participante. */
export async function findByCode(code: string): Promise<CodeMatch | null> {
  const row = await one<Omit<CodeMatch, "estado"> & { estado: string }>(
    `SELECT ac.id AS activity_code_id, ac.code AS codigo, ac.estado, ac.expires_at AS expira,
            c.name AS empresa, m.id AS mission_id, m.tag, m.title, m.description,
            COUNT(p.id) AS participantes,
            CAST(COALESCE(AVG(p.avance), 0) AS INTEGER) AS avance
     FROM activity_codes ac
     JOIN companies c ON c.id = ac.company_id
     JOIN missions m ON m.id = ac.mission_id
     LEFT JOIN participations p ON p.activity_code_id = ac.id
     WHERE UPPER(ac.code) = UPPER(?)
     GROUP BY ac.id`,
    [code.trim()]
  );
  if (!row) return null;

  return {
    ...row,
    participantes: Number(row.participantes),
    avance: Number(row.avance),
    estado: resolveEstado(row.estado, row.expira),
  };
}

export async function listCompanies() {
  return all<{ id: number; name: string; count: number }>(
    `SELECT c.id, c.name, COUNT(ac.id) AS count
     FROM companies c
     LEFT JOIN activity_codes ac ON ac.company_id = c.id
     GROUP BY c.id
     ORDER BY c.name`
  );
}

export async function listAllCodes(user: AdminUser) {
  const { clause, args } = scopeArgs(user);
  const rows = await all<{
    codigo: string;
    mission_title: string;
    empresa: string;
    fecha: string;
    participantes: number;
    estado: string;
    expira: string | null;
  }>(
    `SELECT ac.code AS codigo, m.title AS mission_title, c.name AS empresa,
            ac.created_at AS fecha, ac.estado, ac.expires_at AS expira,
            COUNT(p.id) AS participantes
     FROM activity_codes ac
     JOIN missions m ON m.id = ac.mission_id
     JOIN companies c ON c.id = ac.company_id
     LEFT JOIN participations p ON p.activity_code_id = ac.id
     WHERE 1 = 1 ${clause}
     GROUP BY ac.id
     ORDER BY ac.created_at DESC`,
    args
  );

  return rows.map((r) => ({
    ...r,
    participantes: Number(r.participantes),
    estado: resolveEstado(r.estado, r.expira),
  }));
}

export async function getLegalTexts() {
  const rows = await all<{ key: string; body: string }>("SELECT key, body FROM legal_texts");
  const byKey = new Map(rows.map((r) => [r.key, r.body]));
  return {
    privacidad: byKey.get("privacidad") ?? "",
    terminos: byKey.get("terminos") ?? "",
  };
}

export async function listAuditLog(user: AdminUser, limit = 50) {
  const clause = user.role === "empresa" ? "WHERE company_id = ?" : "";
  const args = user.role === "empresa" ? [user.company_id!] : [];
  return all<{ id: number; text: string; created_at: string }>(
    `SELECT id, text, created_at FROM audit_log ${clause} ORDER BY created_at DESC LIMIT ?`,
    [...args, limit]
  );
}

/** Las notificaciones son las entradas de auditoría posteriores a la última lectura. */
export async function listNotifications(user: AdminUser) {
  const entries = await listAuditLog(user, 8);
  const readAt = user.notifications_read_at ? new Date(user.notifications_read_at) : null;
  return entries.map((e) => ({
    id: e.id,
    text: e.text,
    time: e.created_at,
    read: readAt ? new Date(e.created_at) <= readAt : false,
  }));
}
