import { snapshotForPlayer } from "@/lib/live-challenge";
import { fail, json, playerIdFromCookie } from "@/lib/live-http";

/** Foto de la partida o del desafío para el celular del jugador (al entrar o al reconectar). */
export async function GET() {
  const playerId = await playerIdFromCookie();
  if (!playerId) return fail("No estás en ninguna partida.", 401);
  const res = await snapshotForPlayer(playerId);
  return res.ok ? json(res.snapshot) : fail(res.error, res.status);
}
