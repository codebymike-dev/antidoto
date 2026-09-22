import { advanceChallenge } from "@/lib/live-challenge";
import { fail, json, playerIdFromCookie, sameOrigin } from "@/lib/live-http";

/** Desafío: abre la siguiente pregunta del jugador (o lo lleva a su resultado). */
export async function POST(request: Request) {
  // El reloj de la pregunta arranca con la hora de llegada, antes de cualquier I/O.
  const now = Date.now();
  if (!sameOrigin(request)) return fail("Origen no permitido.", 403);
  const playerId = await playerIdFromCookie();
  if (!playerId) return fail("No estás en ninguna partida.", 401);

  const res = await advanceChallenge(playerId, now);
  return res.ok ? json({ ok: true }) : fail(res.error, res.status);
}
