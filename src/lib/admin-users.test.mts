import { test } from "node:test";
import assert from "node:assert/strict";
import { generatePassword, normalizeUsername, passwordError, PASSWORD_MIN, usernameError } from "./admin-users.ts";

test("el usuario se guarda como lo compara el login: sin espacios y en minúsculas", () => {
  assert.equal(normalizeUsername("  Ana.Gomez@JuanValdez.com "), "ana.gomez@juanvaldez.com");
});

test("acepta usuarios simples y correos", () => {
  for (const ok of ["ana", "ana.gomez", "ana_g-2", "ana@empresa.com.co"]) {
    assert.equal(usernameError(ok), null, ok);
  }
});

test("rechaza usuarios cortos, largos, con espacios, tildes o que empiezan con símbolo", () => {
  for (const bad of ["ab", "a".repeat(61), "ana gomez", "andrés", ".ana", "-ana", "ana!"]) {
    assert.notEqual(usernameError(bad), null, bad);
  }
});

test("la contraseña pide un mínimo de caracteres", () => {
  assert.notEqual(passwordError("a".repeat(PASSWORD_MIN - 1)), null);
  assert.equal(passwordError("a".repeat(PASSWORD_MIN)), null);
  assert.notEqual(passwordError("a".repeat(201)), null);
});

test("la contraseña generada cumple la regla, va en bloques y no repite", () => {
  const seen = new Set<string>();
  for (let i = 0; i < 200; i++) {
    const p = generatePassword();
    assert.match(p, /^[A-Za-z2-9]{4}-[A-Za-z2-9]{4}-[A-Za-z2-9]{4}$/);
    assert.doesNotMatch(p, /[01OolI]/, "sin caracteres que se confunden al dictar");
    assert.equal(passwordError(p), null);
    seen.add(p);
  }
  assert.equal(seen.size, 200);
});
