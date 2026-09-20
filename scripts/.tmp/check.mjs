import { createClient } from "@libsql/client";
const c = createClient({ url: process.env.TURSO_DATABASE_URL, authToken: process.env.TURSO_AUTH_TOKEN });
for (const t of ["admin_users", "sessions"]) {
  const n = await c.execute(`SELECT COUNT(*) AS n FROM ${t}`);
  console.log(t, "filas:", n.rows[0].n);
}
const cols = await c.execute("SELECT name FROM pragma_table_info('admin_users')");
console.log("columnas admin_users:", cols.rows.map(r => r.name).join(", "));
