import { test } from "node:test";
import assert from "node:assert/strict";
import { newQuestion, parseGameDraft, type DraftQuestion } from "./live-validation.ts";

function game(questions: unknown[], extra: Record<string, unknown> = {}) {
  return { title: "Pausa activa", description: "", companyId: null, questions, ...extra };
}

function quiz(overrides: Partial<DraftQuestion> = {}): DraftQuestion {
  return {
    type: "quiz",
    prompt: "¿Cuántos vasos de agua al día?",
    timeLimit: 20,
    options: [
      { text: "8", correct: true },
      { text: "2", correct: false },
    ],
    ...overrides,
  };
}

test("un juego válido pasa y se normaliza (recorta espacios)", () => {
  const res = parseGameDraft(game([quiz({ prompt: "  ¿Cuántos?  " })], { title: "  Pausa  " }));
  assert.equal(res.ok, true);
  if (!res.ok) return;
  assert.equal(res.draft.title, "Pausa");
  assert.equal(res.draft.questions[0].prompt, "¿Cuántos?");
});

test("se puede guardar un juego sin preguntas (borrador)", () => {
  assert.equal(parseGameDraft(game([])).ok, true);
});

test("título obligatorio", () => {
  const res = parseGameDraft(game([], { title: "   " }));
  assert.equal(res.ok, false);
  if (!res.ok) assert.ok(res.errors.title);
});

test("entrada que no es objeto no revienta", () => {
  assert.equal(parseGameDraft(null).ok, false);
  assert.equal(parseGameDraft("hola").ok, false);
  const res = parseGameDraft(game([null, 5]));
  assert.equal(res.ok, false);
  if (!res.ok) assert.ok(res.errors["q.0.prompt"]);
});

test("quiz: necesita al menos una correcta", () => {
  const res = parseGameDraft(
    game([quiz({ options: [{ text: "a", correct: false }, { text: "b", correct: false }] })])
  );
  assert.equal(res.ok, false);
  if (!res.ok) assert.match(res.errors["q.0.options"], /correcta/);
});

test("quiz: admite varias correctas", () => {
  const res = parseGameDraft(
    game([quiz({ options: [{ text: "a", correct: true }, { text: "b", correct: true }] })])
  );
  assert.equal(res.ok, true);
});

test("quiz: entre 2 y 4 opciones", () => {
  const una = parseGameDraft(game([quiz({ options: [{ text: "a", correct: true }] })]));
  assert.equal(una.ok, false);
  const cinco = parseGameDraft(
    game([quiz({ options: ["a", "b", "c", "d", "e"].map((text, i) => ({ text, correct: i === 0 })) })])
  );
  assert.equal(cinco.ok, false);
});

test("opciones vacías o repetidas se marcan por posición", () => {
  const res = parseGameDraft(
    game([
      quiz({
        options: [
          { text: "Sí", correct: true },
          { text: "", correct: false },
          { text: "sí", correct: false },
        ],
      }),
    ])
  );
  assert.equal(res.ok, false);
  if (!res.ok) {
    assert.ok(res.errors["q.0.o.1"]);
    assert.match(res.errors["q.0.o.2"], /repetida/);
  }
});

test("encuesta: se borran las correctas aunque lleguen marcadas", () => {
  const res = parseGameDraft(
    game([{ ...quiz(), type: "encuesta", options: [{ text: "a", correct: true }, { text: "b", correct: true }] }])
  );
  assert.equal(res.ok, true);
  if (res.ok) assert.ok(res.draft.questions[0].options.every((o) => !o.correct));
});

test("V/F: textos fijos y exactamente una correcta", () => {
  const res = parseGameDraft(
    game([{ ...quiz(), type: "vf", options: [{ text: "hack", correct: true }, { text: "x", correct: true }] }])
  );
  assert.equal(res.ok, true);
  if (!res.ok) return;
  const opts = res.draft.questions[0].options;
  assert.deepEqual(opts.map((o) => o.text), ["Verdadero", "Falso"]);
  assert.equal(opts.filter((o) => o.correct).length, 1);
});

test("V/F: marcar Falso como correcta se respeta", () => {
  const res = parseGameDraft(
    game([{ ...quiz(), type: "vf", options: [{ text: "Verdadero", correct: false }, { text: "Falso", correct: true }] }])
  );
  assert.equal(res.ok, true);
  if (res.ok) assert.deepEqual(res.draft.questions[0].options.map((o) => o.correct), [false, true]);
});

test("nube: nunca lleva opciones", () => {
  const res = parseGameDraft(game([{ ...quiz(), type: "nube" }]));
  assert.equal(res.ok, true);
  if (res.ok) assert.deepEqual(res.draft.questions[0].options, []);
});

test("tiempo fuera de la lista y tipo desconocido se rechazan", () => {
  const res = parseGameDraft(game([quiz({ timeLimit: 7 }), { ...quiz(), type: "ranking" }]));
  assert.equal(res.ok, false);
  if (!res.ok) {
    assert.ok(res.errors["q.0.timeLimit"]);
    assert.ok(res.errors["q.1.type"]);
  }
});

test("companyId debe ser entero o null", () => {
  assert.equal(parseGameDraft(game([], { companyId: 3 })).ok, true);
  assert.equal(parseGameDraft(game([], { companyId: "3" })).ok, false);
});

test("newQuestion arma cada tipo con opciones coherentes", () => {
  assert.equal(newQuestion("quiz").options.filter((o) => o.correct).length, 1);
  assert.deepEqual(newQuestion("vf").options.map((o) => o.text), ["Verdadero", "Falso"]);
  assert.equal(newQuestion("encuesta").options.some((o) => o.correct), false);
  assert.deepEqual(newQuestion("nube").options, []);
});
