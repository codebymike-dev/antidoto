import { test } from "node:test";
import assert from "node:assert/strict";
import { celebration } from "./live-celebrations.ts";

const e = (nickname: string, movement = 0, streak = 0) => ({ nickname, rank: 1, score: 0, correct: 0, lastPoints: 0, movement, streak });

test("sin nada notable, no hay mensaje", () => {
  assert.equal(celebration([]), null);
  assert.equal(celebration([e("Ana", 1, 1), e("Beto", -1, 0)]), null);
});

test("todos con racha tiene prioridad", () => {
  assert.equal(celebration([e("Ana", 5, 2), e("Beto", 0, 3)]), "¡Increíble! Todos llevan racha de 2");
});

test("el que más escaló, si subió 3 o más", () => {
  assert.equal(celebration([e("Ana", 2), e("Beto", 4), e("Caro", -6)]), "¡Beto subió 4 puestos! Es quien más escaló");
});

test("racha grupal y luego individual", () => {
  assert.equal(celebration([e("Ana", 0, 3), e("Beto", 0, 4), e("Caro")]), "¡2 jugadores llevan racha de 3 o más!");
  assert.equal(celebration([e("Ana", 0, 5), e("Beto"), e("Caro")]), "¡Ana lleva una racha de 5!");
});
