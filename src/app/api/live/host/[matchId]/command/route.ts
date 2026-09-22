import { hostCommand } from "@/lib/live-match";
import type { HostCommand } from "@/lib/live-engine";
import { fail, json, matchIdParam, readJson, requireHost } from "@/lib/live-http";

const COMMANDS: HostCommand[] = ["start", "endQuestion", "showLeaderboard", "next", "pause", "resume", "lockJoin", "unlockJoin", "finish"];

export async function POST(request: Request, ctx: RouteContext<"/api/live/host/[matchId]/command">) {
  const user = await requireHost(request);
  if (user instanceof Response) return user;
  const matchId = matchIdParam((await ctx.params).matchId);
  if (!matchId) return fail("Partida inválida.", 404);

  const { command } = await readJson(request);
  if (!COMMANDS.includes(command as HostCommand)) return fail("Comando desconocido.");
  const res = await hostCommand(matchId, user, command as HostCommand);
  return res.ok ? json({ ok: true }) : fail(res.error, res.status);
}
