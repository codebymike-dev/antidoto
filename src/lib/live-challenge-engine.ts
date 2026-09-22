// Desafío asíncrono: reglas puras, sin red ni base de datos. Cada jugador tiene su
// propio reloj; el puntaje y la racha los calcula el mismo motor de la partida en vivo
// (checkAnswer) sobre un estado armado con el avance del jugador.

// Con extensión: los tests corren este archivo directo en Node, que no la adivina.
import { ANSWER_GRACE_MS, type MatchState } from "./live-engine.ts";

/** Espejo de live_challenge_progress. Tiempos en epoch ms del servidor. */
export interface ChallengeProgress {
  currentPosition: number | null;
  questionStartedAt: number | null;
  questionEndsAt: number | null;
  finished: boolean;
}

export const emptyProgress = (): ChallengeProgress => ({
  currentPosition: null,
  questionStartedAt: null,
  questionEndsAt: null,
  finished: false,
});

/** Máximo de días que puede quedar abierto un desafío. */
export const CHALLENGE_MAX_DAYS = 60;
/** Con menos margen no alcanza a jugarlo nadie: suele ser un error al elegir la fecha. */
export const CHALLENGE_MIN_MINUTES = 5;

/** Estado de partida equivalente, para validar y puntuar con checkAnswer. */
export function challengeState(p: ChallengeProgress): MatchState {
  return {
    status: p.currentPosition !== null && !p.finished ? "question" : "lobby",
    currentPosition: p.currentPosition,
    questionStartedAt: p.questionStartedAt,
    questionEndsAt: p.questionEndsAt,
    pausedRemainingMs: null,
    joinLocked: false,
  };
}

/** La pregunta abierta ya no recibe respuestas (se acabó el tiempo, con el mismo margen que en vivo). */
export function questionExpired(p: ChallengeProgress, now: number): boolean {
  return p.questionEndsAt !== null && now > p.questionEndsAt + ANSWER_GRACE_MS;
}

export type ChallengePhase = "intro" | "question" | "feedback" | "finished";

/**
 * Qué ve el jugador. `closed` = el desafío cerró (por fecha o a mano): lo que no
 * alcanzó a responder ya no cuenta y pasa directo a su resultado.
 */
export function challengePhase(p: ChallengeProgress, answeredCurrent: boolean, closed: boolean, now: number): ChallengePhase {
  if (p.finished || closed) return "finished";
  if (p.currentPosition === null) return "intro";
  if (answeredCurrent || questionExpired(p, now)) return "feedback";
  return "question";
}

export interface AdvanceContext {
  now: number;
  totalQuestions: number;
  /** Tiempo límite en segundos de la pregunta en esa posición. */
  timeLimitAt: (position: number) => number;
  introMs: number;
  answeredCurrent: boolean;
  closed: boolean;
}

export type AdvanceResult = { ok: true; progress: ChallengeProgress } | { ok: false; error: string };

/**
 * Abre la siguiente pregunta, o termina si era la última. Solo se avanza con la
 * pregunta actual respondida o vencida: así nadie se salta una para ganar tiempo.
 */
export function advance(p: ChallengeProgress, ctx: AdvanceContext): AdvanceResult {
  if (ctx.closed) return { ok: false, error: "El desafío ya cerró." };
  if (p.finished) return { ok: false, error: "Ya terminaste este desafío." };
  if (p.currentPosition !== null && !ctx.answeredCurrent && !questionExpired(p, ctx.now)) {
    return { ok: false, error: "Responde la pregunta actual primero." };
  }
  const next = (p.currentPosition ?? 0) + 1;
  if (next > ctx.totalQuestions) return { ok: true, progress: { ...p, finished: true } };
  const startedAt = ctx.now + ctx.introMs;
  return {
    ok: true,
    progress: {
      currentPosition: next,
      questionStartedAt: startedAt,
      questionEndsAt: startedAt + ctx.timeLimitAt(next) * 1000,
      finished: false,
    },
  };
}

/**
 * Valida la fecha de cierre que manda el admin (ISO, con zona). Devuelve el formato de
 * SQLite en UTC ("YYYY-MM-DD HH:MM:SS") para compararla con datetime('now').
 */
export function parseClosesAt(input: unknown, now: number): { ok: true; value: string } | { ok: false; error: string } {
  const ms = typeof input === "string" && input ? Date.parse(input) : NaN;
  if (!Number.isFinite(ms)) return { ok: false, error: "Elige la fecha y hora de cierre." };
  if (ms < now + CHALLENGE_MIN_MINUTES * 60_000) {
    return { ok: false, error: `El cierre debe quedar al menos ${CHALLENGE_MIN_MINUTES} minutos en el futuro.` };
  }
  if (ms > now + CHALLENGE_MAX_DAYS * 86_400_000) {
    return { ok: false, error: `El desafío puede quedar abierto máximo ${CHALLENGE_MAX_DAYS} días.` };
  }
  return { ok: true, value: new Date(ms).toISOString().slice(0, 19).replace("T", " ") };
}

/** Fecha de SQLite en UTC a epoch ms. */
export const sqliteToMs = (value: string) => Date.parse(value.replace(" ", "T") + (value.endsWith("Z") ? "" : "Z"));
