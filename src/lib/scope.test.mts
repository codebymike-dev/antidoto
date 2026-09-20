import { test } from "node:test";
import assert from "node:assert/strict";
import { companyFilter } from "./scope.ts";

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
