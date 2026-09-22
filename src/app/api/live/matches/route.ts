import { createMatch } from "@/lib/live-match";
import { fail, json, readJson, requireHost } from "@/lib/live-http";

/** Crea una partida de un juego y devuelve su PIN. */
export async function POST(request: Request) {
  const user = await requireHost(request);
  if (user instanceof Response) return user;
  const body = await readJson(request);
  const res = await createMatch(user, Number(body.gameId));
  return res.ok ? json({ matchId: res.matchId, pin: res.pin }, 201) : fail(res.error, res.status);
}
