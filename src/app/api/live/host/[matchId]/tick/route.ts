import { hostTick } from "@/lib/live-match";
import { fail, json, matchIdParam, requireHost } from "@/lib/live-http";

/**
 * No hay un proceso vivo durante la partida: la pantalla del host avisa cuando su
 * reloj llega al final y el servidor decide con el suyo si corresponde cerrar.
 */
export async function POST(request: Request, ctx: RouteContext<"/api/live/host/[matchId]/tick">) {
  const user = await requireHost(request);
  if (user instanceof Response) return user;
  const matchId = matchIdParam((await ctx.params).matchId);
  if (!matchId) return fail("Partida inválida.", 404);
  const res = await hostTick(matchId, user);
  return res.ok ? json({ ok: true }) : fail(res.error, res.status);
}
