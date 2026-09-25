import { test } from "node:test";
import assert from "node:assert/strict";
import { checkLogo, LOGO_MAX_BYTES, sniffLogo, unsafeSvg } from "./logo-file.ts";

const bytes = (...b: number[]) => new Uint8Array([...b, ...new Array(16).fill(0)]);
const text = (s: string) => new TextEncoder().encode(s);

test("identifica los formatos por su firma, no por el nombre", () => {
  assert.equal(sniffLogo(bytes(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a)), "image/png");
  assert.equal(sniffLogo(bytes(0xff, 0xd8, 0xff, 0xe0)), "image/jpeg");
  assert.equal(sniffLogo(text("RIFF\u0000\u0000\u0000\u0000WEBPVP8 ")), "image/webp");
  assert.equal(sniffLogo(text('<?xml version="1.0"?>\n<!-- Illustrator -->\n<svg xmlns="http://www.w3.org/2000/svg"></svg>')), "image/svg+xml");
  assert.equal(sniffLogo(text('﻿<svg viewBox="0 0 10 10"/>')), "image/svg+xml");
});

test("rechaza lo que no es imagen aunque se llame logo.png", () => {
  assert.equal(sniffLogo(text("<html><body>hola</body></html>")), null);
  assert.equal(sniffLogo(text("GIF89a")), null);
  assert.equal(sniffLogo(text("<svgx>")), null);
});

test("un SVG con código o enlaces externos no pasa", () => {
  assert.ok(unsafeSvg('<svg><script>alert(1)</script></svg>'));
  assert.ok(unsafeSvg('<svg onload="alert(1)"></svg>'));
  assert.ok(unsafeSvg('<svg><a href="javascript:alert(1)"/></svg>'));
  assert.ok(unsafeSvg('<svg><foreignObject><div/></foreignObject></svg>'));
  assert.ok(unsafeSvg('<svg><image href="https://evil.test/x.png"/></svg>'));
  assert.ok(!unsafeSvg('<svg viewBox="0 0 10 10"><path fill="#1C99CA" d="M0 0h10v10z"/><use href="#a"/></svg>'));
});

test("checkLogo explica por qué rechaza", () => {
  assert.deepEqual(checkLogo(new Uint8Array()), { ok: false, error: "El archivo del logo está vacío." });
  const big = new Uint8Array(LOGO_MAX_BYTES + 1);
  big.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  assert.equal(checkLogo(big).ok, false);
  assert.equal(checkLogo(text('<svg onload="x()"></svg>')).ok, false);
  assert.deepEqual(checkLogo(text('<svg viewBox="0 0 1 1"></svg>')), { ok: true, mime: "image/svg+xml" });
});
