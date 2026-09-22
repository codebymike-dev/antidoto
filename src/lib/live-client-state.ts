// Aplica los eventos de Ably sobre la foto de estado del cliente. Puro para probarlo
// sin navegador; lo usan la pantalla del host y la del jugador. Si llega un evento
// que no encaja (otra pregunta), se ignora: la foto completa lo corrige al resincronizar.

import type { HostEvent, HostSnapshot, MatchSnapshot, PlayerSnapshot, PublicEvent } from "./live-protocol";

export function applyPublicEvent<S extends MatchSnapshot>(state: S, event: PublicEvent): S {
  switch (event.name) {
    case "question": {
      const { serverNow, ...question } = event.data;
      // El ranking se conserva: es el puntaje acumulado que el jugador ve durante la pregunta.
      return { ...state, status: "question", question, reveal: null, serverNow, ...resetAnswer(state) };
    }
    case "paused":
      if (state.question?.position !== event.data.position) return state;
      return { ...state, question: { ...state.question, pausedRemainingMs: event.data.remainingMs } };
    case "resumed":
      if (state.question?.position !== event.data.position) return state;
      return {
        ...state,
        serverNow: event.data.serverNow,
        question: { ...state.question, startedAt: event.data.startedAt, endsAt: event.data.endsAt, pausedRemainingMs: null },
      };
    case "reveal":
      if (state.question?.position !== event.data.position) return state;
      return { ...state, status: "reveal", reveal: event.data, entries: event.data.entries };
    case "leaderboard":
      return { ...state, status: "leaderboard", entries: event.data.entries };
    case "finished":
      return { ...state, status: "finished", question: null, entries: event.data.entries };
    case "kicked":
      return removeNickname(state, event.data.nickname);
  }
}

export function applyHostEvent(state: HostSnapshot, event: HostEvent): HostSnapshot {
  switch (event.name) {
    case "players":
      return { ...state, nicknames: event.data.nicknames, joinLocked: event.data.joinLocked };
    case "answers":
      if (state.question?.position !== event.data.position) return state;
      return { ...state, answered: event.data.answered };
  }
}

// Campos propios de cada pantalla que dependen de la pregunta en curso.
function resetAnswer<S extends MatchSnapshot>(state: S): Partial<S> {
  const reset: Partial<HostSnapshot & PlayerSnapshot> = {};
  if ("answered" in state) reset.answered = 0;
  if ("myAnswer" in state) reset.myAnswer = null;
  return reset as Partial<S>;
}

function removeNickname<S extends MatchSnapshot>(state: S, nickname: string): S {
  const next: S = { ...state, entries: state.entries.filter((e) => e.nickname !== nickname) };
  if ("nicknames" in state) (next as unknown as HostSnapshot).nicknames = (state as unknown as HostSnapshot).nicknames.filter((n) => n !== nickname);
  if ("nickname" in state && (state as unknown as PlayerSnapshot).nickname === nickname) (next as unknown as PlayerSnapshot).kicked = true;
  return next;
}

/** Milisegundos que le quedan a la pregunta según el reloj del servidor. */
export function remainingMs(question: MatchSnapshot["question"], offsetMs: number, now = Date.now()): number {
  if (!question) return 0;
  if (question.pausedRemainingMs !== null) return question.pausedRemainingMs;
  return Math.max(0, question.endsAt - (now + offsetMs));
}
