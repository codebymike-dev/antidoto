import "server-only";
import { headers } from "next/headers";
import { one, run } from "./db";

/** IP del cliente según el proxy de Vercel; "unknown" en local sin proxy. */
export async function clientIp(): Promise<string> {
  const h = await headers();
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "unknown";
}

// Cada key vencida se borra sola en su propia llamada, pero una key que solo se
// consulta una vez (una IP que no vuelve) nunca vuelve a limpiarse. Por eso, con
// baja probabilidad, se poda toda la tabla de filas viejas de cualquier key.
const GLOBAL_CLEANUP_CHANCE = 0.01;
const GLOBAL_CLEANUP_AGE_SECONDS = 3600;

/**
 * true si `key` no ha superado `limit` intentos en los últimos `windowSeconds`.
 * Cada llamada cuenta como un intento (se registra siempre, incluso si se niega).
 */
export async function rateLimit(key: string, limit: number, windowSeconds: number): Promise<boolean> {
  const windowStart = new Date(Date.now() - windowSeconds * 1000).toISOString();

  await run("DELETE FROM rate_limit_hits WHERE key = ? AND created_at < ?", [key, windowStart]);
  const row = await one<{ hits: number }>(
    "SELECT COUNT(*) AS hits FROM rate_limit_hits WHERE key = ? AND created_at >= ?",
    [key, windowStart]
  );
  await run("INSERT INTO rate_limit_hits (key) VALUES (?)", [key]);

  if (Math.random() < GLOBAL_CLEANUP_CHANCE) {
    const staleBefore = new Date(Date.now() - GLOBAL_CLEANUP_AGE_SECONDS * 1000).toISOString();
    await run("DELETE FROM rate_limit_hits WHERE created_at < ?", [staleBefore]);
  }

  return (row?.hits ?? 0) < limit;
}
