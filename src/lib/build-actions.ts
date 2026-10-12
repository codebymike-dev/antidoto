"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { one, run } from "./db";
import { PARTICIPATION_COOKIE } from "./participation";
import { isExpired } from "./expiry";
import { audit, requireSuper } from "./admin-guard";
import { getBuild, imageMime, matchScore, MAX_IMAGE_BYTES, modelBricks, validateBuildTexts, validateStory, validateWork, type BuildDef } from "./bricks/challenges";
import { missionBuild } from "./build-data";
import type { Blocked, BlockReason } from "./experience-actions";

// --- Participante --------------------------------------------------------------

interface BuildContext {
  participationId: string;
  def: BuildDef;
}

/** La participación de la cookie, si es de un reto de construcción abierto y sin entregar. */
async function buildContext(): Promise<BuildContext | { error: string; reason: BlockReason }> {
  const jar = await cookies();
  const id = jar.get(PARTICIPATION_COOKIE)?.value;
  if (!id) return { error: "Tu sesión terminó. Vuelve a entrar con tu código.", reason: "session" };

  const row = await one<{ mission_id: string; estado: string; expires_at: string | null; completed_at: string | null }>(
    `SELECT ac.mission_id, ac.estado, ac.expires_at, p.completed_at
     FROM participations p JOIN activity_codes ac ON ac.id = p.activity_code_id
     WHERE p.id = ?`,
    [id],
  );
  if (!row) return { error: "Tu sesión terminó. Vuelve a entrar con tu código.", reason: "session" };
  if (row.completed_at) return { error: "Ya entregaste tu obra.", reason: "done" };
  if (row.estado === "pausado") return { error: "Esta actividad está pausada por tu administrador.", reason: "paused" };
  if (isExpired(row.expires_at)) return { error: "Esta actividad ya venció.", reason: "expired" };

  const def = await missionBuild(row.mission_id);
  if (!def) return { error: "Esta actividad no es un reto de construcción.", reason: "other" };
  return { participationId: id, def };
}

/**
 * Arranca la obra al cerrar la consigna. El reloj de los retos con tiempo corre desde aquí y
 * lo lleva el servidor: recargar la página no lo reinicia.
 */
export async function startBuild(): Promise<{ ok: true; elapsedMs: number } | Blocked> {
  const ctx = await buildContext();
  if ("error" in ctx) return { ok: false, error: ctx.error, reason: ctx.reason };
  await run("INSERT OR IGNORE INTO brick_works (participation_id, started_ms) VALUES (?, ?)", [ctx.participationId, Date.now()]);
  const row = await one<{ started_ms: number }>("SELECT started_ms FROM brick_works WHERE participation_id = ?", [ctx.participationId]);
  return { ok: true, elapsedMs: Math.max(0, Date.now() - Number(row!.started_ms)) };
}

async function readData(formData: FormData): Promise<Uint8Array | null> {
  const file = formData.get("data");
  return file instanceof Blob ? new Uint8Array(await file.arrayBuffer()) : null;
}

/** Guarda la obra en curso. El constructor lo llama solo, unos segundos después de cada cambio. */
export async function saveDraft(formData: FormData): Promise<{ ok: true } | Blocked> {
  const ctx = await buildContext();
  if ("error" in ctx) return { ok: false, error: ctx.error, reason: ctx.reason };
  const data = await readData(formData);
  const work = data ? validateWork(ctx.def, data) : ({ ok: false, error: "No llegó la obra." } as const);
  if (!work.ok) return { ok: false, error: work.error, reason: "other" };

  await run(
    `INSERT INTO brick_works (participation_id, data, brick_count, started_ms, updated_at) VALUES (?, ?, ?, ?, datetime('now'))
     ON CONFLICT(participation_id) DO UPDATE SET data = excluded.data, brick_count = excluded.brick_count, updated_at = excluded.updated_at`,
    [ctx.participationId, data!, work.bricks.length, Date.now()],
  );
  // Con piezas puestas va a mitad de camino; entregar la lleva al 100 %.
  await run("UPDATE participations SET avance = ? WHERE id = ? AND completed_at IS NULL", [work.bricks.length > 0 ? 50 : 0, ctx.participationId]);
  return { ok: true };
}

/**
 * Entrega la obra: piezas, foto y, si el reto lo pide, título y frase. Devuelve un resultado en
 * vez de redirigir para que el constructor pueda reintentar si no hubo conexión.
 */
export async function submitWork(formData: FormData): Promise<{ ok: true } | Blocked> {
  const ctx = await buildContext();
  if ("error" in ctx) return { ok: false, error: ctx.error, reason: ctx.reason };
  const data = await readData(formData);
  const work = data ? validateWork(ctx.def, data) : ({ ok: false, error: "No llegó la obra." } as const);
  if (!work.ok) return { ok: false, error: work.error, reason: "other" };
  if (work.bricks.length === 0) return { ok: false, error: "Pon al menos una pieza antes de entregar.", reason: "other" };
  const story = validateStory(ctx.def, { title: formData.get("title"), phrase: formData.get("phrase") });
  if (!story.ok) return { ok: false, error: story.error, reason: "other" };

  const file = formData.get("image");
  if (!(file instanceof Blob) || file.size === 0) return { ok: false, error: "No llegó la foto de tu obra. Inténtalo de nuevo.", reason: "other" };
  if (file.size > MAX_IMAGE_BYTES) return { ok: false, error: "La foto de tu obra pesa demasiado.", reason: "other" };
  const image = new Uint8Array(await file.arrayBuffer());
  const mime = imageMime(image);
  if (!mime) return { ok: false, error: "La foto de tu obra no es válida.", reason: "other" };

  // Replicar es el único reto con algo que medir; en los creativos no hay puntaje (investigación, 6.3).
  const puntaje = ctx.def.kind === "replicar" ? Math.round(matchScore(modelBricks(ctx.def), work.bricks) * 100) / 10 : null;

  await run(
    `INSERT INTO brick_works (participation_id, data, brick_count, title, phrase, image, image_mime, started_ms, updated_at, submitted_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
     ON CONFLICT(participation_id) DO UPDATE SET
       data = excluded.data, brick_count = excluded.brick_count, title = excluded.title, phrase = excluded.phrase,
       image = excluded.image, image_mime = excluded.image_mime, updated_at = excluded.updated_at, submitted_at = excluded.submitted_at`,
    [ctx.participationId, data!, work.bricks.length, story.value.title, story.value.phrase, image, mime, Date.now()],
  );
  await run(
    "UPDATE participations SET completed_at = datetime('now'), avance = 100, puntaje = ? WHERE id = ? AND completed_at IS NULL",
    [puntaje, ctx.participationId],
  );
  revalidatePath("/mision");
  return { ok: true };
}

// --- Biblioteca (admin) --------------------------------------------------------------

export type SaveBuildTextsState = { ok: boolean; message: string } | null;

export async function saveBuildTexts(_prev: SaveBuildTextsState, formData: FormData): Promise<SaveBuildTextsState> {
  const user = await requireSuper();
  const def = getBuild(String(formData.get("build") ?? ""));
  if (!def) return { ok: false, message: "No se encontró el reto." };
  const parsed = validateBuildTexts({ title: formData.get("title"), prompt: formData.get("prompt"), reflection: formData.get("reflection") });
  if (!parsed.ok) return { ok: false, message: parsed.error };

  const t = parsed.value;
  await run(
    `INSERT INTO build_texts (build_key, title, prompt, reflection, updated_by, updated_at) VALUES (?, ?, ?, ?, ?, datetime('now'))
     ON CONFLICT(build_key) DO UPDATE SET
       title = excluded.title, prompt = excluded.prompt, reflection = excluded.reflection,
       updated_by = excluded.updated_by, updated_at = excluded.updated_at`,
    [def.key, t.title, t.prompt, t.reflection, user.id],
  );
  // La actividad lleva el nombre del reto en los listados y reportes.
  await run("UPDATE missions SET title = ? WHERE id IN (SELECT mission_id FROM mission_builds WHERE build_key = ?)", [t.title, def.key]);
  await audit(`Textos del reto de construcción "${t.title}" editados.`, user);
  revalidatePath(`/admin/biblioteca/construccion/${def.key}`);
  return { ok: true, message: "Guardado. Los participantes ya ven el texto nuevo." };
}

/** Vuelve a los textos del código. Devuelve una marca para que el formulario se recargue. */
export async function resetBuildTexts(_prev: number, formData: FormData): Promise<number> {
  const user = await requireSuper();
  const def = getBuild(String(formData.get("build") ?? ""));
  if (!def) return _prev;
  await run("DELETE FROM build_texts WHERE build_key = ?", [def.key]);
  await run("UPDATE missions SET title = ? WHERE id IN (SELECT mission_id FROM mission_builds WHERE build_key = ?)", [def.defaults.title, def.key]);
  await audit(`Textos del reto de construcción "${def.defaults.title}" restaurados.`, user);
  revalidatePath(`/admin/biblioteca/construccion/${def.key}`);
  return _prev + 1;
}
