import { test } from "node:test";
import assert from "node:assert/strict";
import { csvCell, durationMinutes, formatDateTime } from "./live-report-format.ts";

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
