import { joinSession } from "@/lib/brick-session";
import { brickPlayerId, setBrickPlayer } from "@/lib/brick-http";
import { clientIp, isLimited, recordHit } from "@/lib/rate-limit";
import { fail, json, readJson, sameOrigin } from "@/lib/live-http";
import { BRICKS_VISIBLE } from "@/lib/bricks/visible";

export async function POST(request: Request) {
  if (!sameOrigin(request)) return fail("Origen no permitido.", 403);
  if (!BRICKS_VISIBLE) return fail("Esta actividad no está disponible por ahora.", 404);
  // Igual que en el quiz: se cuentan solo los PIN inexistentes (en un evento todos salen por la misma IP).
  const failKey = `brick-join-fail:${await clientIp()}`;
  if (await isLimited(failKey, 15, 60)) return fail("Demasiados intentos. Espera un minuto y vuelve a intentarlo.", 429);

  const body = await readJson(request);
  const res = await joinSession({
    pin: String(body.pin ?? ""),
    nickname: String(body.nickname ?? ""),
    acceptedPolicy: body.acceptedPolicy === true,
    currentPlayerId: await brickPlayerId(),
  });
  if (!res.ok) {
    if (res.status === 404) await recordHit(failKey);
    return fail(res.error, res.status);
  }
  await setBrickPlayer(res.playerId);
  return json({ sessionId: res.sessionId });
}
