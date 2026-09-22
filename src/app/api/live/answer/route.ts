import { submitAnswer } from "@/lib/live-match";
import { fail, json, playerIdFromCookie, readJson, sameOrigin } from "@/lib/live-http";

export async function POST(request: Request) {
  // El reloj se toma antes de cualquier I/O: la latencia del servidor no resta puntos.
  const now = Date.now();
  if (!sameOrigin(request)) return fail("Origen no permitido.", 403);
  const playerId = await playerIdFromCookie();
  if (!playerId) return fail("No estás en ninguna partida.", 401);

  const res = await submitAnswer(playerId, await readJson(request), now);
  return res.ok ? json({ ok: true }) : fail(res.error, res.status);
}
