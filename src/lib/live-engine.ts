// Motor de la partida en vivo: lógica pura, sin red ni base de datos. La capa de
// tiempo real (Fase 4) lee el estado de live_matches, llama a estas funciones y
// guarda el resultado; así las reglas del juego se prueban sin Ably ni Turso.

import type { LiveMatchStatus, LiveQuestionType } from "./types";

// --- Estado y comandos del host ---------------------------------------------

/** Espejo de las columnas de estado de live_matches. Tiempos en epoch ms del servidor. */
export interface MatchState {
  status: LiveMatchStatus;
  /** Posición (1..n) de la pregunta en curso; null en el lobby. */
  currentPosition: number | null;
  questionStartedAt: number | null;
  questionEndsAt: number | null;
  /** No nulo = pregunta pausada, con este tiempo restante. */
  pausedRemainingMs: number | null;
  joinLocked: boolean;
}

export const initialMatchState = (): MatchState => ({
  status: "lobby",
  currentPosition: null,
  questionStartedAt: null,
  questionEndsAt: null,
  pausedRemainingMs: null,
  joinLocked: false,
});

export type HostCommand =
  | "start"
  /** Cierra la pregunta y muestra la respuesta: al vencer el tiempo, al responder todos o a mano ("saltar"). */
  | "endQuestion"
  | "showLeaderboard"
  | "next"
  | "pause"
  | "resume"
  | "lockJoin"
  | "unlockJoin"
  /** Termina la partida antes de tiempo: va directo al podio. */
  | "finish";

export interface CommandContext {
  now: number;
  totalQuestions: number;
  activePlayers: number;
  /** Tiempo límite en segundos de la pregunta en esa posición. */
  timeLimitAt: (position: number) => number;
  /**
   * Entrada de la pregunta ("¡Prepárate!"): se muestra sola antes de aceptar respuestas.
   * El reloj arranca al terminar, así no le resta tiempo a nadie.
   */
  introMs?: number;
}

export type CommandResult = { ok: true; state: MatchState } | { ok: false; error: string };

function openQuestion(state: MatchState, position: number, ctx: CommandContext): MatchState {
  const limitMs = ctx.timeLimitAt(position) * 1000;
  const startsAt = ctx.now + (ctx.introMs ?? 0);
  return {
    ...state,
    status: "question",
    currentPosition: position,
    questionStartedAt: startsAt,
    questionEndsAt: startsAt + limitMs,
    pausedRemainingMs: null,
  };
}

const fail = (error: string): CommandResult => ({ ok: false, error });

export function applyCommand(state: MatchState, command: HostCommand, ctx: CommandContext): CommandResult {
  if (state.status === "finished") return fail("La partida ya terminó.");

  switch (command) {
    case "start":
      if (state.status !== "lobby") return fail("La partida ya empezó.");
      if (ctx.totalQuestions < 1) return fail("El juego no tiene preguntas.");
      if (ctx.activePlayers < 1) return fail("Espera a que entre al menos un jugador.");
      return { ok: true, state: openQuestion(state, 1, ctx) };

    case "endQuestion":
      if (state.status !== "question") return fail("No hay una pregunta abierta.");
      return { ok: true, state: { ...state, status: "reveal", pausedRemainingMs: null } };

    case "showLeaderboard":
      if (state.status !== "reveal") return fail("Primero se revela la respuesta.");
      return { ok: true, state: { ...state, status: "leaderboard" } };

    case "next": {
      if (state.status !== "reveal" && state.status !== "leaderboard") return fail("Termina la pregunta actual primero.");
      const nextPosition = (state.currentPosition ?? 0) + 1;
      if (nextPosition > ctx.totalQuestions) return { ok: true, state: { ...state, status: "finished" } };
      return { ok: true, state: openQuestion(state, nextPosition, ctx) };
    }

    case "pause": {
      if (state.status !== "question") return fail("Solo se puede pausar una pregunta en curso.");
      if (state.pausedRemainingMs !== null) return fail("La pregunta ya está en pausa.");
      const remaining = Math.max(0, (state.questionEndsAt ?? ctx.now) - ctx.now);
      if (remaining === 0) return fail("El tiempo ya se acabó.");
      return { ok: true, state: { ...state, pausedRemainingMs: remaining } };
    }

    case "resume": {
      if (state.status !== "question" || state.pausedRemainingMs === null) return fail("La pregunta no está en pausa.");
      // Se corre también el inicio para que el tiempo de respuesta no cuente la pausa.
      const endsAt = ctx.now + state.pausedRemainingMs;
      const limitMs = ctx.timeLimitAt(state.currentPosition!) * 1000;
      return {
        ok: true,
        state: { ...state, questionEndsAt: endsAt, questionStartedAt: endsAt - limitMs, pausedRemainingMs: null },
      };
    }

    case "lockJoin":
      return { ok: true, state: { ...state, joinLocked: true } };

    case "unlockJoin":
      return { ok: true, state: { ...state, joinLocked: false } };

    case "finish":
      return { ok: true, state: { ...state, status: "finished", pausedRemainingMs: null } };
  }
}

/**
 * Margen para respuestas enviadas justo antes del final que llegan tarde por la red.
 * El tiempo de respuesta igual se topa al límite, así que no da ventaja.
 */
export const ANSWER_GRACE_MS = 500;

/** El servidor debe cerrar la pregunta: se acabó el tiempo (más el margen) o ya respondieron todos. */
export function shouldEndQuestion(state: MatchState, now: number, answered: number, activePlayers: number): boolean {
  if (state.status !== "question" || state.pausedRemainingMs !== null) return false;
  if (activePlayers > 0 && answered >= activePlayers) return true;
  return state.questionEndsAt !== null && now > state.questionEndsAt + ANSWER_GRACE_MS;
}

// --- Respuestas y puntaje -----------------------------------------------------

export interface EngineQuestion {
  position: number;
  type: LiveQuestionType;
  /** Segundos. */
  timeLimit: number;
  /** En el orden de las opciones; vacío en la nube. */
  options: { correct: boolean }[];
}

export type AnswerInput = { optionIndex: number } | { text: string };

export const scored = (type: LiveQuestionType) => type === "quiz" || type === "vf";

export const MAX_POINTS = 1000;
export const STREAK_STEP = 100;
export const STREAK_CAP = 500;
export const WORD_MAX = 30;

/**
 * Estilo Kahoot: responder correcto al instante da 1000; al final del tiempo, 500.
 * Incorrecto o sin responder, 0.
 */
export function basePoints(correct: boolean, responseMs: number, timeLimitMs: number): number {
  if (!correct) return 0;
  const ratio = Math.min(Math.max(responseMs, 0), timeLimitMs) / timeLimitMs;
  return Math.round(MAX_POINTS * (1 - ratio / 2));
}

/** Bono por racha: desde el segundo acierto seguido, +100 por acierto, con tope. */
export function streakBonus(streak: number): number {
  return Math.min(Math.max(streak - 1, 0) * STREAK_STEP, STREAK_CAP);
}

/**
 * Racha vigente antes de esta pregunta. `history` son las preguntas con puntaje ya
 * cerradas, en orden: true = acertó; false = falló o no respondió (ambas la cortan).
 */
export function currentStreak(history: boolean[]): number {
  let streak = 0;
  for (let i = history.length - 1; i >= 0 && history[i]; i--) streak++;
  return streak;
}

export type AnswerCheck =
  | {
      ok: true;
      /** Topado al tiempo límite. */
      responseMs: number;
      /** null en encuesta y nube. */
      isCorrect: boolean | null;
      points: number;
      /** Racha después de esta respuesta (solo cambia en preguntas con puntaje). */
      streak: number;
      optionIndex: number | null;
      text: string | null;
    }
  | { ok: false; error: string };

/**
 * Valida y puntúa una respuesta con el reloj del servidor. `now` debe tomarse al
 * recibirla, antes de cualquier I/O. La unicidad (una por pregunta) la garantiza la BD.
 */
export function checkAnswer(
  state: MatchState,
  question: EngineQuestion,
  input: AnswerInput,
  now: number,
  previousStreak: number
): AnswerCheck {
  if (state.status !== "question" || state.currentPosition !== question.position) {
    return { ok: false, error: "Esta pregunta ya no recibe respuestas." };
  }
  if (state.pausedRemainingMs !== null) return { ok: false, error: "La pregunta está en pausa." };
  if (state.questionEndsAt === null || state.questionStartedAt === null) return { ok: false, error: "Pregunta sin reloj." };
  if (now > state.questionEndsAt + ANSWER_GRACE_MS) return { ok: false, error: "Se acabó el tiempo." };
  if (now < state.questionStartedAt) return { ok: false, error: "La pregunta todavía no empieza." };

  const limitMs = question.timeLimit * 1000;
  const responseMs = Math.min(Math.max(now - state.questionStartedAt, 0), limitMs);

  if (question.type === "nube") {
    if (!("text" in input)) return { ok: false, error: "Escribe una palabra." };
    const text = normalizeWord(input.text);
    if (!text) return { ok: false, error: "Escribe una palabra." };
    return { ok: true, responseMs, isCorrect: null, points: 0, streak: previousStreak, optionIndex: null, text };
  }

  if (!("optionIndex" in input)) return { ok: false, error: "Elige una opción." };
  const { optionIndex } = input;
  if (!Number.isInteger(optionIndex) || optionIndex < 0 || optionIndex >= question.options.length) {
    return { ok: false, error: "Opción inválida." };
  }

  if (!scored(question.type)) {
    return { ok: true, responseMs, isCorrect: null, points: 0, streak: previousStreak, optionIndex, text: null };
  }

  const isCorrect = question.options[optionIndex].correct;
  const streak = isCorrect ? previousStreak + 1 : 0;
  const points = isCorrect ? basePoints(true, responseMs, limitMs) + streakBonus(streak) : 0;
  return { ok: true, responseMs, isCorrect, points, streak, optionIndex, text: null };
}

// --- Ranking ------------------------------------------------------------------

export interface RankPlayer {
  nickname: string;
  /** Para desempatar de forma estable: quien entró primero. */
  joinOrder: number;
}

export interface RankAnswer {
  nickname: string;
  position: number;
  points: number;
  isCorrect: boolean | null;
  responseMs: number;
}

export interface LeaderboardEntry {
  nickname: string;
  rank: number;
  score: number;
  correct: number;
  /** Puntos ganados en la última pregunta considerada. */
  lastPoints: number;
  /** Puestos ganados (+) o perdidos (-) respecto de la pregunta anterior. */
  movement: number;
  /** Aciertos seguidos al cierre de `upTo` (va en el ranking para no perderla al reconectar). */
  streak: number;
}

function standings(players: RankPlayer[], answers: RankAnswer[], upTo: number) {
  const totals = new Map(players.map((p) => [p.nickname, { score: 0, correct: 0, correctMs: 0, last: 0 }]));
  for (const a of answers) {
    const t = totals.get(a.nickname);
    if (!t || a.position > upTo) continue;
    t.score += a.points;
    if (a.isCorrect) {
      t.correct++;
      t.correctMs += a.responseMs;
    }
    if (a.position === upTo) t.last = a.points;
  }

  const sorted = [...players].sort((x, y) => {
    const a = totals.get(x.nickname)!;
    const b = totals.get(y.nickname)!;
    return b.score - a.score || a.correctMs - b.correctMs || x.joinOrder - y.joinOrder;
  });

  // Empate real (mismo puntaje) comparte puesto: 1, 2, 2, 4.
  const ranks = new Map<string, number>();
  sorted.forEach((p, i) => {
    const prev = sorted[i - 1];
    const same = prev && totals.get(prev.nickname)!.score === totals.get(p.nickname)!.score;
    ranks.set(p.nickname, same ? ranks.get(prev.nickname)! : i + 1);
  });

  return { sorted, totals, ranks };
}

/**
 * Ranking hasta la pregunta `upTo` (incluida). Excluir a los expulsados antes de llamar.
 * `scoredPositions` son las posiciones con puntaje (quiz y V/F): no responder una de
 * ellas también corta la racha.
 */
export function computeLeaderboard(
  players: RankPlayer[],
  answers: RankAnswer[],
  upTo: number,
  scoredPositions: number[] = []
): LeaderboardEntry[] {
  const now = standings(players, answers, upTo);
  const before = upTo > 1 ? standings(players, answers, upTo - 1) : null;

  const correctAt = new Map<string, Set<number>>();
  for (const a of answers) {
    if (!a.isCorrect) continue;
    const set = correctAt.get(a.nickname) ?? new Set<number>();
    set.add(a.position);
    correctAt.set(a.nickname, set);
  }
  const history = scoredPositions.filter((p) => p <= upTo).sort((a, b) => a - b);

  return now.sorted.map((p) => {
    const t = now.totals.get(p.nickname)!;
    const rank = now.ranks.get(p.nickname)!;
    const mine = correctAt.get(p.nickname);
    return {
      nickname: p.nickname,
      rank,
      score: t.score,
      correct: t.correct,
      lastPoints: t.last,
      movement: before ? before.ranks.get(p.nickname)! - rank : 0,
      streak: currentStreak(history.map((pos) => mine?.has(pos) ?? false)),
    };
  });
}

// --- Estadísticas de una pregunta ----------------------------------------------

export interface QuestionStats {
  answered: number;
  /** Votos por opción, en el orden de las opciones. */
  distribution: number[];
  /** Solo en preguntas con puntaje; null si nadie respondió. */
  correctPct: number | null;
  avgResponseMs: number | null;
  words: { text: string; count: number }[];
}

export function questionStats(
  question: EngineQuestion,
  answers: { optionIndex: number | null; text: string | null; isCorrect: boolean | null; responseMs: number }[]
): QuestionStats {
  const distribution = question.options.map(() => 0);
  let correct = 0;
  let totalMs = 0;
  for (const a of answers) {
    if (a.optionIndex !== null && a.optionIndex < distribution.length) distribution[a.optionIndex]++;
    if (a.isCorrect) correct++;
    totalMs += a.responseMs;
  }
  const n = answers.length;
  return {
    answered: n,
    distribution,
    correctPct: scored(question.type) && n > 0 ? Math.round((correct / n) * 100) : null,
    avgResponseMs: n > 0 ? Math.round(totalMs / n) : null,
    words: question.type === "nube" ? groupWords(answers.map((a) => a.text ?? "")) : [],
  };
}

// --- Nube de palabras ------------------------------------------------------------

/** Recorta, colapsa espacios, quita puntuación de los bordes y limita el largo. */
export function normalizeWord(input: string): string {
  return input
    .replace(/[\u0000-\u001f\u007f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, "")
    .slice(0, WORD_MAX)
    .trim();
}

/**
 * Agrupa sin distinguir mayúsculas ("Calma" = "calma") pero respetando tildes.
 * Muestra la forma más usada de cada grupo. Devuelve las 50 más frecuentes.
 */
export function groupWords(texts: string[], limit = 50): { text: string; count: number }[] {
  const groups = new Map<string, { count: number; forms: Map<string, number> }>();
  for (const raw of texts) {
    const word = normalizeWord(raw);
    if (!word) continue;
    const key = word.toLocaleLowerCase("es");
    const g = groups.get(key) ?? { count: 0, forms: new Map() };
    g.count++;
    g.forms.set(word, (g.forms.get(word) ?? 0) + 1);
    groups.set(key, g);
  }
  return [...groups.values()]
    .map((g) => ({ text: [...g.forms.entries()].sort((a, b) => b[1] - a[1])[0][0], count: g.count }))
    .sort((a, b) => b.count - a.count || a.text.localeCompare(b.text, "es"))
    .slice(0, limit);
}

// --- Entrada: PIN y apodo ---------------------------------------------------------

/** 6 dígitos sin cero inicial. La unicidad entre partidas abiertas la da el índice de la BD. */
export function generatePin(random: () => number = Math.random): string {
  return String(100000 + Math.floor(random() * 900000));
}

export const NICKNAME_MAX = 20;

export function normalizeNickname(input: string): { ok: true; nickname: string } | { ok: false; error: string } {
  const nickname = input
    .replace(/[\u0000-\u001f\u007f\u200b-\u200f\u2028-\u202e\u2060-\u206f\ufeff]/g, "")
    .replace(/\s+/g, " ")
    .trim();
  if (!nickname) return { ok: false, error: "Escribe un apodo." };
  if ([...nickname].length > NICKNAME_MAX) return { ok: false, error: `Máximo ${NICKNAME_MAX} caracteres.` };
  return { ok: true, nickname };
}
