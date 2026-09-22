import { joinMatch } from "@/lib/live-match";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { fail, json, playerIdFromCookie, readJson, sameOrigin, setPlayerCookie } from "@/lib/live-http";

export async function POST(request: Request) {
  if (!sameOrigin(request)) return fail("Origen no permitido.", 403);

  // Los PIN son cortos: sin límite serían adivinables por fuerza bruta.
  const ip = await clientIp();
  if (!(await rateLimit(`live-join:${ip}`, 20, 60))) {
    return fail("Demasiados intentos. Espera un minuto y vuelve a intentarlo.", 429);
  }

  const body = await readJson(request);
  const res = await joinMatch({
    pin: String(body.pin ?? ""),
    nickname: String(body.nickname ?? ""),
    acceptedPolicy: body.acceptedPolicy === true,
    currentPlayerId: await playerIdFromCookie(),
  });
  if (!res.ok) return fail(res.error, res.status);

  await setPlayerCookie(res.playerId);
  return json({ matchId: res.matchId, nickname: res.nickname });
}
