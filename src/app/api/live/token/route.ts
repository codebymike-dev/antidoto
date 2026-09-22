import { createHash } from "node:crypto";
import { currentUser } from "@/lib/auth";
import { createTokenRequest } from "@/lib/realtime";
import { getMatchForHost, playerMatchId } from "@/lib/live-match";
import { hostChannel, matchChannel } from "@/lib/live-protocol";
import { fail, json, matchIdParam, playerIdFromCookie } from "@/lib/live-http";

/**
 * Token de Ably de solo lectura. El host (con ?match=) escucha el canal público y el
 * suyo; un jugador, solo el público de su partida. Nadie publica desde el navegador.
 */
export async function GET(request: Request) {
  const matchParam = new URL(request.url).searchParams.get("match");

  if (matchParam) {
    const user = await currentUser();
    const matchId = matchIdParam(matchParam);
    const match = user && matchId ? await getMatchForHost(matchId, user) : null;
    if (!user || !match) return fail("Sin acceso a esta partida.", 403);
    const token = await createTokenRequest(`host:${user.id}`, {
      [matchChannel(match.id)]: ["subscribe"],
      [hostChannel(match.id)]: ["subscribe"],
    });
    return json(token);
  }

  const playerId = await playerIdFromCookie();
  const matchId = playerId ? await playerMatchId(playerId) : null;
  if (!playerId || !matchId) return fail("No estás en ninguna partida.", 401);
  // El clientId es visible para Ably: se deriva del id sin exponerlo.
  const clientId = `p:${createHash("sha256").update(playerId).digest("hex").slice(0, 16)}`;
  return json(await createTokenRequest(clientId, { [matchChannel(matchId)]: ["subscribe"] }));
}
