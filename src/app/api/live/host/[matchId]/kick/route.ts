import { kickPlayer } from "@/lib/live-match";
import { fail, json, matchIdParam, readJson, requireHost } from "@/lib/live-http";

export async function POST(request: Request, ctx: RouteContext<"/api/live/host/[matchId]/kick">) {
  const user = await requireHost(request);
  if (user instanceof Response) return user;
  const matchId = matchIdParam((await ctx.params).matchId);
  if (!matchId) return fail("Partida inválida.", 404);

  const { nickname } = await readJson(request);
  if (typeof nickname !== "string" || !nickname) return fail("Falta el apodo.");
  const res = await kickPlayer(matchId, user, nickname);
  return res.ok ? json({ ok: true }) : fail(res.error, res.status);
}
