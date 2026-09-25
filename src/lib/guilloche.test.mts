import { test } from "node:test";
import assert from "node:assert/strict";
import { rosettePath, rosettePoints } from "./guilloche.ts";

test("la roseta se cierra sobre su punto de partida", () => {
  const pts = rosettePoints({ R: 300, r: 70, d: 120 });
  const [x0, y0] = pts[0];
  const [x1, y1] = pts[pts.length - 1];
  assert.ok(Math.abs(x0 - x1) < 1e-6 && Math.abs(y0 - y1) < 1e-6);
});

test("da las vueltas justas: r / mcd(R, r)", () => {
  // mcd(300, 70) = 10, así que el círculo pequeño rueda 7 vueltas para cerrar.
  assert.equal(rosettePoints({ R: 300, r: 70, d: 100, steps: 10 }).length, 7 * 10 + 1);
});

test("se centra donde se pide", () => {
  const pts = rosettePoints({ R: 200, r: 50, d: 0, cx: 500, cy: 400 });
  for (const [x, y] of pts) assert.ok(Math.abs(Math.hypot(x - 500, y - 400) - 150) < 1e-6);
});

test("el path empieza con M, cierra con Z y no se dispara de tamaño", () => {
  const d = rosettePath({ R: 300, r: 70, d: 120 });
  assert.match(d, /^M/);
  assert.match(d, /Z$/);
  assert.ok(d.length < 12_000);
});
