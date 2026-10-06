import { test } from "node:test";
import assert from "node:assert/strict";
import { csvCell, durationMinutes, formatDateTime, liveMatchOpen } from "./live-report-format.ts";

test("CSV: comillas, comas y saltos de línea según RFC 4180", () => {
  assert.equal(csvCell("Ana"), "Ana");
  assert.equal(csvCell('Dijo "hola"'), '"Dijo ""hola"""');
  assert.equal(csvCell("a,b"), '"a,b"');
  assert.equal(csvCell("línea\nnueva"), '"línea\nnueva"');
  assert.equal(csvCell(null), "");
  assert.equal(csvCell(950), "950");
});

test("CSV: neutraliza fórmulas escritas por jugadores", () => {
  assert.equal(csvCell('=HYPERLINK("http://x","clic")'), `"'=HYPERLINK(""http://x"",""clic"")"`);
  assert.equal(csvCell("+57 300"), "'+57 300");
  assert.equal(csvCell("-2+3"), "'-2+3");
  assert.equal(csvCell("@SUM(A1)"), "'@SUM(A1)");
  assert.equal(csvCell("\t=1"), "'\t=1");
  assert.equal(csvCell("hola=mundo"), "hola=mundo");
});

test("fechas de SQLite en hora de Colombia (UTC-5)", () => {
  const out = formatDateTime("2026-09-22 18:30:00");
  assert.match(out, /22/);
  assert.match(out, /1:30|01:30|13:30/);
  assert.equal(formatDateTime(null), "Sin registro");
});

test("duración en minutos, al menos 1", () => {
  assert.equal(durationMinutes("2026-09-22 18:00:00", "2026-09-22 18:12:40"), 13);
  assert.equal(durationMinutes("2026-09-22 18:00:00", "2026-09-22 18:00:10"), 1);
  assert.equal(durationMinutes(null, "2026-09-22 18:00:00"), null);
});

test("partida en vivo abierta: sin terminar, no desafío y dentro del plazo", () => {
  const now = Date.parse("2026-10-06T15:00:00Z");
  assert.equal(liveMatchOpen("question", "2026-10-06 14:00:00", null, now), true);
  assert.equal(liveMatchOpen("lobby", "2026-10-06 03:30:00", null, now), true);
  assert.equal(liveMatchOpen("finished", "2026-10-06 14:00:00", null, now), false);
  assert.equal(liveMatchOpen("lobby", "2026-10-06 14:00:00", "2026-10-10 00:00:00", now), false);
  assert.equal(liveMatchOpen("reveal", "2026-10-06 02:59:00", null, now), false);
});
