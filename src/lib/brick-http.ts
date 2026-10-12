import "server-only";
import { cookies } from "next/headers";

// Cookie del jugador de la construcción en equipo. Aparte de la del quiz en vivo: alguien puede
// estar en las dos cosas el mismo día con el mismo celular.

export const BRICK_PLAYER_COOKIE = "antidoto_brick_player";

export async function brickPlayerId(): Promise<string | null> {
  const value = (await cookies()).get(BRICK_PLAYER_COOKIE)?.value;
  return value && /^[0-9a-f]{32}$/.test(value) ? value : null;
}

export async function setBrickPlayer(playerId: string) {
  (await cookies()).set(BRICK_PLAYER_COOKIE, playerId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 12,
  });
}

export async function clearBrickPlayer() {
  (await cookies()).delete(BRICK_PLAYER_COOKIE);
}
