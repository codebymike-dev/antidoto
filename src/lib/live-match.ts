import "server-only";
import { after } from "next/server";
import { randomBytes } from "node:crypto";
import { all, one, run } from "./db";
import type { AdminUser } from "./auth";
import { companyFilter } from "./scope";
import { getGame } from "./live-games";
import { audit } from "./admin-guard";
import { publishBestEffort, publishReliable } from "./realtime";
import {
  applyCommand,
  checkAnswer,
  computeLeaderboard,
  currentStreak,
  generatePin,
  normalizeNickname,
  questionStats,
  scored,
  shouldEndQuestion,
  type EngineQuestion,
  type HostCommand,
  type LeaderboardEntry,
  type MatchState,
} from "./live-engine";
import {
  QUESTION_INTRO_MS,
  hostChannel,
  matchChannel,
  type HostEvent,
  type HostSnapshot,
  type MatchSnapshot,
  type PlayerSnapshot,
  type PublicEvent,
  type PublicQuestion,
  type RevealData,
} from "./live-protocol";
import type { LiveMatchStatus } from "./types";

/** Tope por partida: el plan gratis de Ably admite 200 conexiones simultáneas en total. */
export const MAX_PLAYERS = 100;
/** Una partida abierta más de esto se da por abandonada y libera su PIN. */
const STALE_HOURS = 12;

export type Result<T = object> = ({ ok: true } & T) | { ok: false; error: string; status: number };
const err = (error: string, status = 400): { ok: false; error: string; status: number } => ({ ok: false, error, status });

// --- Lectura ------------------------------------------------------------------

interface MatchRow {
  id: number;
  game_id: number;
  game_title: string;
  company_id: number | null;
  pin: string;
  status: LiveMatchStatus;
  join_locked: number;
  current_position: number | null;
  question_started_at: number | null;
  question_ends_at: number | null;
  paused_remaining_ms: number | null;
}

const MATCH_COLUMNS = `m.id, m.game_id, g.title AS game_title, m.company_id, m.pin, m.status, m.join_locked,
  m.current_position, m.question_started_at, m.question_ends_at, m.paused_remaining_ms`;

function toState(row: MatchRow): MatchState {
  return {
    status: row.status,
    currentPosition: row.current_position,
    questionStartedAt: row.question_started_at,
    questionEndsAt: row.question_ends_at,
    pausedRemainingMs: row.paused_remaining_ms,
    joinLocked: row.join_locked === 1,
  };
}

/** Partida visible para el admin (misma regla de empresa que el resto del portal). */
export async function getMatchForHost(matchId: number, user: AdminUser): Promise<MatchRow | null> {
  const { clause, args } = companyFilter(user.role, user.company_id, "m.company_id");
  return one<MatchRow>(
    `SELECT ${MATCH_COLUMNS} FROM live_matches m JOIN live_games g ON g.id = m.game_id WHERE m.id = ? ${clause}`,
    [matchId, ...args]
  );
}

async function getMatch(matchId: number): Promise<MatchRow | null> {
  return one<MatchRow>(`SELECT ${MATCH_COLUMNS} FROM live_matches m JOIN live_games g ON g.id = m.game_id WHERE m.id = ?`, [
    matchId,
  ]);
}

export interface FullQuestion extends EngineQuestion {
  id: number;
  prompt: string;
  optionIds: number[];
  optionTexts: string[];
}

// Las preguntas de un juego con partidas no cambian (el editor lo bloquea), así que cada
// instancia las guarda un rato en memoria en vez de leerlas en cada respuesta.
const QUESTIONS_TTL_MS = 60_000;
const questionsCache = new Map<number, { at: number; questions: Promise<FullQuestion[]> }>();

export function loadQuestions(gameId: number): Promise<FullQuestion[]> {
  const hit = questionsCache.get(gameId);
  if (hit && Date.now() - hit.at < QUESTIONS_TTL_MS) return hit.questions;
  const questions = readQuestions(gameId);
  questionsCache.set(gameId, { at: Date.now(), questions });
  // Un error no debe quedar guardado en la caché.
  questions.catch(() => questionsCache.delete(gameId));
  return questions;
}

async function readQuestions(gameId: number): Promise<FullQuestion[]> {
  const rows = await all<{
    id: number;
    position: number;
    type: FullQuestion["type"];
    prompt: string;
    time_limit: number;
    option_id: number | null;
    text: string | null;
    is_correct: number | null;
  }>(
    `SELECT q.id, q.position, q.type, q.prompt, q.time_limit, o.id AS option_id, o.text, o.is_correct
     FROM live_questions q LEFT JOIN live_options o ON o.question_id = q.id
     WHERE q.game_id = ? ORDER BY q.position, o.position`,
    [gameId]
  );
  const questions: FullQuestion[] = [];
  for (const r of rows) {
    let q = questions.at(-1);
    if (!q || q.id !== r.id) {
      // position se renumera 1..n: el editor guarda posiciones consecutivas.
      q = { id: r.id, position: questions.length + 1, type: r.type, prompt: r.prompt, timeLimit: r.time_limit, options: [], optionIds: [], optionTexts: [] };
      questions.push(q);
    }
    if (r.option_id !== null) {
      q.options.push({ correct: r.is_correct === 1 });
      q.optionIds.push(r.option_id);
      q.optionTexts.push(r.text ?? "");
    }
  }
  return questions;
}

async function activeNicknames(matchId: number): Promise<string[]> {
  const rows = await all<{ nickname: string }>(
    "SELECT nickname FROM live_players WHERE match_id = ? AND kicked_at IS NULL ORDER BY rowid",
    [matchId]
  );
  return rows.map((r) => r.nickname);
}

async function answerCounts(matchId: number, questionId: number) {
  const row = await one<{ answered: number; players: number }>(
    `SELECT
       (SELECT COUNT(*) FROM live_answers a JOIN live_players p ON p.id = a.player_id
        WHERE a.question_id = ? AND p.match_id = ? AND p.kicked_at IS NULL) AS answered,
       (SELECT COUNT(*) FROM live_players WHERE match_id = ? AND kicked_at IS NULL) AS players`,
    [questionId, matchId, matchId]
  );
  return { answered: row?.answered ?? 0, players: row?.players ?? 0 };
}

const scoredPositions = (questions: FullQuestion[]) => questions.filter((q) => scored(q.type)).map((q) => q.position);

async function standings(matchId: number, upTo: number, questions: FullQuestion[]): Promise<LeaderboardEntry[]> {
  const players = (await activeNicknames(matchId)).map((nickname, i) => ({ nickname, joinOrder: i }));
  const answers = await all<{ nickname: string; position: number; points: number; is_correct: number | null; response_ms: number }>(
    `SELECT p.nickname, q.position, a.points, a.is_correct, a.response_ms
     FROM live_answers a
     JOIN live_players p ON p.id = a.player_id
     JOIN live_questions q ON q.id = a.question_id
     WHERE p.match_id = ? AND p.kicked_at IS NULL`,
    [matchId]
  );
  return computeLeaderboard(
    players,
    answers.map((a) => ({
      nickname: a.nickname,
      position: a.position,
      points: a.points,
      isCorrect: a.is_correct === null ? null : a.is_correct === 1,
      responseMs: a.response_ms,
    })),
    upTo,
    scoredPositions(questions)
  );
}

async function buildReveal(match: MatchRow, q: FullQuestion, questions: FullQuestion[]): Promise<RevealData> {
  const rows = await all<{ option_id: number | null; text: string | null; is_correct: number | null; response_ms: number }>(
    `SELECT a.option_id, a.text, a.is_correct, a.response_ms
     FROM live_answers a JOIN live_players p ON p.id = a.player_id
     WHERE a.question_id = ? AND p.match_id = ? AND p.kicked_at IS NULL`,
    [q.id, match.id]
  );
  const stats = questionStats(
    q,
    rows.map((r) => ({
      optionIndex: r.option_id === null ? null : q.optionIds.indexOf(r.option_id),
      text: r.text,
      isCorrect: r.is_correct === null ? null : r.is_correct === 1,
      responseMs: r.response_ms,
    }))
  );
  return {
    position: q.position,
    correct: scored(q.type) ? q.options.flatMap((o, i) => (o.correct ? [i] : [])) : [],
    distribution: stats.distribution,
    words: stats.words,
    answered: stats.answered,
    entries: await standings(match.id, q.position, questions),
  };
}

function publicQuestion(q: FullQuestion, state: MatchState, total: number): PublicQuestion {
  return {
    position: q.position,
    total,
    type: q.type,
    prompt: q.prompt,
    options: q.optionTexts,
    timeLimitMs: q.timeLimit * 1000,
    startedAt: state.questionStartedAt ?? 0,
    endsAt: state.questionEndsAt ?? 0,
    pausedRemainingMs: state.pausedRemainingMs,
  };
}

// --- Publicación -----------------------------------------------------------------

const publishPublic = (matchId: number, e: PublicEvent) => publishReliable(matchChannel(matchId), e.name, e.data);
// Cambian con cada jugador y pueden chocar con el límite de Ably; la pantalla del host
// se resincroniza sola cada pocos segundos.
const publishHost = (matchId: number, e: HostEvent) => publishBestEffort(hostChannel(matchId), e.name, e.data);

async function publishPlayers(matchId: number, joinLocked: boolean) {
  await publishHost(matchId, { name: "players", data: { nicknames: await activeNicknames(matchId), joinLocked } });
}

/** Emite los eventos que corresponden a un cambio de estado ya guardado. */
async function announce(match: MatchRow, prev: MatchState, next: MatchState, questions: FullQuestion[]) {
  const q = next.currentPosition ? questions[next.currentPosition - 1] : undefined;
  const now = Date.now();

  if (prev.joinLocked !== next.joinLocked) await publishPlayers(match.id, next.joinLocked);

  if (next.status === "question" && q) {
    if (prev.status !== "question" || prev.currentPosition !== next.currentPosition) {
      await publishPublic(match.id, { name: "question", data: { ...publicQuestion(q, next, questions.length), serverNow: now } });
      await publishHost(match.id, { name: "answers", data: { position: q.position, answered: 0, players: (await activeNicknames(match.id)).length } });
    } else if (prev.pausedRemainingMs === null && next.pausedRemainingMs !== null) {
      await publishPublic(match.id, { name: "paused", data: { position: q.position, remainingMs: next.pausedRemainingMs } });
    } else if (prev.pausedRemainingMs !== null && next.pausedRemainingMs === null) {
      await publishPublic(match.id, {
        name: "resumed",
        data: { position: q.position, startedAt: next.questionStartedAt!, endsAt: next.questionEndsAt!, serverNow: now },
      });
    }
  }

  if (next.status === "reveal" && prev.status === "question" && q) {
    await publishPublic(match.id, { name: "reveal", data: await buildReveal(match, q, questions) });
  }
  if (next.status === "leaderboard" && prev.status !== "leaderboard") {
    await publishPublic(match.id, { name: "leaderboard", data: { position: next.currentPosition ?? 0, entries: await standings(match.id, next.currentPosition ?? 0, questions) } });
  }
  if (next.status === "finished" && prev.status !== "finished") {
    await publishPublic(match.id, { name: "finished", data: { entries: await standings(match.id, next.currentPosition ?? 0, questions) } });
  }
}

// --- Escritura del estado --------------------------------------------------------

/**
 * Guarda el nuevo estado solo si la fila sigue como se leyó (concurrencia optimista).
 * Si el host y la última respuesta cierran la pregunta a la vez, gana uno y el otro no
 * vuelve a publicar el reveal.
 */
async function persistState(matchId: number, prev: MatchState, next: MatchState): Promise<boolean> {
  const started = prev.status === "lobby" && next.status !== "lobby";
  const finished = next.status === "finished";
  const res = await run(
    `UPDATE live_matches
     SET status = ?, join_locked = ?, current_position = ?, question_started_at = ?, question_ends_at = ?, paused_remaining_ms = ?
         ${started ? ", started_at = COALESCE(started_at, datetime('now'))" : ""}
         ${finished ? ", finished_at = datetime('now')" : ""}
     WHERE id = ? AND status = ? AND join_locked = ? AND current_position IS ? AND question_started_at IS ?
       AND question_ends_at IS ? AND paused_remaining_ms IS ?`,
    [
      next.status,
      next.joinLocked ? 1 : 0,
      next.currentPosition,
      next.questionStartedAt,
      next.questionEndsAt,
      next.pausedRemainingMs,
      matchId,
      prev.status,
      prev.joinLocked ? 1 : 0,
      prev.currentPosition,
      prev.questionStartedAt,
      prev.questionEndsAt,
      prev.pausedRemainingMs,
    ]
  );
  return res.rowsAffected === 1;
}

async function transition(match: MatchRow, command: HostCommand, now: number, questions?: FullQuestion[]): Promise<Result> {
  const qs = questions ?? (await loadQuestions(match.game_id));
  const players = (await activeNicknames(match.id)).length;
  const prev = toState(match);
  const res = applyCommand(prev, command, {
    now,
    totalQuestions: qs.length,
    activePlayers: players,
    timeLimitAt: (position) => qs[position - 1]?.timeLimit ?? 20,
    introMs: QUESTION_INTRO_MS,
  });
  if (!res.ok) return err(res.error, 409);
  if (!(await persistState(match.id, prev, res.state))) {
    return err("La partida cambió mientras tanto. Vuelve a intentarlo.", 409);
  }
  await announce(match, prev, res.state, qs);
  return { ok: true };
}

/** Cierra la pregunta si venció el tiempo o respondieron todos. Idempotente. */
async function maybeClose(match: MatchRow, now: number, questions?: FullQuestion[]): Promise<void> {
  const state = toState(match);
  if (state.status !== "question" || !state.currentPosition) return;
  const qs = questions ?? (await loadQuestions(match.game_id));
  const q = qs[state.currentPosition - 1];
  if (!q) return;
  const { answered, players } = await answerCounts(match.id, q.id);
  if (shouldEndQuestion(state, now, answered, players)) await transition(match, "endQuestion", now, qs);
}

// --- Host --------------------------------------------------------------------------

export async function createMatch(user: AdminUser, gameId: number): Promise<Result<{ matchId: number; pin: string }>> {
  const game = await getGame(gameId, user);
  if (!game) return err("El juego no existe o no tienes acceso.", 404);
  if (game.archived_at) return err("El juego está archivado.");
  const count = await one<{ n: number }>("SELECT COUNT(*) AS n FROM live_questions WHERE game_id = ?", [game.id]);
  if (!count?.n) return err("El juego no tiene preguntas.");

  // Las partidas abandonadas liberan su PIN.
  await run(
    `UPDATE live_matches SET status = 'finished', finished_at = datetime('now')
     WHERE status <> 'finished' AND created_at < datetime('now', ?)`,
    [`-${STALE_HOURS} hours`]
  );

  // La partida queda a nombre de la empresa del juego, o de la del host si el juego es global.
  const companyId = user.role === "empresa" ? user.company_id : game.company_id;
  for (let attempt = 0; attempt < 10; attempt++) {
    const pin = generatePin();
    try {
      const res = await run(
        "INSERT INTO live_matches (game_id, host_user_id, company_id, pin) VALUES (?, ?, ?, ?)",
        [game.id, user.id, companyId, pin]
      );
      const matchId = Number(res.lastInsertRowid);
      await audit(`Partida en vivo de "${game.title}" creada (PIN ${pin}).`, user, companyId);
      return { ok: true, matchId, pin };
    } catch (e) {
      // El PIN chocó con otra partida abierta: se prueba otro.
      if (!String(e).includes("UNIQUE")) throw e;
    }
  }
  return err("No se pudo generar un PIN libre. Vuelve a intentarlo.", 503);
}

export async function hostCommand(matchId: number, user: AdminUser, command: HostCommand): Promise<Result> {
  const match = await getMatchForHost(matchId, user);
  if (!match) return err("Partida no encontrada.", 404);
  return transition(match, command, Date.now());
}

/** El host lo llama cuando su reloj marca el final: el servidor decide con el suyo. */
export async function hostTick(matchId: number, user: AdminUser): Promise<Result> {
  const match = await getMatchForHost(matchId, user);
  if (!match) return err("Partida no encontrada.", 404);
  await maybeClose(match, Date.now());
  return { ok: true };
}

export async function kickPlayer(matchId: number, user: AdminUser, nickname: string): Promise<Result> {
  const match = await getMatchForHost(matchId, user);
  if (!match) return err("Partida no encontrada.", 404);
  const res = await run(
    "UPDATE live_players SET kicked_at = datetime('now') WHERE match_id = ? AND nickname = ? AND kicked_at IS NULL",
    [match.id, nickname]
  );
  if (res.rowsAffected !== 1) return err("Ese jugador no está en la partida.", 404);
  await publishPublic(match.id, { name: "kicked", data: { nickname } });
  await publishPlayers(match.id, match.join_locked === 1);
  // Si era el único que faltaba por responder, la pregunta se cierra.
  await maybeClose(match, Date.now());
  return { ok: true };
}

// --- Jugadores -----------------------------------------------------------------------

export async function joinMatch(input: {
  pin: string;
  nickname: string;
  acceptedPolicy: boolean;
  currentPlayerId: string | null;
}): Promise<Result<{ playerId: string; matchId: number; nickname: string }>> {
  const pin = input.pin.replace(/\s/g, "");
  if (!/^\d{6}$/.test(pin)) return err("El PIN tiene 6 dígitos.");

  const match = await one<{ id: number; join_locked: number }>(
    `SELECT id, join_locked FROM live_matches
     WHERE pin = ? AND status <> 'finished' AND created_at >= datetime('now', ?)`,
    [pin, `-${STALE_HOURS} hours`]
  );
  if (!match) return err("No hay una partida abierta con ese PIN.", 404);

  // Recargar o volver a entrar con la misma cookie: se reusa el jugador.
  if (input.currentPlayerId) {
    const existing = await one<{ nickname: string; kicked_at: string | null }>(
      "SELECT nickname, kicked_at FROM live_players WHERE id = ? AND match_id = ?",
      [input.currentPlayerId, match.id]
    );
    if (existing?.kicked_at) return err("El host te sacó de esta partida.", 403);
    if (existing) return { ok: true, playerId: input.currentPlayerId, matchId: match.id, nickname: existing.nickname };
  }

  if (match.join_locked) return err("El host cerró la entrada a esta partida.", 403);
  if (!input.acceptedPolicy) return err("Debes aceptar la política de tratamiento de datos.");
  const nick = normalizeNickname(input.nickname);
  if (!nick.ok) return err(nick.error);

  const players = await one<{ n: number }>("SELECT COUNT(*) AS n FROM live_players WHERE match_id = ? AND kicked_at IS NULL", [match.id]);
  if ((players?.n ?? 0) >= MAX_PLAYERS) return err("La partida está llena.", 403);

  const playerId = randomBytes(16).toString("hex");
  try {
    await run(
      "INSERT INTO live_players (id, match_id, nickname, accepted_policy_at) VALUES (?, ?, ?, datetime('now'))",
      [playerId, match.id, nick.nickname]
    );
  } catch (e) {
    if (String(e).includes("UNIQUE")) return err("Ese apodo ya está en uso en esta partida.", 409);
    throw e;
  }
  after(() => publishPlayers(match.id, match.join_locked === 1));
  return { ok: true, playerId, matchId: match.id, nickname: nick.nickname };
}

interface PlayerRow {
  id: string;
  nickname: string;
  kicked_at: string | null;
  match_id: number;
}

async function getPlayer(playerId: string): Promise<PlayerRow | null> {
  return one<PlayerRow>("SELECT id, nickname, kicked_at, match_id FROM live_players WHERE id = ?", [playerId]);
}

export async function submitAnswer(
  playerId: string,
  body: Record<string, unknown>,
  now: number
): Promise<Result> {
  const row = await one<MatchRow & { player_id: string; kicked_at: string | null }>(
    `SELECT ${MATCH_COLUMNS}, p.id AS player_id, p.kicked_at
     FROM live_players p JOIN live_matches m ON m.id = p.match_id JOIN live_games g ON g.id = m.game_id
     WHERE p.id = ?`,
    [playerId]
  );
  if (!row) return err("No estás en ninguna partida.", 401);
  if (row.kicked_at) return err("El host te sacó de esta partida.", 403);
  const player = { id: row.player_id };
  const match: MatchRow = row;
  const state = toState(match);
  if (state.status !== "question" || state.currentPosition === null || state.currentPosition !== body.position) {
    return err("Esta pregunta ya no recibe respuestas.", 409);
  }

  const questions = await loadQuestions(match.game_id);
  const q = questions[state.currentPosition - 1];
  if (!q) return err("Pregunta no encontrada.", 404);

  // Racha: preguntas con puntaje anteriores, en orden; no responder también la corta.
  const history = scored(q.type)
    ? (
        await all<{ is_correct: number | null }>(
          `SELECT a.is_correct FROM live_questions q
           LEFT JOIN live_answers a ON a.question_id = q.id AND a.player_id = ?
           WHERE q.game_id = ? AND q.type IN ('quiz', 'vf') AND q.position < ?
           ORDER BY q.position`,
          [player.id, match.game_id, q.position]
        )
      ).map((r) => r.is_correct === 1)
    : [];

  const input =
    q.type === "nube" ? { text: typeof body.text === "string" ? body.text : "" } : { optionIndex: Number(body.optionIndex) };
  const check = checkAnswer(state, q, input, now, currentStreak(history));
  if (!check.ok) return err(check.error, 409);

  try {
    await run(
      `INSERT INTO live_answers (player_id, question_id, option_id, text, is_correct, response_ms, points)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        player.id,
        q.id,
        check.optionIndex === null ? null : q.optionIds[check.optionIndex],
        check.text,
        check.isCorrect === null ? null : check.isCorrect ? 1 : 0,
        check.responseMs,
        check.points,
      ]
    );
  } catch (e) {
    if (String(e).includes("UNIQUE")) return err("Ya respondiste esta pregunta.", 409);
    throw e;
  }

  // El jugador ya tiene su respuesta guardada: el contador del host y el cierre de la
  // pregunta (si respondieron todos) corren después de contestarle.
  after(async () => {
    const { answered, players } = await answerCounts(match.id, q.id);
    await publishHost(match.id, { name: "answers", data: { position: q.position, answered, players } });
    if (shouldEndQuestion(state, now, answered, players)) await transition(match, "endQuestion", now, questions);
  });
  return { ok: true };
}

// --- Fotos de estado -------------------------------------------------------------------

async function baseSnapshot(match: MatchRow, questions: FullQuestion[]): Promise<MatchSnapshot> {
  const state = toState(match);
  const q = state.currentPosition ? questions[state.currentPosition - 1] : undefined;
  const revealed = state.status === "reveal" || state.status === "leaderboard" || (state.status === "finished" && !!q);
  const reveal = revealed && q ? await buildReveal(match, q, questions) : null;
  return {
    matchId: match.id,
    status: state.status,
    joinLocked: state.joinLocked,
    gameTitle: match.game_title,
    totalQuestions: questions.length,
    question: q && state.status !== "finished" ? publicQuestion(q, state, questions.length) : null,
    reveal,
    // Con la pregunta abierta, el ranking es el acumulado hasta la anterior.
    entries: reveal?.entries ?? (await standings(match.id, Math.max(0, (state.currentPosition ?? 1) - 1), questions)),
    serverNow: Date.now(),
  };
}

export async function hostSnapshot(matchId: number, user: AdminUser): Promise<Result<{ snapshot: HostSnapshot }>> {
  const match = await getMatchForHost(matchId, user);
  if (!match) return err("Partida no encontrada.", 404);
  const questions = await loadQuestions(match.game_id);
  const base = await baseSnapshot(match, questions);
  const q = match.current_position ? questions[match.current_position - 1] : undefined;
  return {
    ok: true,
    snapshot: {
      ...base,
      gameId: match.game_id,
      pin: match.pin,
      nicknames: await activeNicknames(match.id),
      answered: q ? (await answerCounts(match.id, q.id)).answered : 0,
    },
  };
}

export async function playerSnapshot(playerId: string): Promise<Result<{ snapshot: PlayerSnapshot }>> {
  const player = await getPlayer(playerId);
  if (!player) return err("No estás en ninguna partida.", 401);
  const match = await getMatch(player.match_id);
  if (!match) return err("La partida ya no existe.", 404);
  const questions = await loadQuestions(match.game_id);
  const base = await baseSnapshot(match, questions);
  const q = match.current_position ? questions[match.current_position - 1] : undefined;
  const mine = q
    ? await one<{ option_id: number | null; text: string | null }>(
        "SELECT option_id, text FROM live_answers WHERE player_id = ? AND question_id = ?",
        [player.id, q.id]
      )
    : null;
  return {
    ok: true,
    snapshot: {
      ...base,
      nickname: player.nickname,
      kicked: player.kicked_at !== null,
      myAnswer: mine && q ? { optionIndex: mine.option_id === null ? null : q.optionIds.indexOf(mine.option_id), text: mine.text } : null,
    },
  };
}

/** Partida de un jugador, para el token de Ably. null si no existe o fue expulsado. */
export async function playerMatchId(playerId: string): Promise<number | null> {
  const player = await getPlayer(playerId);
  return player && !player.kicked_at ? player.match_id : null;
}
