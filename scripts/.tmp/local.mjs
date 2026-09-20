import { createClient } from "@libsql/client";
const c = createClient({ url: process.env.TURSO_DATABASE_URL });
console.log("columnas:", (await c.execute("SELECT name FROM pragma_table_info('admin_users')")).rows.map(r => r.name).join(", "));
const r = await c.execute("SELECT id, username, role, created_at FROM admin_users");
for (const row of r.rows) console.log(`id=${row.id} username=${row.username} role=${row.role} creado=${row.created_at}`);
console.log("misiones:", (await c.execute("SELECT COUNT(*) AS n FROM missions")).rows[0].n);
