import { readFile } from "node:fs/promises";
import { createClient } from "@libsql/client";

const url = process.env.TURSO_DATABASE_URL;
const authToken = process.env.TURSO_AUTH_TOKEN;

if (!url) {
  console.error("Falta TURSO_DATABASE_URL. Crea .env.local a partir de .env.example.");
  process.exit(1);
}

const client = createClient({ url, authToken });
const sql = await readFile(new URL("../db/schema.sql", import.meta.url), "utf8");

await client.executeMultiple(sql);

const tables = await client.execute(
  "SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name"
);

console.log("Migración aplicada. Tablas:");
for (const row of tables.rows) console.log("  -", row.name);
