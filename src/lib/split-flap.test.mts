import { test } from "node:test";
import assert from "node:assert/strict";
import { changedCells, flapPlan, padCells, seedFrom, seededRandom } from "./split-flap.ts";

test("la misma semilla da la misma secuencia", () => {
  assert.deepEqual(flapPlan("RP-ACME-7KX9QM"), flapPlan("RP-ACME-7KX9QM"));
  const a = seededRandom(42);
  const b = seededRandom(42);
  assert.equal(a(), b());
});

test("textos distintos giran distinto", () => {
  assert.notEqual(seedFrom("TRIVIA"), seedFrom("TRIVIB"));
});

test("la puntuación y los espacios no giran", () => {
  const plan = flapPlan("RP-7 %");
  assert.deepEqual(plan[2].frames, []);
  assert.deepEqual(plan[4].frames, []);
  assert.deepEqual(plan[5].frames, []);
  assert.ok(plan[0].frames.length > 0);
});

test("cada celda gira entre el mínimo y el máximo sin mostrar el final antes de tiempo", () => {
  const plan = flapPlan("ACME2026", { minFlips: 2, maxFlips: 4 });
  for (const cell of plan) {
    assert.ok(cell.frames.length >= 2 && cell.frames.length <= 4);
    assert.ok(!cell.frames.includes(cell.final));
    for (let i = 1; i < cell.frames.length; i++) assert.notEqual(cell.frames[i], cell.frames[i - 1]);
  }
});

test("las celdas arrancan escalonadas", () => {
  const plan = flapPlan("ABC", { stagger: 0.1 });
  assert.deepEqual(
    plan.map((c) => c.delay),
    [0, 0.1, 0.2]
  );
});

test("las letras con tilde también giran y terminan en su sitio", () => {
  const plan = flapPlan("HIDRATACIÓN");
  assert.equal(plan.length, 11);
  assert.equal(plan[9].final, "Ó");
  assert.ok(plan[9].frames.length > 0);
});

test("changedCells marca solo lo que cambió, incluidas las celdas nuevas", () => {
  assert.deepEqual(changedCells("RP-AC", "RP-ACM"), [5]);
  assert.deepEqual(changedCells("ACTIVO ", "PAUSADO"), [0, 1, 2, 3, 4, 5, 6]);
  assert.deepEqual(changedCells("12", "12"), []);
});

test("padCells fija el ancho de una columna", () => {
  assert.equal(padCells("12", 4), "12  ");
  assert.equal(padCells("DEMASIADO LARGO", 5), "DEMAS");
});
