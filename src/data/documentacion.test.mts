import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { REQUISITOS_FUNCIONALES, REQUISITOS_NO_FUNCIONALES, TODOS_LOS_REQUISITOS } from "./documentacion.ts";
import { COLUMNAS, ITERACIONES, PARES, todasLasHistorias } from "./iteraciones.ts";

// La documentación solo sirve si sus referencias cruzadas apuntan a algo que
// existe. Estos tests fallan cuando se renombra o borra un id y queda colgado.

const IDS = new Set(TODOS_LOS_REQUISITOS.map((r) => r.id));

test("los ids de requisitos son únicos y siguen su prefijo", () => {
  assert.equal(IDS.size, TODOS_LOS_REQUISITOS.length);
  for (const r of REQUISITOS_FUNCIONALES.flatMap((m) => m.items)) assert.match(r.id, /^RF-\d{3}$/);
  for (const r of REQUISITOS_NO_FUNCIONALES.flatMap((m) => m.items)) assert.match(r.id, /^RNF-\d{2}$/);
});

test("cada requisito relacionado existe y no se apunta a sí mismo", () => {
  for (const r of TODOS_LOS_REQUISITOS) {
    for (const rel of r.relacionados ?? []) {
      assert.ok(IDS.has(rel), `${r.id} apunta a ${rel}, que no existe`);
      assert.notEqual(rel, r.id);
    }
  }
});

test("un requisito implementado dice dónde vive en el código", () => {
  for (const r of TODOS_LOS_REQUISITOS.filter((r) => r.estado === "implementado")) {
    assert.ok(r.origen, `${r.id} está implementado pero no tiene origen`);
  }
});

test("las historias tienen id único, formato XP y requisitos existentes", () => {
  const historias = todasLasHistorias();
  assert.equal(new Set(historias.map((h) => h.id)).size, historias.length);
  for (const h of historias) {
    assert.match(h.titulo, /^Como [^,]+, quiero /, `${h.id} no sigue "Como X, quiero Y"`);
    assert.ok(h.requisitos.length > 0, `${h.id} no implementa ningún requisito`);
    for (const id of h.requisitos) assert.ok(IDS.has(id), `${h.id} apunta a ${id}, que no existe`);
    assert.ok(h.dod.length > 0, `${h.id} no tiene Definition of Done`);
    assert.ok(h.par in PARES);
  }
});

test("una historia aceptada tiene todo su DoD cumplido", () => {
  for (const h of todasLasHistorias().filter((h) => h.col === "aceptada")) {
    assert.ok(
      h.dod.every((c) => c.estado === "pass"),
      `${h.id} está aceptada con criterios pendientes`
    );
  }
});

test("cada historia cae en una columna del tablero", () => {
  const columnas = new Set(COLUMNAS.map((c) => c.id));
  for (const h of todasLasHistorias()) assert.ok(columnas.has(h.col));
});

test("las iteraciones con commits tienen rango de fechas", () => {
  for (const it of ITERACIONES) {
    if (it.commits) assert.ok(it.ghSince && it.ghUntil, `${it.id} tiene commits pero no rango`);
  }
});

test("los archivos citados como origen existen", () => {
  // Solo se comprueban las rutas explícitas (src/..., db/..., scripts/...); el resto
  // del texto de origen son nombres de funciones o tablas.
  for (const r of TODOS_LOS_REQUISITOS) {
    const rutas = (r.origen ?? "").match(/(?:src|db|scripts|docs)\/[\w./()[\]-]+\.\w+/g) ?? [];
    for (const ruta of rutas) assert.ok(existsSync(ruta), `${r.id} cita ${ruta}, que no existe`);
  }
});
