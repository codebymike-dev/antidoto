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

// El plan gratis de Ably admite 50 mensajes por segundo por canal (error 42913). Con
// 100 jugadores entrando o respondiendo a la vez se supera, y una publicación fallida
// nunca debe convertir en error algo que ya quedó guardado en la base.
const isRateLimited = (e: unknown) => (e as { code?: number })?.code === 42913 || (e as { statusCode?: number })?.statusCode === 429;

/** Para eventos que no se pueden perder (pregunta, revelación, ranking): reintenta ante el límite. */
export async function publishReliable(channel: string, name: string, data: unknown): Promise<void> {
  for (let attempt = 0; ; attempt++) {
    try {
      return await publish(channel, name, data);
    } catch (e) {
      if (!isRateLimited(e) || attempt >= 3) {
        console.error(`[realtime] no se pudo publicar ${name} en ${channel}:`, e);
        return;
      }
      // La ventana del límite es de un segundo.
      await new Promise((r) => setTimeout(r, 400 * (attempt + 1)));
    }
  }
}

/** Para avisos que se pueden perder (contador, lista de jugadores): el host se resincroniza solo. */
export async function publishBestEffort(channel: string, name: string, data: unknown): Promise<void> {
  try {
    await publish(channel, name, data);
  } catch (e) {
    if (!isRateLimited(e)) console.error(`[realtime] no se pudo publicar ${name} en ${channel}:`, e);
  }
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
