import { test } from "node:test";
import assert from "node:assert/strict";
import { canEditGame, companyFilter, visibleGamesFilter } from "./scope.ts";

test("superadmin no recibe filtro: ve todas las empresas", () => {
  const scope = companyFilter("super", null);
  assert.equal(scope.clause, "");
  assert.deepEqual(scope.args, []);
});

test("admin de empresa queda restringido a su company_id", () => {
  const scope = companyFilter("empresa", 42);
  assert.match(scope.clause, /ac\.company_id = \?/);
  assert.deepEqual(scope.args, [42]);
});

test("superadmin ignora un company_id presente (no debería filtrar aunque lo tenga)", () => {
  const scope = companyFilter("super", 7);
  assert.equal(scope.clause, "");
  assert.deepEqual(scope.args, []);
});

test("el filtro por empresa acepta otra columna (partidas en vivo)", () => {
  const scope = companyFilter("empresa", 42, "m.company_id");
  assert.match(scope.clause, /m\.company_id = \?/);
  assert.doesNotMatch(scope.clause, /ac\./);
  assert.deepEqual(scope.args, [42]);
});

test("juegos: el admin de empresa ve los suyos y los globales", () => {
  const scope = visibleGamesFilter("empresa", 42);
  assert.match(scope.clause, /g\.company_id = \?/);
  assert.match(scope.clause, /g\.company_id IS NULL/);
  assert.deepEqual(scope.args, [42]);
});

test("juegos: el superadmin ve todos", () => {
  const scope = visibleGamesFilter("super", null);
  assert.equal(scope.clause, "");
  assert.deepEqual(scope.args, []);
});

test("juegos: el admin de empresa edita solo los de su empresa", () => {
  assert.equal(canEditGame("empresa", 42, 42), true);
  assert.equal(canEditGame("empresa", 42, 7), false);
});

test("juegos: un global no lo edita un admin de empresa, sí el superadmin", () => {
  assert.equal(canEditGame("empresa", 42, null), false);
  assert.equal(canEditGame("super", null, null), true);
  assert.equal(canEditGame("super", null, 7), true);
});
