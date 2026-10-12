import { playerSnapshot } from "@/lib/brick-session";
import { brickPlayerId } from "@/lib/brick-http";
import { fail, json } from "@/lib/live-http";

/** Foto completa del jugador: al entrar, al reconectar y cuando falta un lote. */
export async function GET() {
  const playerId = await brickPlayerId();
  if (!playerId) return fail("No estás en ninguna sesión.", 401);
  const res = await playerSnapshot(playerId);
  return res.ok ? json(res.view) : fail(res.error, res.status);
}
