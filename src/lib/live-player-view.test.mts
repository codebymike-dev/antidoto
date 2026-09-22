import { test } from "node:test";
import assert from "node:assert/strict";
import { finalHeadline, outcomeOf, pick, standingLine, standingOf } from "./live-player-view.ts";
import type { PublicQuestion, RevealData } from "./live-protocol.ts";

const q = (type: PublicQuestion["type"]): PublicQuestion => ({
  position: 2,
  total: 5,
  type,
  prompt: "",
  options: ["a", "b", "c"],
  timeLimitMs: 20_000,
  startedAt: 0,
  endsAt: 0,
  pausedRemainingMs: null,
});
const reveal = (correct: number[]): RevealData => ({ position: 2, correct, distribution: [], words: [], answered: 0, entries: [] });
const e = (nickname: string, rank: number, score: number, streak = 0) => ({ nickname, rank, score, correct: 0, lastPoints: 0, movement: 0, streak });

test("resultado: correcto, incorrecto, sin respuesta y participación", () => {
  assert.equal(outcomeOf({ question: q("quiz"), reveal: reveal([0, 2]), myAnswer: { optionIndex: 2, text: null } }), "correct");
  assert.equal(outcomeOf({ question: q("vf"), reveal: reveal([0]), myAnswer: { optionIndex: 1, text: null } }), "incorrect");
  assert.equal(outcomeOf({ question: q("quiz"), reveal: reveal([0]), myAnswer: null }), "noAnswer");
  assert.equal(outcomeOf({ question: q("encuesta"), reveal: reveal([]), myAnswer: { optionIndex: 1, text: null } }), "participated");
  assert.equal(outcomeOf({ question: q("nube"), reveal: reveal([]), myAnswer: { optionIndex: null, text: "calma" } }), "participated");
  assert.equal(outcomeOf({ question: q("quiz"), reveal: null, myAnswer: null }), null);
});

test("puesto y rival: el primero de arriba con más puntos", () => {
  const entries = [e("Ana", 1, 3000), e("Beto", 2, 2500), e("Caro", 2, 2500), e("Dani", 4, 2380, 3), e("Eli", 5, 100)];
  const dani = standingOf(entries, "Dani")!;
  assert.deepEqual([dani.rank, dani.streak, dani.rival], [4, 3, { nickname: "Caro", gap: 120 }]);
  assert.equal(standingLine(dani), "A 120 puntos de Caro");
  // Empatado con el de arriba: se salta el empate y apunta a quien sí tiene más.
  assert.deepEqual(standingOf(entries, "Caro")!.rival, { nickname: "Ana", gap: 500 });
  assert.equal(standingLine(standingOf(entries, "Beto")!), "¡Estás en el podio!");
  assert.equal(standingOf(entries, "Nadie"), null);
});

test("sin nadie arriba con más puntos: solo el puesto", () => {
  const entries = [e("Ana", 4, 0), e("Beto", 4, 0)];
  assert.equal(standingLine(standingOf(entries, "Beto")!), "Vas en 4º lugar");
});

test("los textos varían pero son estables para la misma semilla", () => {
  const opts = ["a", "b", "c", "d"];
  assert.equal(pick(opts, "Ana:3"), pick(opts, "Ana:3"));
  const seen = new Set(["Ana", "Beto", "Caro", "Dani", "Eli", "Fer"].map((n) => pick(opts, n)));
  assert.ok(seen.size > 1);
  assert.ok(finalHeadline(1, "x").length > 0);
  assert.ok(finalHeadline(42, "x").length > 0);
});
