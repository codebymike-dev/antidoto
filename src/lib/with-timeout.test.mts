import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { TimeoutError, withTimeout } from "./with-timeout.ts";

describe("withTimeout", () => {
  test("entrega el valor si llega a tiempo", async () => {
    assert.equal(await withTimeout(Promise.resolve(7), 50), 7);
  });

  test("propaga el error de la petición", async () => {
    await assert.rejects(withTimeout(Promise.reject(new Error("sin red")), 50), /sin red/);
  });

  test("falla con TimeoutError si la petición se cuelga", async () => {
    const hung = new Promise<never>(() => {});
    await assert.rejects(withTimeout(hung, 20), TimeoutError);
  });

  test("una respuesta tardía no cambia el resultado ya fallido", async () => {
    const late = new Promise<string>((resolve) => setTimeout(() => resolve("tarde"), 60));
    await assert.rejects(withTimeout(late, 10), TimeoutError);
    await late;
  });
});
