import "server-only";
import * as Ably from "ably";

// Ably solo reparte eventos: el servidor es el único que publica. Los clientes
// reciben tokens de solo lectura y mandan sus acciones por Server Actions, así
// cada respuesta pasa por validación y por el reloj del servidor.

let rest: Ably.Rest | undefined;

function client(): Ably.Rest {
  if (!rest) {
    const key = process.env.ABLY_API_KEY;
    if (!key) throw new Error("Falta ABLY_API_KEY");
    rest = new Ably.Rest({ key });
  }
  return rest;
}

export async function publish(channel: string, name: string, data: unknown): Promise<void> {
  await client().channels.get(channel).publish(name, data);
}

/** Canal → operaciones permitidas. Nunca incluir "publish" para clientes. */
export type Capability = Record<string, ("subscribe" | "presence" | "history")[]>;

export async function createTokenRequest(clientId: string, capability: Capability) {
  return client().auth.createTokenRequest({
    clientId,
    capability: JSON.stringify(capability),
    ttl: 60 * 60 * 1000,
  });
}
