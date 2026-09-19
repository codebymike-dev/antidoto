import "server-only";
import { createClient, type Client, type InValue } from "@libsql/client";

let client: Client | undefined;

export function db(): Client {
  if (!client) {
    const url = process.env.TURSO_DATABASE_URL;
    const authToken = process.env.TURSO_AUTH_TOKEN;
    if (!url) throw new Error("Falta TURSO_DATABASE_URL");
    client = createClient({ url, authToken });
  }
  return client;
}

export async function all<T>(sql: string, args: InValue[] = []): Promise<T[]> {
  const result = await db().execute({ sql, args });
  return result.rows as unknown as T[];
}

export async function one<T>(sql: string, args: InValue[] = []): Promise<T | null> {
  const rows = await all<T>(sql, args);
  return rows[0] ?? null;
}

export async function run(sql: string, args: InValue[] = []) {
  return db().execute({ sql, args });
}
