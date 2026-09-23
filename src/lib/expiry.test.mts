import { test } from "node:test";
import assert from "node:assert/strict";
import { expiryInstant, formatExpiryDate, isExpired } from "./expiry.ts";

const at = (iso: string) => Date.parse(iso);

test("un código sin fecha nunca vence", () => {
  assert.equal(isExpired(null, at("2030-01-01T00:00:00Z")), false);
});

test("el día elegido sirve completo en hora de Colombia", () => {
  // 21 sep 7 pm en Colombia: antes del arreglo ya salía vencido.
  assert.equal(isExpired("2026-09-22", at("2026-09-22T00:00:00Z")), false);
  // 22 sep 11:59 pm en Colombia.
  assert.equal(isExpired("2026-09-22", at("2026-09-23T04:59:00Z")), false);
});

test("vence al empezar el día siguiente en Colombia", () => {
  assert.equal(isExpired("2026-09-22", at("2026-09-23T05:00:00Z")), true);
});

test("una fecha con hora se respeta tal cual", () => {
  assert.equal(expiryInstant("2026-09-22T10:00:00Z"), at("2026-09-22T10:00:00Z"));
});

test("una fecha inválida no se da por vencida", () => {
  assert.equal(isExpired("no-es-fecha", at("2030-01-01T00:00:00Z")), false);
});

test("el día mostrado es el que eligió el admin", () => {
  assert.match(formatExpiryDate("2026-09-22"), /^22/);
});
