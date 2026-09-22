import { playerSnapshot } from "@/lib/live-match";
import { fail, json, playerIdFromCookie } from "@/lib/live-http";

/** Foto de la partida para el celular del jugador (al entrar o al reconectar). */
export async function GET() {
  const playerId = await playerIdFromCookie();
  if (!playerId) return fail("No estás en ninguna partida.", 401);
  const res = await playerSnapshot(playerId);
  return res.ok ? json(res.snapshot) : fail(res.error, res.status);
}
