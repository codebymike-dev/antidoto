import { leaveMatch } from "@/lib/live-match";
import { clearPlayerCookie, fail, json, playerIdFromCookie, sameOrigin } from "@/lib/live-http";

/**
 * Sale en este dispositivo. En el lobby el jugador se borra y libera su apodo; ya
 * empezada la partida sigue en ella (y en los reportes).
 */
export async function POST(request: Request) {
  if (!sameOrigin(request)) return fail("Origen no permitido.", 403);
  const playerId = await playerIdFromCookie();
  if (playerId) await leaveMatch(playerId);
  await clearPlayerCookie();
  return json({ ok: true });
}
