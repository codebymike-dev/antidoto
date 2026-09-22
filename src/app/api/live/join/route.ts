import { joinMatch } from "@/lib/live-match";
import { sqliteToMs } from "@/lib/live-challenge-engine";
import { clientIp, isLimited, recordHit } from "@/lib/rate-limit";
import { fail, json, playerIdFromCookie, readJson, sameOrigin, setPlayerCookie } from "@/lib/live-http";

export async function POST(request: Request) {
  if (!sameOrigin(request)) return fail("Origen no permitido.", 403);

  // Los PIN son cortos: sin límite serían adivinables por fuerza bruta. Se cuentan solo
  // los PIN inexistentes: en un evento, todos los celulares salen por la misma IP.
  const failKey = `live-join-fail:${await clientIp()}`;
  if (await isLimited(failKey, 15, 60)) {
    return fail("Demasiados intentos. Espera un minuto y vuelve a intentarlo.", 429);
  }

  const body = await readJson(request);
  const res = await joinMatch({
    pin: String(body.pin ?? ""),
    nickname: String(body.nickname ?? ""),
    acceptedPolicy: body.acceptedPolicy === true,
    currentPlayerId: await playerIdFromCookie(),
  });
  if (!res.ok) {
    if (res.status === 404) await recordHit(failKey);
    return fail(res.error, res.status);
  }

  // En un desafío la cookie es el único intento del celular: dura hasta una semana después
  // del cierre, para que al volver vea su resultado en vez de empezar con otro apodo.
  const maxAge = res.closesAt ? Math.round((sqliteToMs(res.closesAt) - Date.now()) / 1000) + 7 * 86_400 : undefined;
  await setPlayerCookie(res.playerId, maxAge);
  return json({ matchId: res.matchId, nickname: res.nickname });
}
