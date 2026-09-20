import { createClient } from "@libsql/client";
const c = createClient({ url: process.env.TURSO_DATABASE_URL });
const cols = (await c.execute("SELECT name FROM pragma_table_info('admin_users')")).rows.map(r => r.name);
console.log("columnas:", cols.join(", "));
const n = await c.execute("SELECT COUNT(*) AS n FROM admin_users");
console.log("filas admin_users:", n.rows[0].n);
