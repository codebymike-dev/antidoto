import "server-only";
// Subpath "web": cliente HTTP en JS puro. El import por defecto arrastra ~19 MB de
// binarios nativos que solo sirven para bases embebidas y no hacen falta contra Turso.
// En local se usa `turso dev`, que habla el mismo protocolo HTTP.
import { createClient, type Client, type InValue } from "@libsql/client/web";

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
