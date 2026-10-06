import { createClient } from "@libsql/client";
import { readFileSync } from "node:fs";
import { chromium } from "/home/mike/.npm/_npx/5e2e484947874241/node_modules/playwright/index.mjs";
const BASE = "http://localhost:3000";
const db = createClient({ url: process.env.TURSO_DATABASE_URL, authToken: process.env.TURSO_AUTH_TOKEN });
const q1 = (sql, args = []) => db.execute({ sql, args }).then((r) => r.rows[0]);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const log = (...a) => console.log(...a);
const gameId = Number((await db.execute("INSERT INTO live_games (title, created_by) VALUES ('Prueba UX en vivo', 1)")).lastInsertRowid);
const qid = Number((await db.execute({ sql: "INSERT INTO live_questions (game_id, position, type, prompt, time_limit) VALUES (?, 1, 'quiz', 'Pregunta 1', 60)", args: [gameId] })).lastInsertRowid);
for (const [i, t] of ["Sí", "No"].entries()) await db.execute({ sql: "INSERT INTO live_options (question_id, position, text, is_correct) VALUES (?, ?, ?, ?)", args: [qid, i + 1, t, i === 0 ? 1 : 0] });
const pin = String(Math.floor(100000 + Math.random() * 900000));
const matchId = Number((await db.execute({ sql: "INSERT INTO live_matches (game_id, host_user_id, company_id, pin) VALUES (?, 1, NULL, ?)", args: [gameId, pin] })).lastInsertRowid);
const browser = await chromium.launch();
try {
  const player = await browser.newContext();
  await player.request.post(`${BASE}/api/live/join`, { headers: { origin: BASE }, data: { pin, nickname: "Tester", acceptedPolicy: true } });
  const host = await browser.newContext({ storageState: JSON.parse(readFileSync(".claude-tmp/lab/auth.json", "utf8")), viewport: { width: 1280, height: 800 } });
  await host.request.post(`${BASE}/api/live/host/${matchId}/command`, { headers: { origin: BASE }, data: { command: "start" } });
  const ap = await host.newPage();
  ap.on("console", (m) => m.type() === "error" && !m.text().includes("eval") && log("console:", m.text().slice(0, 300)));
  ap.on("pageerror", (e) => log("pageerror:", e.message.slice(0, 300)));
  await ap.goto(`${BASE}/admin/vivo/${matchId}`, { waitUntil: "networkidle" });
  const btn = ap.getByRole("button", { name: /jugadores/ });
  await btn.click();
  await sleep(800);
  log("aria-expanded:", await btn.getAttribute("aria-expanded"), "| dialogs:", await ap.getByRole("dialog").count());
  await ap.screenshot({ path: "/tmp/live3-kick.png" });
  await ap.getByRole("dialog").getByRole("button", { name: "Tester" }).click();
  await ap.getByRole("dialog").getByRole("button", { name: "¿Sacar a Tester?" }).click();
  await sleep(2000);
  log("expulsado:", (await q1("SELECT kicked_at IS NOT NULL k FROM live_players WHERE match_id = ?", [matchId])).k, "| texto:", (await ap.getByRole("dialog").innerText()).replace(/\s+/g, " "));
} finally {
  await browser.close();
  await db.execute({ sql: "DELETE FROM live_matches WHERE id = ?", args: [matchId] });
  await db.execute({ sql: "DELETE FROM live_games WHERE id = ?", args: [gameId] });
}
