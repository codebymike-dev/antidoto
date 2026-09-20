import { createClient } from "@libsql/client";

const url = process.env.TURSO_DATABASE_URL;
const authToken = process.env.TURSO_AUTH_TOKEN;
const name = "Empresa Demo";

const client = createClient({ url, authToken });

const existing = await client.execute({ sql: "SELECT id FROM companies WHERE name = ?", args: [name] });
if (existing.rows.length) {
  console.log(`Ya existe "${name}" con id ${existing.rows[0].id}`);
  process.exit(0);
}

await client.execute({ sql: "INSERT INTO companies (name) VALUES (?)", args: [name] });
const created = await client.execute({ sql: "SELECT id FROM companies WHERE name = ?", args: [name] });
const companyId = created.rows[0].id;

await client.execute({
  sql: "INSERT INTO audit_log (text, admin_user_id, company_id) VALUES (?, NULL, ?)",
  args: [`Empresa "${name}" añadida.`, companyId],
});

console.log(`Empresa creada: "${name}" (id ${companyId})`);
