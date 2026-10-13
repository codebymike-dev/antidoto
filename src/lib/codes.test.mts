import { test } from "node:test";
import assert from "node:assert/strict";
import { shortCode } from "./codes.ts";

test("un código largo del portal se reconoce por sus últimos 6 caracteres", () => {
  assert.equal(shortCode("MI-JUAN-SJAN3E"), "SJAN3E");
  assert.equal(shortCode(" mi-juan-sjan3e "), "SJAN3E");
  assert.equal(shortCode("sjan 3e"), "SJAN3E");
});

test("un código hecho a mano con otro final queda igual", () => {
  assert.equal(shortCode("rc-prueba-mov01"), "RC-PRUEBA-MOV01");
  assert.equal(shortCode("ABC"), "ABC");
});
