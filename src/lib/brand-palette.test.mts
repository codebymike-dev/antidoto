import { test } from "node:test";
import assert from "node:assert/strict";
import { ANTIDOTO_PALETTE, INK, brandPalette, contrast, derivePalette, initials, parseHex, PRESET_COLORS } from "./brand-palette.ts";

const WHITE = "#FFFFFF";
const GAME_BG = "#0F181D";

test("parseHex normaliza formatos cortos, sin # y minúsculas", () => {
  assert.equal(parseHex("#1c99ca"), "#1C99CA");
  assert.equal(parseHex("1c99ca"), "#1C99CA");
  assert.equal(parseHex("#fa0"), "#FFAA00");
  assert.equal(parseHex(" #ABCDEF "), "#ABCDEF");
});

test("parseHex rechaza lo que no es un color", () => {
  for (const bad of ["", "#12345", "#GGGGGG", "red", "#1234567", "rgb(0,0,0)"]) assert.equal(parseHex(bad), null, bad);
});

test("contraste WCAG: blanco contra negro es 21, un color contra sí mismo es 1", () => {
  assert.equal(Math.round(contrast("#000000", WHITE)), 21);
  assert.equal(contrast("#1C99CA", "#1C99CA"), 1);
});

test("sin marca se usa la paleta de Antídoto tal cual", () => {
  assert.equal(brandPalette(null), ANTIDOTO_PALETTE);
});

test("un color oscuro se respeta en el botón, sin ajustes", () => {
  const p = derivePalette("#0C5C7D");
  assert.equal(p.button, "#0C5C7D");
  assert.equal(p.buttonText, WHITE);
  assert.equal(p.adjusted, false);
});

test("un color medio que no pasa AA con blanco se oscurece lo justo y lo avisa", () => {
  const p = derivePalette("#1C99CA");
  assert.equal(p.adjusted, true);
  assert.ok(contrast(WHITE, p.button) >= 4.5);
  // Lo justo: un paso menos ya no alcanzaría.
  assert.ok(contrast(WHITE, p.button) < 5.2);
});

test("un color muy claro conserva su tono y lleva texto oscuro", () => {
  const p = derivePalette("#FFD23F");
  assert.equal(p.button, "#FFD23F");
  assert.equal(p.buttonText, INK);
  assert.equal(p.adjusted, false);
});

test("todas las combinaciones de texto pasan AA, con cualquier color", () => {
  const samples = [...PRESET_COLORS, "#FFFFFF", "#000000", "#FFD23F", "#E30613", "#00FF00", "#0A2540", "#F5F5F5", "#777777"];
  for (const color of samples) {
    const p = derivePalette(color);
    assert.ok(contrast(p.buttonText, p.button) >= 4.5, `botón ${color}`);
    assert.ok(contrast(p.accent, WHITE) >= 4.5, `acento ${color}`);
    assert.ok(contrast(p.strong, p.tint) >= 4.5, `texto sobre tinte ${color}`);
    assert.ok(contrast(p.onDark, GAME_BG) >= 4.5, `acento en el juego ${color}`);
    assert.ok(contrast(p.liveButton, GAME_BG) >= 3, `botón del juego ${color}`);
  }
});

test("el secundario, si existe, pinta los tonos decorativos", () => {
  assert.equal(derivePalette("#0C5C7D", "#FFB400").soft, "#FFB400");
  assert.notEqual(derivePalette("#0C5C7D").soft, "#FFB400");
});

test("un color inválido cae en el de Antídoto en vez de romper la pantalla", () => {
  assert.equal(derivePalette("no-es-color").graphic, ANTIDOTO_PALETTE.graphic);
});

test("iniciales del monograma", () => {
  assert.equal(initials("Grupo Acme S.A."), "GA");
  assert.equal(initials("Juan Valdez Café"), "JV");
  assert.equal(initials("Éxito"), "ÉX");
  assert.equal(initials("  "), "?");
});
