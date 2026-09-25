import "server-only";
import { all, one, run } from "./db";
import type { AdminUser } from "./auth";
import { audit } from "./admin-guard";
import { currentStreak, scored } from "./live-engine";
import {
  advance,
  challengePhase,
  challengeState,
  emptyProgress,
  sqliteToMs,
  type ChallengeProgress,
} from "./live-challenge-engine";
import {
  getMatch,
  getMatchForHost,
  loadQuestions,
  playerSnapshot,
  publicQuestion,
  scoreAndSave,
  standings,
  submitAnswer,
  type FullQuestion,
  type MatchRow,
  type Result,
} from "./live-match";
import { QUESTION_INTRO_MS, type ChallengeSnapshot, type PlayerSnapshot } from "./live-protocol";
import { getCompanyBrand } from "./company-brand";

// Desafío asíncrono: la misma partida de live_matches, pero sin host ni Ably. Cada
// jugador abre sus preguntas cuando quiere y el reloj de cada una es suyo
// (live_challenge_progress). Las respuestas y el puntaje son los de la partida en vivo.

const err = (error: string, status = 400): { ok: false; error: string; status: number } => ({ ok: false, error, status });

/** Cuántos del ranking ve el jugador al terminar. */
const TOP_SIZE = 5;

interface PlayerMatch {
  player: { id: string; nickname: string; kicked_at: string | null };
  match: MatchRow & { closes_at: string };
}

async function loadPlayerMatch(playerId: string): Promise<Result<PlayerMatch>> {
  const player = await one<{ id: string; nickname: string; kicked_at: string | null; match_id: number }>(
    "SELECT id, nickname, kicked_at, match_id FROM live_players WHERE id = ?",
    [playerId]
  );
  if (!player) return err("No estás en ninguna partida.", 401);
  const match = await getMatch(player.match_id);
  if (!match) return err("La partida ya no existe.", 404);
  if (match.closes_at === null) return err("Esta partida es en vivo.", 409);
  return { ok: true, player, match: match as PlayerMatch["match"] };
}

const isClosed = (match: MatchRow & { closes_at: string }, now: number) =>
  match.status === "finished" || sqliteToMs(match.closes_at) <= now;

async function readProgress(playerId: string): Promise<ChallengeProgress> {
  const row = await one<{
    current_position: number | null;
    question_started_at: number | null;
    question_ends_at: number | null;
    finished_at: string | null;
  }>("SELECT current_position, question_started_at, question_ends_at, finished_at FROM live_challenge_progress WHERE player_id = ?", [
    playerId,
  ]);
  if (!row) return emptyProgress();
  return {
    currentPosition: row.current_position,
    questionStartedAt: row.question_started_at,
    questionEndsAt: row.question_ends_at,
    finished: row.finished_at !== null,
  };
}

async function myAnswer(playerId: string, q: FullQuestion | undefined) {
  if (!q) return null;
  return one<{ option_id: number | null; text: string | null; is_correct: number | null; points: number }>(
    "SELECT option_id, text, is_correct, points FROM live_answers WHERE player_id = ? AND question_id = ?",
    [playerId, q.id]
  );
}

// --- Foto de estado -------------------------------------------------------------------

async function challengeSnapshot({ player, match }: PlayerMatch): Promise<ChallengeSnapshot> {
  const now = Date.now();
  const questions = await loadQuestions(match.game_id);
  const progress = await readProgress(player.id);
  const closed = isClosed(match, now);
  const q = progress.currentPosition ? questions[progress.currentPosition - 1] : undefined;
  const mine = await myAnswer(player.id, q);
  const phase = challengePhase(progress, mine !== null, closed, now);

  const mineRows = await all<{ position: number; points: number; is_correct: number | null }>(
    `SELECT q.position, a.points, a.is_correct FROM live_answers a JOIN live_questions q ON q.id = a.question_id
     WHERE a.player_id = ? ORDER BY q.position`,
    [player.id]
  );
  const score = mineRows.reduce((s, a) => s + a.points, 0);

  let feedback: ChallengeSnapshot["feedback"] = null;
  if (phase === "feedback" && q) {
    // Racha hasta esta pregunta: las con puntaje, en orden; no responder también la corta.
    const correctAt = new Set(mineRows.filter((a) => a.is_correct === 1).map((a) => a.position));
    const history = questions.filter((x) => scored(x.type) && x.position <= q.position).map((x) => correctAt.has(x.position));
    feedback = {
      correct: scored(q.type) ? q.options.flatMap((o, i) => (o.correct ? [i] : [])) : [],
      isCorrect: mine?.is_correct === null || mine === null ? null : mine.is_correct === 1,
      points: mine?.points ?? 0,
      streak: currentStreak(history),
    };
  }

  let result: ChallengeSnapshot["result"] = null;
  if (phase === "finished") {
    const entries = await standings(match.id, questions.length, questions);
    const me = entries.find((e) => e.nickname === player.nickname);
    result = {
      rank: me?.rank ?? entries.length,
      players: entries.length,
      correct: me?.correct ?? 0,
      answered: mineRows.length,
      top: entries.slice(0, TOP_SIZE).map((e) => ({ nickname: e.nickname, score: e.score, rank: e.rank })),
    };
  }

  return {
    mode: "challenge",
    matchId: match.id,
    gameTitle: match.game_title,
    brand: await getCompanyBrand(match.company_id),
    nickname: player.nickname,
    kicked: player.kicked_at !== null,
    totalQuestions: questions.length,
    closesAt: sqliteToMs(match.closes_at),
    closed,
    phase,
    question: q && (phase === "question" || phase === "feedback") ? publicQuestion(q, challengeState(progress), questions.length) : null,
    myAnswer: mine && q ? { optionIndex: mine.option_id === null ? null : q.optionIds.indexOf(mine.option_id), text: mine.text } : null,
    feedback,
    score,
    result,
    serverNow: now,
  };
}

// --- Acciones del jugador ---------------------------------------------------------------

/** Abre la siguiente pregunta (o termina). Idempotente ante dobles toques. */
export async function advanceChallenge(playerId: string, now: number): Promise<Result> {
  const loaded = await loadPlayerMatch(playerId);
  if (!loaded.ok) return loaded;
  const { player, match } = loaded;
  if (player.kicked_at) return err("Te sacaron de este desafío.", 403);

  const questions = await loadQuestions(match.game_id);
  const progress = await readProgress(player.id);
  const q = progress.currentPosition ? questions[progress.currentPosition - 1] : undefined;
  const res = advance(progress, {
    now,
    totalQuestions: questions.length,
    timeLimitAt: (position) => questions[position - 1]?.timeLimit ?? 20,
    introMs: QUESTION_INTRO_MS,
    answeredCurrent: (await myAnswer(player.id, q)) !== null,
    closed: isClosed(match, now),
  });
  if (!res.ok) return err(res.error, 409);

  const next = res.progress;
  // Solo avanza si la fila sigue como se leyó: dos toques seguidos no saltan una pregunta.
  await run(
    `INSERT INTO live_challenge_progress (player_id, current_position, question_started_at, question_ends_at, finished_at)
     VALUES (?, ?, ?, ?, ?)
     ON CONFLICT (player_id) DO UPDATE SET
       current_position = excluded.current_position,
       question_started_at = excluded.question_started_at,
       question_ends_at = excluded.question_ends_at,
       finished_at = excluded.finished_at
     WHERE live_challenge_progress.current_position IS ? AND live_challenge_progress.finished_at IS NULL`,
    [
      player.id,
      next.currentPosition,
      next.questionStartedAt,
      next.questionEndsAt,
      next.finished ? new Date(now).toISOString().slice(0, 19).replace("T", " ") : null,
      progress.currentPosition,
    ]
  );
  return { ok: true };
}

async function submitChallengeAnswer(playerId: string, body: Record<string, unknown>, now: number): Promise<Result> {
  const loaded = await loadPlayerMatch(playerId);
  if (!loaded.ok) return loaded;
  const { player, match } = loaded;
  if (player.kicked_at) return err("Te sacaron de este desafío.", 403);
  if (isClosed(match, now)) return err("El desafío ya cerró.", 409);

  const progress = await readProgress(player.id);
  if (progress.finished || progress.currentPosition === null || progress.currentPosition !== body.position) {
    return err("Esta pregunta ya no recibe respuestas.", 409);
  }
  const questions = await loadQuestions(match.game_id);
  const q = questions[progress.currentPosition - 1];
  if (!q) return err("Pregunta no encontrada.", 404);

  const saved = await scoreAndSave(player.id, match.game_id, challengeState(progress), q, body, now);
  return saved.ok ? { ok: true } : saved;
}

// --- Puntos de entrada para las rutas: deciden entre en vivo y desafío -------------------

async function isChallengePlayer(playerId: string): Promise<boolean> {
  const row = await one<{ n: number }>(
    "SELECT COUNT(*) AS n FROM live_players p JOIN live_challenges c ON c.match_id = p.match_id WHERE p.id = ?",
    [playerId]
  );
  return (row?.n ?? 0) > 0;
}

export async function snapshotForPlayer(playerId: string): Promise<Result<{ snapshot: PlayerSnapshot | ChallengeSnapshot }>> {
  if (!(await isChallengePlayer(playerId))) return playerSnapshot(playerId);
  const loaded = await loadPlayerMatch(playerId);
  if (!loaded.ok) return loaded;
  return { ok: true, snapshot: await challengeSnapshot(loaded) };
}

export async function answerForPlayer(playerId: string, body: Record<string, unknown>, now: number): Promise<Result> {
  return (await isChallengePlayer(playerId)) ? submitChallengeAnswer(playerId, body, now) : submitAnswer(playerId, body, now);
}

// --- Admin ---------------------------------------------------------------------------------

/** Cierra un desafío antes de su fecha. Lo ya respondido queda en el reporte. */
export async function closeChallenge(matchId: number, user: AdminUser): Promise<Result<{ gameId: number }>> {
  const match = await getMatchForHost(matchId, user);
  if (!match || match.closes_at === null) return err("Desafío no encontrado.", 404);
  await run("UPDATE live_matches SET status = 'finished', finished_at = datetime('now') WHERE id = ? AND status <> 'finished'", [
    match.id,
  ]);
  await audit(`Desafío de "${match.game_title}" cerrado a mano (PIN ${match.pin}).`, user, match.company_id);
  return { ok: true, gameId: match.game_id };
}
