// Prueba de carga del módulo en vivo: un host y N jugadores (bots) juegan una partida
// completa contra /api/live/* y Ably, y se miden latencias y consistencia.
//
//   node --env-file=.env.local scripts/live-load.mjs            (100 jugadores, juego 1)
//   N=50 GAME=3 node --env-file=.env.local scripts/live-load.mjs
//
// Contra un preview de Vercel (base `antidoto-preview`, nunca la de producción). Primero
// .env.local (trae el VERCEL_OIDC_TOKEN que deja `vercel link`) y después el de preview,
// que pisa las credenciales de Turso:
//   BASE=https://<preview>.vercel.app CHANNEL_ENV=preview \
//   node --env-file=.env.local --env-file=<env de preview> scripts/live-load.mjs
//
// Solo contra la base local (turso dev) o la de preview: crea una sesión temporal del
// primer superadmin y la borra al terminar, junto con la partida de prueba.
// Consume mensajes reales de Ably: una corrida de 100 jugadores usa ~1.300 (plan gratis: 6 M/mes).

import { createHash, randomBytes } from "node:crypto";
import * as Ably from "ably";
import { createClient } from "@libsql/client";

const BASE = process.env.BASE ?? "http://localhost:3000";
const N = Number(process.env.N ?? 100);
const GAME_ID = Number(process.env.GAME ?? 1);
// Mismo prefijo que matchChannel/hostChannel en src/lib/live-protocol.ts.
const CHANNEL_ENV = process.env.CHANNEL_ENV ?? "local";
// Previews protegidos: el token OIDC de desarrollo del proyecto vinculado los abre sin
// crear un secreto permanente. En local no hace falta.
const OIDC = BASE.startsWith("http://localhost") ? undefined : process.env.VERCEL_OIDC_TOKEN;

if (!/127\.0\.0\.1|antidoto-preview/.test(process.env.TURSO_DATABASE_URL ?? "")) {
  console.error("Solo se corre contra la base local (127.0.0.1) o la de preview (antidoto-preview).");
  process.exit(1);
}
const db = createClient({ url: process.env.TURSO_DATABASE_URL, authToken: process.env.TURSO_AUTH_TOKEN });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const pct = (arr, q) => {
  const s = [...arr].sort((a, b) => a - b);
  return s.length ? s[Math.min(s.length - 1, Math.floor(q * s.length))] : NaN;
};
const summary = (arr) => `p50 ${pct(arr, 0.5)} ms · p95 ${pct(arr, 0.95)} ms · max ${pct(arr, 1)} ms`;

async function call(path, { cookie, body } = {}) {
  const headers = { "content-type": "application/json", origin: BASE };
  if (cookie) headers.cookie = cookie;
  if (OIDC) headers["x-vercel-trusted-oidc-idp-token"] = OIDC;
  const t0 = Date.now();
  const res = await fetch(BASE + path, { method: body ? "POST" : "GET", headers, body: body ? JSON.stringify(body) : undefined });
  const data = await res.json().catch(() => null);
  return { status: res.status, data, ms: Date.now() - t0, setCookie: res.headers.get("set-cookie") };
}

function realtime(cookie, query = "") {
  return new Ably.Realtime({
    authCallback: async (_p, cb) => {
      const r = await call(`/api/live/token${query}`, { cookie });
      if (r.status === 200) cb(null, r.data);
      else cb(new Error(`token ${r.status}`), null);
    },
  });
}

const token = randomBytes(32).toString("hex");
const tokenHash = createHash("sha256").update(token).digest("hex");
const admin = (await db.execute("SELECT id FROM admin_users WHERE role = 'super' ORDER BY id LIMIT 1")).rows[0];
await db.execute({
  sql: "INSERT INTO sessions (token_hash, admin_user_id, expires_at) VALUES (?, ?, ?)",
  args: [tokenHash, admin.id, new Date(Date.now() + 3600e3).toISOString()],
});
const host = `antidoto_session=${token}`;
const clients = [];
let matchId;
let failures = 0;
const check = (ok, label) => {
  if (!ok) failures++;
  console.log(`  ${ok ? "ok   " : "FALLO"} ${label}`);
};

try {
  // Los intentos fallidos de otras corridas no deben frenar esta.
  await db.execute("DELETE FROM rate_limit_hits WHERE key LIKE 'live-join-fail:%'");

  const created = await call("/api/live/matches", { cookie: host, body: { gameId: GAME_ID } });
  if (created.status !== 201) throw new Error(`crear partida: ${created.status} ${JSON.stringify(created.data)}`);
  matchId = created.data.matchId;
  const { pin } = created.data;
  console.log(`\nPartida ${matchId} (PIN ${pin}) con ${N} jugadores\n`);

  // --- Entrada: todos a la vez, como al proyectar el QR ---
  const joinMs = [];
  const players = await Promise.all(
    Array.from({ length: N }, async (_, i) => {
      const r = await call("/api/live/join", { body: { pin, nickname: `Jugador ${i}`, acceptedPolicy: true } });
      if (r.status !== 200) throw new Error(`join ${i}: ${r.status} ${JSON.stringify(r.data)}`);
      joinMs.push(r.ms);
      const cookie = r.setCookie.split(";")[0];
      const rt = realtime(cookie);
      clients.push(rt);
      const p = { i, cookie, events: [], received: 0 };
      await rt.channels.get(`live:${CHANNEL_ENV}:${matchId}`).subscribe((m) => {
        p.received++;
        p.events.push({ name: m.name, data: m.data, at: Date.now() });
      });
      return p;
    })
  );
  console.log(`Entrada (POST /join):        ${summary(joinMs)}`);

  const hostRt = realtime(host, `?match=${matchId}`);
  clients.push(hostRt);
  let hostMessages = 0;
  await hostRt.channels.get(`live:${CHANNEL_ENV}:${matchId}:host`).subscribe(() => hostMessages++);
  await hostRt.channels.get(`live:${CHANNEL_ENV}:${matchId}`).subscribe(() => hostMessages++);

  const cmd = (command) => call(`/api/live/host/${matchId}/command`, { cookie: host, body: { command } });
  const lastEvent = (p, name, position) => p.events.filter((e) => e.name === name && (position === undefined || e.data.position === position)).at(-1);
  const waitFor = async (pred, timeout = 30_000) => {
    const t0 = Date.now();
    while (!pred()) {
      if (Date.now() - t0 > timeout) return false;
      await sleep(50);
    }
    return true;
  };

  const state = (await call(`/api/live/host/${matchId}`, { cookie: host })).data;
  check(state.nicknames.length === N, `el host ve ${N} jugadores (${state.nicknames.length})`);

  for (let position = 1; position <= state.totalQuestions; position++) {
    const res = await cmd(position === 1 ? "start" : "next");
    check(res.status === 200, `pregunta ${position}: el host la abre`);
    const got = await waitFor(() => players.every((p) => lastEvent(p, "question", position)));
    const q = lastEvent(players[0], "question", position)?.data;
    const delivery = players.map((p) => lastEvent(p, "question", position).at - lastEvent(p, "question", position).data.serverNow);
    check(got, `pregunta ${position} (${q?.type}) llegó a los ${N}: ${summary(delivery)}`);

    // Esperar a que termine la intro (si la hay) y responder con demoras al azar.
    await sleep(Math.max(0, q.startedAt - q.serverNow));
    const answerMs = [];
    const results = await Promise.all(
      players.map(async (p) => {
        await sleep(Math.random() * 3000);
        const body = q.type === "nube" ? { position, text: ["calma", "foco", "energía"][p.i % 3] } : { position, optionIndex: p.i % q.options.length };
        const r = await call("/api/live/answer", { cookie: p.cookie, body });
        answerMs.push(r.ms);
        return r;
      })
    );
    const lastAnswerAt = Date.now();
    const accepted = results.filter((r) => r.status === 200).length;
    check(accepted === N, `respuestas aceptadas ${accepted}/${N} (POST /answer: ${summary(answerMs)})`);
    const revealed = await waitFor(() => players.every((p) => lastEvent(p, "reveal", position)));
    const reveal = lastEvent(players[0], "reveal", position)?.data;
    check(revealed && reveal.answered === N, `se cerró sola al responder todos: reveal a los ${N} en ${Date.now() - lastAnswerAt} ms (contó ${reveal?.answered})`);
    const reveals = players[0].events.filter((e) => e.name === "reveal" && e.data.position === position).length;
    check(reveals === 1, `el reveal se publicó una sola vez (${reveals})`);
  }

  await cmd("next");
  const finished = await waitFor(() => players.every((p) => lastEvent(p, "finished")));
  const entries = lastEvent(players[0], "finished")?.data.entries ?? [];
  check(finished && entries.length === N, `podio final a los ${N} con ${entries.length} entradas`);

  const playerMessages = players.reduce((s, p) => s + p.received, 0);
  console.log(`\nMensajes de Ably recibidos: ${playerMessages + hostMessages} (jugadores ${playerMessages}, host ${hostMessages})`);
} catch (e) {
  failures++;
  console.error("\nFALLO inesperado:", e);
} finally {
  clients.forEach((c) => c.close());
  await db.execute({ sql: "DELETE FROM sessions WHERE token_hash = ?", args: [tokenHash] });
  if (matchId) await db.execute({ sql: "DELETE FROM live_matches WHERE id = ?", args: [matchId] });
  console.log(failures ? `\n${failures} fallos` : "\nSin fallos");
  process.exit(failures ? 1 : 0);
}
