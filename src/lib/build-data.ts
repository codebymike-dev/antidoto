import "server-only";
import { all, one, run } from "./db";
import type { AdminUser } from "./auth";
import { companyFilter, LIVE_CODE } from "./scope";
import { BUILDS, buildMissionId, getBuild, type BuildDef, type BuildTextOverride, type BuildTexts } from "./bricks/challenges";
import { decodeBuild } from "./bricks/codec";
import type { Brick } from "./bricks/world";

/** Qué reto de construcción usa una misión; null si es otra clase de actividad. */
export async function missionBuild(missionId: string): Promise<BuildDef | null> {
  const row = await one<{ build_key: string }>("SELECT build_key FROM mission_builds WHERE mission_id = ?", [missionId]);
  return row ? getBuild(row.build_key) : null;
}

export async function loadBuildOverride(key: string): Promise<BuildTextOverride> {
  const row = await one<BuildTexts>("SELECT title, prompt, reflection FROM build_texts WHERE build_key = ?", [key]);
  return row ? { title: row.title, prompt: row.prompt, reflection: row.reflection } : null;
}

/**
 * Crea (si falta) la misión que representa al reto en actividades y códigos. Id fijo por reto:
 * correrlo dos veces no duplica nada. El título se resincroniza con los textos vigentes.
 */
export async function ensureBuildMission(def: BuildDef, title: string): Promise<string> {
  const id = buildMissionId(def.key);
  await run(
    `INSERT INTO missions (id, tag, title, description) VALUES (?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET title = excluded.title`,
    [id, def.tag, title, def.description],
  );
  await run("INSERT OR IGNORE INTO mission_builds (mission_id, build_key) VALUES (?, ?)", [id, def.key]);
  return id;
}

export interface BuildLibraryItem {
  def: BuildDef;
  texts: BuildTexts;
  edited: boolean;
  missionId: string | null;
  participantes: number;
  obras: number;
}

/** Los retos de la biblioteca con su uso (participantes y obras visibles para el usuario). */
export async function listBuildLibrary(user: AdminUser): Promise<BuildLibraryItem[]> {
  const { clause, args } = companyFilter(user.role, user.company_id);
  const rows = await all<{ build_key: string; mission_id: string; participantes: number; obras: number }>(
    `SELECT mb.build_key, mb.mission_id, COUNT(p.id) AS participantes, COUNT(w.submitted_at) AS obras
     FROM mission_builds mb
     JOIN missions m ON m.id = mb.mission_id AND m.archived_at IS NULL
     LEFT JOIN activity_codes ac ON ac.mission_id = mb.mission_id AND ${LIVE_CODE} ${clause}
     LEFT JOIN participations p ON p.activity_code_id = ac.id
     LEFT JOIN brick_works w ON w.participation_id = p.id
     GROUP BY mb.mission_id`,
    args,
  );
  const edits = await all<BuildTexts & { build_key: string }>("SELECT build_key, title, prompt, reflection FROM build_texts");
  return BUILDS.map((def) => {
    const row = rows.find((r) => r.build_key === def.key);
    const edit = edits.find((e) => e.build_key === def.key);
    return {
      def,
      texts: edit ? { title: edit.title, prompt: edit.prompt, reflection: edit.reflection } : def.defaults,
      edited: !!edit,
      missionId: row?.mission_id ?? null,
      participantes: Number(row?.participantes ?? 0),
      obras: Number(row?.obras ?? 0),
    };
  });
}

export interface WorkDraft {
  bricks: Brick[];
  /** Milisegundos que lleva corriendo el reloj del reto. */
  elapsedMs: number;
  started: boolean;
}

/** La obra en curso de un participante, para retomarla donde iba. */
export async function loadDraft(participationId: string, base: number): Promise<WorkDraft> {
  const row = await one<{ data: ArrayBuffer | null; started_ms: number }>(
    "SELECT data, started_ms FROM brick_works WHERE participation_id = ?",
    [participationId],
  );
  if (!row) return { bricks: [], elapsedMs: 0, started: false };
  let bricks: Brick[] = [];
  if (row.data) {
    try {
      const decoded = decodeBuild(new Uint8Array(row.data));
      if (decoded.base === base) bricks = decoded.bricks;
    } catch {
      // Una obra ilegible no debe impedir seguir jugando: se arranca de cero.
    }
  }
  return { bricks, elapsedMs: Math.max(0, Date.now() - Number(row.started_ms)), started: true };
}

export interface WorkSummary {
  participationId: string;
  title: string | null;
  phrase: string | null;
  brickCount: number;
  bricks: Brick[];
  hasImage: boolean;
  submittedAt: string | null;
}

export async function loadWork(participationId: string): Promise<WorkSummary | null> {
  const row = await one<{ data: ArrayBuffer | null; title: string | null; phrase: string | null; brick_count: number; has_image: number; submitted_at: string | null }>(
    `SELECT data, title, phrase, brick_count, image IS NOT NULL AS has_image, submitted_at
     FROM brick_works WHERE participation_id = ?`,
    [participationId],
  );
  if (!row) return null;
  let bricks: Brick[] = [];
  try {
    if (row.data) bricks = decodeBuild(new Uint8Array(row.data)).bricks;
  } catch {
    bricks = [];
  }
  return {
    participationId,
    title: row.title,
    phrase: row.phrase,
    brickCount: Number(row.brick_count),
    bricks,
    hasImage: Number(row.has_image) === 1,
    submittedAt: row.submitted_at,
  };
}

export interface GalleryWork {
  participationId: string;
  participant: string;
  empresa: string;
  title: string | null;
  phrase: string | null;
  brickCount: number;
  submittedAt: string;
}

/** Obras entregadas de una actividad, con el mismo alcance por empresa que los reportes. */
export async function listWorks(missionId: string, user: AdminUser): Promise<GalleryWork[]> {
  const { clause, args } = companyFilter(user.role, user.company_id);
  const rows = await all<{
    participation_id: string;
    participant_name: string;
    empresa: string;
    title: string | null;
    phrase: string | null;
    brick_count: number;
    submitted_at: string;
  }>(
    `SELECT w.participation_id, p.participant_name, c.name AS empresa, w.title, w.phrase, w.brick_count, w.submitted_at
     FROM brick_works w
     JOIN participations p ON p.id = w.participation_id
     JOIN activity_codes ac ON ac.id = p.activity_code_id
     JOIN companies c ON c.id = ac.company_id
     WHERE ac.mission_id = ? AND w.submitted_at IS NOT NULL AND ${LIVE_CODE} ${clause}
     ORDER BY w.submitted_at DESC`,
    [missionId, ...args],
  );
  return rows.map((r) => ({
    participationId: r.participation_id,
    participant: r.participant_name,
    empresa: r.empresa,
    title: r.title,
    phrase: r.phrase,
    brickCount: Number(r.brick_count),
    submittedAt: r.submitted_at,
  }));
}

/**
 * La foto de una obra, si quien la pide puede verla: el mismo participante (su cookie) o un
 * admin con alcance sobre la empresa del código.
 */
export async function workImage(participationId: string, viewer: { participationId: string | null; user: AdminUser | null }) {
  const row = await one<{ image: ArrayBuffer | null; image_mime: string | null; company_id: number }>(
    `SELECT w.image, w.image_mime, ac.company_id
     FROM brick_works w
     JOIN participations p ON p.id = w.participation_id
     JOIN activity_codes ac ON ac.id = p.activity_code_id
     WHERE w.participation_id = ?`,
    [participationId],
  );
  if (!row?.image || !row.image_mime) return null;
  const own = viewer.participationId === participationId;
  const admin = viewer.user && (viewer.user.role === "super" || viewer.user.company_id === Number(row.company_id));
  if (!own && !admin) return null;
  return { body: new Uint8Array(row.image), mime: row.image_mime };
}
