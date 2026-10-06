import { playerTick } from "@/lib/live-match";
import { fail, json, playerIdFromCookie, sameOrigin } from "@/lib/live-http";

/**
 * El celular avisa cuando su reloj llega al final, igual que el proyector con
 * /host/[matchId]/tick: así la pregunta se cierra aunque nadie tenga abierta la pantalla
 * del host.
 */
export async function POST(request: Request) {
  if (!sameOrigin(request)) return fail("Origen no permitido.", 403);
  const playerId = await playerIdFromCookie();
  if (!playerId) return fail("No estás en ninguna partida.", 401);
  const res = await playerTick(playerId);
  return res.ok ? json({ ok: true }) : fail(res.error, res.status);
}
