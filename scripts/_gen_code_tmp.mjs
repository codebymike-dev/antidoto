import { createClient } from "@libsql/client";

const url = process.env.TURSO_DATABASE_URL;
const authToken = process.env.TURSO_AUTH_TOKEN;
const client = createClient({ url, authToken });

const companyName = "Empresa Demo";
const company = await client.execute({ sql: "SELECT id FROM companies WHERE name = ?", args: [companyName] });
if (!company.rows.length) {
  console.error("No existe la empresa", companyName);
  process.exit(1);
}
const companyId = company.rows[0].id;

const missions = await client.execute({ sql: "SELECT id, title FROM missions WHERE archived_at IS NULL" });
if (!missions.rows.length) {
  console.error("No hay misiones disponibles.");
  process.exit(1);
}
const mission = missions.rows[0];

const prefix = String(mission.title).replace(/[^A-Za-z]/g, "").slice(0, 2).toUpperCase();
const slug = companyName.split(/\s+/)[0].toUpperCase().slice(0, 6);
let code = "";
for (let attempt = 0; attempt < 10 && !code; attempt++) {
  const candidate = `${prefix}-${slug}${Math.floor(10 + Math.random() * 89)}`;
  const taken = await client.execute({ sql: "SELECT 1 FROM activity_codes WHERE code = ?", args: [candidate] });
  if (!taken.rows.length) code = candidate;
}
if (!code) {
  console.error("No se pudo generar un código único.");
  process.exit(1);
}

await client.execute({
  sql: `INSERT INTO activity_codes (code, mission_id, company_id, estado, expires_at)
        VALUES (?, ?, ?, 'activo', NULL)`,
  args: [code, mission.id, companyId],
});

await client.execute({
  sql: "INSERT INTO audit_log (text, admin_user_id, company_id) VALUES (?, NULL, ?)",
  args: [`Código ${code} generado para ${companyName} (${mission.title}).`, companyId],
});

console.log(`Código creado: ${code} (misión: ${mission.title}, empresa: ${companyName})`);
