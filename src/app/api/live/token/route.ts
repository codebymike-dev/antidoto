import { randomBytes } from "node:crypto";
import { currentUser } from "@/lib/auth";
import { createTokenRequest } from "@/lib/realtime";
import { PROBE_CHANNEL } from "@/lib/live-probe";

// Fase 0: cualquiera puede escuchar el canal de prueba. En la Fase 4 este
// endpoint entrega permisos solo sobre el canal de la partida del jugador.
export async function GET() {
  const user = await currentUser();
  const clientId = user ? `host:${user.id}` : `anon:${randomBytes(8).toString("hex")}`;

  const tokenRequest = await createTokenRequest(clientId, {
    [PROBE_CHANNEL]: ["subscribe", "presence"],
  });

  return Response.json(tokenRequest, { headers: { "Cache-Control": "no-store" } });
}
