import { createClient } from "@libsql/client";
import { readFileSync } from "node:fs";
import { chromium } from "/home/mike/.npm/_npx/5e2e484947874241/node_modules/playwright/index.mjs";
const BASE = "http://localhost:3000";
const db = createClient({ url: process.env.TURSO_DATABASE_URL, authToken: process.env.TURSO_AUTH_TOKEN });
const log = (...a) => console.log(...a);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const ac = (await db.execute("SELECT ac.id, ac.code, ac.company_id, ac.estado FROM activity_codes ac WHERE NOT EXISTS (SELECT 1 FROM activity_code_archive x WHERE x.activity_code_id = ac.id) LIMIT 1")).rows[0];
const browser = await chromium.launch();
try {
  const admin = await browser.newContext({ storageState: JSON.parse(readFileSync(".claude-tmp/lab/auth.json", "utf8")), viewport: { width: 1280, height: 900 }, permissions: ["clipboard-read", "clipboard-write"] });
  const ap = await admin.newPage();
  await ap.goto(`${BASE}/admin/empresas/${ac.company_id}`, { timeout: 90000 });
  log("admin en:", new URL(ap.url()).pathname);
  await sleep(3000);
  await ap.getByRole("button", { name: "Compartir" }).click();
  const link = await ap.locator("code").first().innerText();
  log("enlace:", link);
  await ap.getByRole("button", { name: "Copiar mensaje" }).click();
  log("mensaje copiado:\n" + (await ap.evaluate(() => navigator.clipboard.readText())));
  log("wa.me:", (await ap.getByRole("link", { name: "Enviar por WhatsApp" }).getAttribute("href")).slice(0, 60) + "…");
  await ap.getByRole("button", { name: "Ocultar" }).scrollIntoViewIfNeeded();
  await ap.screenshot({ path: "/tmp/share4-admin.png" });

  const phone = await browser.newContext({ viewport: { width: 390, height: 800 } });
  const pp = await phone.newPage();
  await pp.goto(link, { timeout: 90000 });
  await sleep(2000);
  log("celular: código puesto =", await pp.locator("#code").inputValue(), "| foco en:", await pp.evaluate(() => document.activeElement?.id));
  await pp.screenshot({ path: "/tmp/share4-phone.png" });

  const pid = "uxtest-share";
  await db.execute({ sql: "INSERT INTO participations (id, activity_code_id, participant_name, accepted_policy_at) VALUES (?, ?, 'Prueba Share', datetime('now'))", args: [pid, ac.id] });
  await phone.addCookies([{ name: "antidoto_participacion", value: pid, url: BASE }]);
  await pp.goto(link);
  log("con sesión del mismo código ->", new URL(pp.url()).pathname);
  await pp.goto(`${BASE}/?codigo=zz-otra-1234`);
  log("con sesión y otro código ->", new URL(pp.url()).pathname, "| código puesto =", await pp.locator("#code").inputValue());
  await pp.goto(`${BASE}/?codigo=%3Cscript%3E`);
  log("código con forma inválida ->", new URL(pp.url()).pathname);
} finally {
  await browser.close();
  await db.execute({ sql: "DELETE FROM participations WHERE id = ?", args: ["uxtest-share"] });
  log("limpieza hecha");
}
