import { createClient } from "@libsql/client";
const c = createClient({ url: process.env.TURSO_DATABASE_URL, authToken: process.env.TURSO_AUTH_TOKEN });
const mode = process.argv[2];
const co = (await c.execute("SELECT id, name FROM companies ORDER BY id LIMIT 1")).rows[0];
if (!co) { console.log("sin empresas"); process.exit(0); }
if (mode === "add") {
  const svg = new TextEncoder().encode('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><rect width="10" height="10" fill="#E30613"/></svg>');
  await c.execute({ sql: "INSERT INTO company_branding (company_id, primary_color, logo, logo_mime, logo_version) VALUES (?, '#E30613', ?, 'image/svg+xml', 'test123')", args: [co.id, svg] });
  console.log(String(co.id));
} else {
  await c.execute({ sql: "DELETE FROM company_branding WHERE company_id = ? AND logo_version = 'test123'", args: [co.id] });
  console.log("borrado", String(co.id));
}
