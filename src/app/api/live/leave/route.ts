import { clearPlayerCookie, fail, json, sameOrigin } from "@/lib/live-http";

/** Sale en este dispositivo. El jugador sigue en la partida (y en los reportes). */
export async function POST(request: Request) {
  if (!sameOrigin(request)) return fail("Origen no permitido.", 403);
  await clearPlayerCookie();
  return json({ ok: true });
}
