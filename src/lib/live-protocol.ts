// Eventos que el servidor publica por Ably y las fotos de estado para reconectar.
// Solo tipos: los emite live-match.ts y los consumen las pantallas.
//
// Reglas de seguridad del canal público (lo escuchan jugadores y proyector):
// - Nunca incluir cuál es la correcta antes de "reveal".
// - Nunca incluir el id de live_players: es el secreto de la cookie. Los jugadores
//   se encuentran a sí mismos por apodo, que es único dentro de la partida.

import type { LeaderboardEntry } from "./live-engine";
import type { LiveMatchStatus, LiveQuestionType } from "./types";

/**
 * Entrada de cada pregunta, como en Kahoot: la pregunta se ve sola 3 s para leerla y
 * las opciones aparecen en `startedAt`. Ver docs/investigacion-ux-kahoot.md 5.1.
 */
export const QUESTION_INTRO_MS = 3000;

/** Canal público: jugadores y proyector. */
export const matchChannel = (matchId: number) => `live:${matchId}`;
/**
 * Canal del host. El contador de respuestas y la lista de jugadores cambian con cada
 * jugador: mandarlos a los 50 celulares multiplicaría los mensajes de Ably por 50.
 */
export const hostChannel = (matchId: number) => `live:${matchId}:host`;

export interface PublicQuestion {
  position: number;
  total: number;
  type: LiveQuestionType;
  prompt: string;
  /** Textos de las opciones, sin marcar la correcta. Vacío en la nube. */
  options: string[];
  timeLimitMs: number;
  /** Epoch ms del servidor; el cliente corrige su reloj con `serverNow`. */
  startedAt: number;
  endsAt: number;
  /** No nulo = en pausa. */
  pausedRemainingMs: number | null;
}

export interface RevealData {
  position: number;
  /** Índices de las opciones correctas; vacío en encuesta y nube. */
  correct: number[];
  distribution: number[];
  words: { text: string; count: number }[];
  answered: number;
  /** Ranking tras esta pregunta: cada jugador ve sus puntos y su puesto. */
  entries: LeaderboardEntry[];
}

export type PublicEvent =
  | { name: "question"; data: PublicQuestion & { serverNow: number } }
  | { name: "paused"; data: { position: number; remainingMs: number } }
  | { name: "resumed"; data: { position: number; startedAt: number; endsAt: number; serverNow: number } }
  | { name: "reveal"; data: RevealData }
  | { name: "leaderboard"; data: { position: number; entries: LeaderboardEntry[] } }
  | { name: "finished"; data: { entries: LeaderboardEntry[] } }
  | { name: "kicked"; data: { nickname: string } };

export type HostEvent =
  | { name: "players"; data: { nicknames: string[]; joinLocked: boolean } }
  | { name: "answers"; data: { position: number; answered: number; players: number } };

/** Foto completa para pintar la pantalla al entrar o al reconectar (se pueden haber perdido eventos). */
export interface MatchSnapshot {
  matchId: number;
  status: LiveMatchStatus;
  joinLocked: boolean;
  gameTitle: string;
  totalQuestions: number;
  question: PublicQuestion | null;
  /** Solo con la pregunta actual ya revelada (reveal, leaderboard o finished). */
  reveal: RevealData | null;
  entries: LeaderboardEntry[];
  serverNow: number;
}

export interface HostSnapshot extends MatchSnapshot {
  gameId: number;
  pin: string;
  nicknames: string[];
  answered: number;
}

export interface PlayerSnapshot extends MatchSnapshot {
  nickname: string;
  kicked: boolean;
  /** Lo que respondió en la pregunta actual, si respondió. */
  myAnswer: { optionIndex: number | null; text: string | null } | null;
}

// --- Desafío asíncrono -------------------------------------------------------------
// Sin Ably: el celular pide la foto por HTTP en cada paso. Solo lleva los datos de
// este jugador, así que la correcta se puede mandar apenas él responde o se le acaba el tiempo.

export interface ChallengeFeedback {
  /** Índices de las opciones correctas; vacío en encuesta y nube. */
  correct: number[];
  /** null en encuesta y nube, o si no alcanzó a responder. */
  isCorrect: boolean | null;
  points: number;
  /** Aciertos seguidos después de esta pregunta. */
  streak: number;
}

export interface ChallengeSnapshot {
  mode: "challenge";
  matchId: number;
  gameTitle: string;
  nickname: string;
  kicked: boolean;
  totalQuestions: number;
  /** Epoch ms del cierre. */
  closesAt: number;
  /** Cerró por fecha o a mano. */
  closed: boolean;
  phase: "intro" | "question" | "feedback" | "finished";
  /** Pregunta abierta o la que se acaba de responder; null en la entrada y al final. */
  question: PublicQuestion | null;
  myAnswer: { optionIndex: number | null; text: string | null } | null;
  /** Solo en la fase de resultado de la pregunta. */
  feedback: ChallengeFeedback | null;
  score: number;
  /** Puesto en el ranking del momento; solo al final. */
  result: {
    rank: number;
    players: number;
    correct: number;
    answered: number;
    top: { nickname: string; score: number; rank: number }[];
  } | null;
  serverNow: number;
}

export const isChallengeSnapshot = (s: PlayerSnapshot | ChallengeSnapshot): s is ChallengeSnapshot =>
  "mode" in s && s.mode === "challenge";
