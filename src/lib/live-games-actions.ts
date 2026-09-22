"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import type { Transaction } from "@libsql/client/web";
import { db, one } from "./db";
import { audit, requireUser } from "./admin-guard";
import { getGame, getGameDraft } from "./live-games";
import { parseGameDraft, type DraftErrors, type DraftQuestion } from "./live-validation";

export type SaveGameResult =
  | { ok: true; savedAt: string }
  | { ok: false; errors: DraftErrors; message?: string };

/** Reemplaza todas las preguntas del juego. Solo se usa en juegos sin partidas. */
async function writeQuestions(tx: Transaction, gameId: number, questions: DraftQuestion[]) {
  await tx.execute({ sql: "DELETE FROM live_questions WHERE game_id = ?", args: [gameId] });
  for (const [qi, q] of questions.entries()) {
    const inserted = await tx.execute({
      sql: "INSERT INTO live_questions (game_id, position, type, prompt, time_limit) VALUES (?, ?, ?, ?, ?)",
      args: [gameId, qi + 1, q.type, q.prompt, q.timeLimit],
    });
    const questionId = Number(inserted.lastInsertRowid);
    for (const [oi, o] of q.options.entries()) {
      await tx.execute({
        sql: "INSERT INTO live_options (question_id, position, text, is_correct) VALUES (?, ?, ?, ?)",
        args: [questionId, oi + 1, o.text, o.correct ? 1 : 0],
      });
    }
  }
}

export async function createGame() {
  const user = await requireUser();
  // El superadmin arranca con un juego global; puede cambiarlo en el editor.
  const companyId = user.role === "empresa" ? user.company_id : null;

  const res = await db().execute({
    sql: "INSERT INTO live_games (title, company_id, created_by) VALUES ('Juego sin título', ?, ?)",
    args: [companyId, user.id],
  });
  const id = Number(res.lastInsertRowid);
  await audit(`Juego en vivo #${id} creado.`, user, companyId);
  redirect(`/admin/juegos/${id}`);
}

export async function saveGame(gameId: number, input: unknown): Promise<SaveGameResult> {
  const user = await requireUser();
  const game = await getGame(Number(gameId), user);
  if (!game) return { ok: false, errors: {}, message: "El juego no existe o no tienes acceso." };
  if (!game.canEdit) return { ok: false, errors: {}, message: "No puedes editar este juego." };
  if (game.locked) {
    return { ok: false, errors: {}, message: "Este juego ya tiene partidas: duplícalo para cambiarlo." };
  }

  const parsed = parseGameDraft(input);
  if (!parsed.ok) return { ok: false, errors: parsed.errors, message: "Revisa los campos marcados." };
  const draft = parsed.draft;

  // Un admin de empresa no elige alcance: el campo que llegue se ignora.
  let companyId = user.role === "empresa" ? user.company_id : draft.companyId;
  if (companyId !== null && user.role === "super") {
    const exists = await one("SELECT 1 FROM companies WHERE id = ?", [companyId]);
    if (!exists) return { ok: false, errors: { companyId: "Esa empresa ya no existe." } };
  }
  companyId = companyId ?? null;

  const tx = await db().transaction("write");
  try {
    await tx.execute({
      sql: `UPDATE live_games SET title = ?, description = ?, company_id = ?, updated_at = datetime('now')
            WHERE id = ?`,
      args: [draft.title, draft.description, companyId, game.id],
    });
    await writeQuestions(tx, game.id, draft.questions);
    await tx.commit();
  } finally {
    tx.close();
  }

  await audit(`Juego en vivo "${draft.title}" guardado (${draft.questions.length} preguntas).`, user, companyId);
  revalidatePath("/admin/juegos");
  return { ok: true, savedAt: new Date().toISOString() };
}

export async function duplicateGame(formData: FormData) {
  const user = await requireUser();
  const game = await getGame(Number(formData.get("id")), user);
  if (!game) return;

  // La copia es de quien duplica: un admin de empresa puede copiar un global y editarlo.
  const companyId = user.role === "empresa" ? user.company_id : game.company_id;
  const questions = await getGameDraft(game.id);

  const tx = await db().transaction("write");
  let newId: number;
  try {
    const res = await tx.execute({
      sql: "INSERT INTO live_games (title, description, company_id, created_by) VALUES (?, ?, ?, ?)",
      args: [`${game.title} (copia)`, game.description, companyId, user.id],
    });
    newId = Number(res.lastInsertRowid);
    await writeQuestions(tx, newId, questions);
    await tx.commit();
  } finally {
    tx.close();
  }

  await audit(`Juego en vivo "${game.title}" duplicado.`, user, companyId);
  revalidatePath("/admin/juegos");
  redirect(`/admin/juegos/${newId}`);
}

async function setArchived(formData: FormData, archived: boolean) {
  const user = await requireUser();
  const game = await getGame(Number(formData.get("id")), user);
  if (!game || !game.canEdit) return;

  await db().execute({
    sql: `UPDATE live_games SET archived_at = ${archived ? "datetime('now')" : "NULL"}, updated_at = datetime('now')
          WHERE id = ?`,
    args: [game.id],
  });
  await audit(`Juego en vivo "${game.title}" ${archived ? "archivado" : "restaurado"}.`, user, game.company_id);
  revalidatePath("/admin/juegos");
  revalidatePath(`/admin/juegos/${game.id}`);
}

export async function archiveGame(formData: FormData) {
  await setArchived(formData, true);
}

export async function restoreGame(formData: FormData) {
  await setArchived(formData, false);
}
