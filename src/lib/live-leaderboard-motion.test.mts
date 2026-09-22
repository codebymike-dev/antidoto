import { test } from "node:test";
import assert from "node:assert/strict";
import { leaderboardMotion } from "./live-leaderboard-motion.ts";

const e = (nickname: string, rank: number, score: number, lastPoints: number, movement: number) => ({
  nickname,
  rank,
  score,
  correct: 0,
  lastPoints,
  movement,
  streak: 0,
});

test("reconstruye puntaje y puesto anteriores", () => {
  const [ana] = leaderboardMotion([e("Ana", 1, 1900, 950, 2), e("Beto", 2, 1500, 0, -1), e("Caro", 3, 1200, 200, -1)]);
  assert.equal(ana.prevScore, 950);
  assert.equal(ana.prevRank, 3);
});

test("quien adelanta cambia de fila", () => {
  const rows = leaderboardMotion([e("Ana", 1, 1900, 950, 2), e("Beto", 2, 1500, 0, -1), e("Caro", 3, 1200, 200, -1)]);
  assert.deepEqual(
    rows.map((r) => [r.nickname, r.from, r.to]),
    [
      ["Ana", 2, 0],
      ["Beto", 0, 1],
      ["Caro", 1, 2],
    ]
  );
});

test("entra al top desde abajo y el desplazado sale", () => {
  const rows = leaderboardMotion(
    [e("Ana", 1, 3000, 0, 0), e("Eva", 2, 2500, 1000, 2), e("Beto", 3, 2000, 0, -1), e("Caro", 4, 1500, 0, -1)],
    2
  );
  assert.deepEqual(
    rows.map((r) => [r.nickname, r.from, r.to]),
    [
      ["Ana", 0, 0],
      ["Eva", null, 1],
      ["Beto", 1, null],
    ]
  );
});

test("empates de antes respetan el orden de ahora", () => {
  // Primera pregunta: todos venían de 0 y del mismo puesto.
  const rows = leaderboardMotion([e("Ana", 1, 900, 900, 0), e("Beto", 2, 800, 800, 0), e("Caro", 3, 0, 0, 0)]);
  assert.deepEqual(
    rows.map((r) => [r.nickname, r.from, r.to]),
    [
      ["Ana", 0, 0],
      ["Beto", 1, 1],
      ["Caro", 2, 2],
    ]
  );
});

test("sin jugadores, sin filas", () => {
  assert.deepEqual(leaderboardMotion([]), []);
});
