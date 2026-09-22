import "server-only";
import { all, one } from "./db";
import type { AdminUser } from "./auth";
import { canEditGame, visibleGamesFilter } from "./scope";
import type { DraftQuestion, GameDraft } from "./live-validation";
import type { LiveQuestionType } from "./types";

export interface GameRow {
  id: number;
  title: string;
  description: string;
  company_id: number | null;
  company_name: string | null;
  archived_at: string | null;
  updated_at: string;
  questions: number;
  matches: number;
}

function scope(user: AdminUser) {
  return visibleGamesFilter(user.role, user.company_id);
}

export async function listGames(user: AdminUser, archived: boolean, search = ""): Promise<GameRow[]> {
  const { clause, args } = scope(user);
  return all<GameRow>(
    `SELECT g.id, g.title, g.description, g.company_id, c.name AS company_name, g.archived_at, g.updated_at,
            (SELECT COUNT(*) FROM live_questions q WHERE q.game_id = g.id) AS questions,
            (SELECT COUNT(*) FROM live_matches m WHERE m.game_id = g.id) AS matches
     FROM live_games g
     LEFT JOIN companies c ON c.id = g.company_id
     WHERE g.archived_at IS ${archived ? "NOT NULL" : "NULL"}
       AND g.title LIKE ?
       ${clause}
     ORDER BY g.updated_at DESC, g.id DESC`,
    [`%${search}%`, ...args]
  );
}

/** Juego visible para el admin, con permisos ya resueltos. null si no existe o no le corresponde. */
export async function getGame(id: number, user: AdminUser) {
  const { clause, args } = scope(user);
  const game = await one<Omit<GameRow, "questions">>(
    `SELECT g.id, g.title, g.description, g.company_id, c.name AS company_name, g.archived_at, g.updated_at,
            (SELECT COUNT(*) FROM live_matches m WHERE m.game_id = g.id) AS matches
     FROM live_games g
     LEFT JOIN companies c ON c.id = g.company_id
     WHERE g.id = ? ${clause}`,
    [id, ...args]
  );
  if (!game) return null;

  const canEdit = canEditGame(user.role, user.company_id, game.company_id);
  return {
    ...game,
    canEdit,
    // Con partidas jugadas, cambiar preguntas rompería los reportes: se duplica.
    locked: game.matches > 0,
  };
}

export async function getGameDraft(gameId: number): Promise<GameDraft["questions"]> {
  const rows = await all<{
    qid: number;
    type: LiveQuestionType;
    prompt: string;
    time_limit: number;
    text: string | null;
    is_correct: number | null;
  }>(
    `SELECT q.id AS qid, q.type, q.prompt, q.time_limit, o.text, o.is_correct
     FROM live_questions q
     LEFT JOIN live_options o ON o.question_id = q.id
     WHERE q.game_id = ?
     ORDER BY q.position, o.position`,
    [gameId]
  );

  const questions: DraftQuestion[] = [];
  let last: number | null = null;
  for (const r of rows) {
    if (r.qid !== last) {
      questions.push({ type: r.type, prompt: r.prompt, timeLimit: r.time_limit, options: [] });
      last = r.qid;
    }
    if (r.text !== null) questions.at(-1)!.options.push({ text: r.text, correct: r.is_correct === 1 });
  }
  return questions;
}
