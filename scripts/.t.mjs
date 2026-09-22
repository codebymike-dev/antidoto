import { createClient } from "@libsql/client/web";
const c = createClient({ url: process.env.TURSO_DATABASE_URL, authToken: process.env.TURSO_AUTH_TOKEN });
const [cmd, ...a] = process.argv.slice(2);
if (cmd === "expire") await c.execute({ sql: "UPDATE live_challenges SET closes_at = datetime('now', '-1 minute') WHERE match_id = ?", args: [a[0]] });
if (cmd === "live") {
  const pin = String(100000 + Math.floor(Math.random() * 900000));
  const r = await c.execute({ sql: "INSERT INTO live_matches (game_id, host_user_id, company_id, pin) VALUES (5, 1, 3, ?)", args: [pin] });
  console.log(pin, Number(r.lastInsertRowid));
}
if (cmd === "status") console.log((await c.execute({ sql: "SELECT status, finished_at FROM live_matches WHERE id = ?", args: [a[0]] })).rows);
