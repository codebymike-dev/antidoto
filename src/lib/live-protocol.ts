// Eventos que el servidor publica por Ably. Solo tipos: la Fase 4 los emite y las
// pantallas (Fases 5 y 6) los consumen.
//
// Reglas de seguridad del canal público (lo escuchan jugadores y proyector):
// - Nunca incluir cuál es la correcta antes de "reveal".
// - Nunca incluir el id de live_players: es el secreto de la cookie. Los jugadores
//   se encuentran a sí mismos por apodo, que es único dentro de la partida.

import type { LeaderboardEntry } from "./live-engine";
import type { LiveQuestionType } from "./types";

export const matchChannel = (matchId: number) => `live:${matchId}`;

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
}

export type LiveEvent =
  | { name: "players"; data: { nicknames: string[]; joinLocked: boolean } }
  | { name: "question"; data: PublicQuestion & { serverNow: number } }
  | { name: "answers"; data: { position: number; answered: number; players: number } }
  | { name: "paused"; data: { position: number; remainingMs: number } }
  | { name: "resumed"; data: { position: number; startedAt: number; endsAt: number; serverNow: number } }
  | {
      name: "reveal";
      data: {
        position: number;
        /** Índices de las opciones correctas; vacío en encuesta y nube. */
        correct: number[];
        distribution: number[];
        words: { text: string; count: number }[];
      };
    }
  | { name: "leaderboard"; data: { position: number; entries: LeaderboardEntry[] } }
  | { name: "finished"; data: { entries: LeaderboardEntry[] } }
  | { name: "kicked"; data: { nickname: string } };

export type LiveEventName = LiveEvent["name"];
