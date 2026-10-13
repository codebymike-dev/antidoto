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

// Códigos cortos: los de antes (MI-JUAN-SJAN3E) quedan en su último tramo (SJAN3E), que
// es el mismo código. Si dos códigos comparten ese tramo, se dejan largos; uno hecho a
// mano que no termina en 6 caracteres tampoco se toca. Los enlaces y
// códigos largos ya repartidos siguen entrando (src/lib/codes.ts).
const shortened = await client.execute(`
  UPDATE activity_codes SET code = SUBSTR(code, -6)
  WHERE SUBSTR(code, -7, 1) = '-'
    AND NOT EXISTS (
      SELECT 1 FROM activity_codes o
      WHERE o.id <> activity_codes.id
        AND (o.code = SUBSTR(activity_codes.code, -6)
          OR (SUBSTR(o.code, -7, 1) = '-' AND SUBSTR(o.code, -6) = SUBSTR(activity_codes.code, -6)))
    )`);
if (shortened.rowsAffected) console.log(`Códigos acortados: ${shortened.rowsAffected}.`);

const tables = await client.execute(
  "SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name"
);

console.log("Migración aplicada. Tablas:");
for (const row of tables.rows) console.log("  -", row.name);
