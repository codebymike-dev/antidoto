import { test } from "node:test";
import assert from "node:assert/strict";
import { applyHostEvent, applyPublicEvent, remainingMs } from "./live-client-state.ts";
import type { HostSnapshot, PlayerSnapshot, PublicQuestion } from "./live-protocol.ts";

const question = (position: number): PublicQuestion => ({
  position,
  total: 3,
  type: "quiz",
  prompt: "¿?",
  options: ["a", "b"],
  timeLimitMs: 20_000,
  startedAt: 1_000,
  endsAt: 21_000,
  pausedRemainingMs: null,
});

const host = (): HostSnapshot => ({
  matchId: 1,
  status: "lobby",
  joinLocked: false,
  gameTitle: "Juego",
  totalQuestions: 3,
  question: null,
  reveal: null,
  entries: [],
  serverNow: 0,
  gameId: 1,
  pin: "123456",
  nicknames: ["Ana", "Beto"],
  answered: 0,
});

const entry = (nickname: string) => ({ nickname, rank: 1, score: 0, correct: 0, lastPoints: 0, movement: 0, streak: 0 });

test("pregunta nueva conserva el ranking acumulado", () => {
  const s = applyPublicEvent({ ...host(), entries: [entry("Ana")] }, { name: "question", data: { ...question(2), serverNow: 0 } });
  assert.deepEqual(s.entries.map((e) => e.nickname), ["Ana"]);
});

test("pregunta nueva: limpia el reveal y el contador", () => {
  let s = { ...host(), answered: 5, reveal: { position: 1, correct: [], distribution: [], words: [], answered: 5, entries: [] } };
  s = applyPublicEvent(s, { name: "question", data: { ...question(2), serverNow: 9 } });
  assert.equal(s.status, "question");
  assert.equal(s.question?.position, 2);
  assert.equal(s.reveal, null);
  assert.equal(s.answered, 0);
  assert.equal(s.serverNow, 9);
  assert.ok(!("serverNow" in s.question!));
});

test("pausa y reanudación solo afectan a la pregunta indicada", () => {
  let s = applyPublicEvent(host(), { name: "question", data: { ...question(1), serverNow: 0 } });
  assert.equal(applyPublicEvent(s, { name: "paused", data: { position: 2, remainingMs: 5 } }), s);
  s = applyPublicEvent(s, { name: "paused", data: { position: 1, remainingMs: 7_000 } });
  assert.equal(s.question?.pausedRemainingMs, 7_000);
  assert.equal(remainingMs(s.question, 0, 999_999), 7_000);
  s = applyPublicEvent(s, { name: "resumed", data: { position: 1, startedAt: 50_000, endsAt: 70_000, serverNow: 63_000 } });
  assert.equal(s.question?.pausedRemainingMs, null);
  assert.equal(remainingMs(s.question, 0, 63_000), 7_000);
});

test("un reveal de otra pregunta (atrasado) se ignora", () => {
  const s = applyPublicEvent(host(), { name: "question", data: { ...question(2), serverNow: 0 } });
  const stale = applyPublicEvent(s, { name: "reveal", data: { position: 1, correct: [0], distribution: [1, 0], words: [], answered: 1, entries: [] } });
  assert.equal(stale.status, "question");
});

test("reveal, ranking y final", () => {
  let s = applyPublicEvent(host(), { name: "question", data: { ...question(1), serverNow: 0 } });
  s = applyPublicEvent(s, { name: "reveal", data: { position: 1, correct: [0], distribution: [1, 1], words: [], answered: 2, entries: [entry("Ana")] } });
  assert.equal(s.status, "reveal");
  assert.equal(s.entries.length, 1);
  s = applyPublicEvent(s, { name: "leaderboard", data: { position: 1, entries: [entry("Beto"), entry("Ana")] } });
  assert.equal(s.status, "leaderboard");
  s = applyPublicEvent(s, { name: "finished", data: { entries: [entry("Ana")] } });
  assert.equal(s.status, "finished");
  assert.equal(s.question, null);
});

test("expulsión: sale de la lista del host y el jugador expulsado queda marcado", () => {
  const s = applyPublicEvent({ ...host(), entries: [entry("Ana"), entry("Beto")] }, { name: "kicked", data: { nickname: "Ana" } });
  assert.deepEqual(s.nicknames, ["Beto"]);
  assert.deepEqual(s.entries.map((e) => e.nickname), ["Beto"]);

  const player: PlayerSnapshot = { ...host(), nickname: "Ana", kicked: false, myAnswer: { optionIndex: 1, text: null } };
  const me = applyPublicEvent(player, { name: "kicked", data: { nickname: "Ana" } });
  assert.equal(me.kicked, true);
  assert.equal(applyPublicEvent(player, { name: "kicked", data: { nickname: "Beto" } }).kicked, false);
});

test("pregunta nueva borra la respuesta anterior del jugador", () => {
  const player: PlayerSnapshot = { ...host(), nickname: "Ana", kicked: false, myAnswer: { optionIndex: 1, text: null } };
  const s = applyPublicEvent(player, { name: "question", data: { ...question(2), serverNow: 0 } });
  assert.equal(s.myAnswer, null);
});

test("eventos del host: jugadores y contador de la pregunta actual", () => {
  let s = applyHostEvent(host(), { name: "players", data: { nicknames: ["Ana"], joinLocked: true } });
  assert.deepEqual([s.nicknames, s.joinLocked], [["Ana"], true]);
  s = applyPublicEvent(s, { name: "question", data: { ...question(1), serverNow: 0 } });
  s = applyHostEvent(s, { name: "answers", data: { position: 1, answered: 3, players: 4 } });
  assert.equal(s.answered, 3);
  assert.equal(applyHostEvent(s, { name: "answers", data: { position: 2, answered: 9, players: 4 } }).answered, 3);
});

test("el tiempo restante usa el reloj del servidor y no baja de cero", () => {
  assert.equal(remainingMs(question(1), 0, 11_000), 10_000);
  assert.equal(remainingMs(question(1), 5_000, 11_000), 5_000);
  assert.equal(remainingMs(question(1), 0, 99_000), 0);
  assert.equal(remainingMs(null, 0), 0);
});
