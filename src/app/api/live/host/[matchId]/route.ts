import { hostSnapshot } from "@/lib/live-match";
import { fail, json, matchIdParam, requireHost } from "@/lib/live-http";

/** Foto completa de la partida para la pantalla del host (al entrar o al reconectar). */
export async function GET(request: Request, ctx: RouteContext<"/api/live/host/[matchId]">) {
  const user = await requireHost(request);
  if (user instanceof Response) return user;
  const matchId = matchIdParam((await ctx.params).matchId);
  if (!matchId) return fail("Partida inválida.", 404);
  const res = await hostSnapshot(matchId, user);
  return res.ok ? json(res.snapshot) : fail(res.error, res.status);
}
