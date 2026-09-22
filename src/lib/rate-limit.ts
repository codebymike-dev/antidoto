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

/** Solo lectura: true si `key` ya acumuló `limit` intentos en los últimos `windowSeconds`. */
export async function isLimited(key: string, limit: number, windowSeconds: number): Promise<boolean> {
  // La ventana se calcula en SQLite y no con toISOString(): created_at se guarda como
  // "YYYY-MM-DD HH:MM:SS" y, comparado como texto contra "YYYY-MM-DDTHH:MM:SSZ", el
  // espacio siempre queda antes que la "T" (nunca contaba intentos y borraba todos).
  const windowStart = `-${windowSeconds} seconds`;
  await run("DELETE FROM rate_limit_hits WHERE key = ? AND created_at < datetime('now', ?)", [key, windowStart]);
  const row = await one<{ hits: number }>(
    "SELECT COUNT(*) AS hits FROM rate_limit_hits WHERE key = ? AND created_at >= datetime('now', ?)",
    [key, windowStart]
  );
  return (row?.hits ?? 0) >= limit;
}

/** Registra un intento para `key`. */
export async function recordHit(key: string): Promise<void> {
  await run("INSERT INTO rate_limit_hits (key) VALUES (?)", [key]);
  if (Math.random() < GLOBAL_CLEANUP_CHANCE) {
    await run("DELETE FROM rate_limit_hits WHERE created_at < datetime('now', ?)", [
      `-${GLOBAL_CLEANUP_AGE_SECONDS} seconds`,
    ]);
  }
}

/**
 * true si `key` no ha superado `limit` intentos en los últimos `windowSeconds`.
 * Cada llamada cuenta como un intento (se registra siempre, incluso si se niega).
 * Donde muchas personas legítimas comparten IP (un evento en la oficina), mejor
 * contar solo los fallos con isLimited + recordHit.
 */
export async function rateLimit(key: string, limit: number, windowSeconds: number): Promise<boolean> {
  const limited = await isLimited(key, limit, windowSeconds);
  await recordHit(key);
  return !limited;
}
