import { createHash } from "node:crypto";
import { currentUser } from "@/lib/auth";
import { createTokenRequest } from "@/lib/realtime";
import { getSessionForHost, hostChannels, playerChannels, sessionChannel, teamChannel } from "@/lib/brick-session";
import { brickPlayerId } from "@/lib/brick-http";
import { fail, json, matchIdParam } from "@/lib/live-http";

/**
 * Token de Ably de solo lectura. El proyector (con ?session=) escucha la sesión y todos sus
 * equipos; un jugador, la sesión y su propio equipo. Nadie publica desde el navegador.
 */
export async function GET(request: Request) {
  const param = new URL(request.url).searchParams.get("session");
  if (param) {
    const user = await currentUser();
    const id = matchIdParam(param);
    const s = user && id ? await getSessionForHost(id, user) : null;
    if (!user || !s) return fail("Sin acceso a esta sesión.", 403);
    return json(await createTokenRequest(`host:${user.id}`, { [sessionChannel(s.id)]: ["subscribe"], [hostChannels(s.id)]: ["subscribe"] }));
  }
  const playerId = await brickPlayerId();
  const where = playerId ? await playerChannels(playerId) : null;
  if (!playerId || !where) return fail("No estás en ninguna sesión.", 401);
  const clientId = `b:${createHash("sha256").update(playerId).digest("hex").slice(0, 16)}`;
  return json(
    await createTokenRequest(clientId, {
      [sessionChannel(where.sessionId)]: ["subscribe"],
      [teamChannel(where.sessionId, where.teamId)]: ["subscribe"],
    }),
  );
}
