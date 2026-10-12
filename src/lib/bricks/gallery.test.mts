import { test } from "node:test";
import assert from "node:assert/strict";
import { GALLERY_CATEGORIES, galleryOrder, tally, voteRejection } from "./gallery.ts";

test("el orden de la galería es el mismo con la misma semilla y no depende del orden de entrada", () => {
  const a = galleryOrder([4, 9, 2, 7, 5], 31);
  assert.deepEqual(a, galleryOrder([9, 7, 5, 4, 2], 31));
  assert.deepEqual([...a].sort((x, y) => x - y), [2, 4, 5, 7, 9]);
});

test("el orden cambia entre sesiones", () => {
  const ids = [1, 2, 3, 4, 5, 6, 7, 8];
  const orders = new Set([1, 2, 3, 4, 5].map((seed) => galleryOrder(ids, seed).join(",")));
  assert.ok(orders.size > 1);
});

test("tally da el ganador de cada categoría y comparte los empates", () => {
  const res = tally(
    [
      { category: "ingenio", teamId: 1 },
      { category: "ingenio", teamId: 1 },
      { category: "ingenio", teamId: 2 },
      { category: "historia", teamId: 2 },
      { category: "historia", teamId: 3 },
    ],
    [1, 2, 3],
  );
  assert.equal(res.length, GALLERY_CATEGORIES.length);
  assert.deepEqual(res[0].winners, [1]);
  assert.equal(res[0].votes, 2);
  assert.deepEqual(res[1].winners, [2, 3]);
  // Nadie votó en las otras dos: no hay ganador ni se muestra a nadie.
  assert.deepEqual(res[2].winners, []);
  assert.deepEqual(res[3].winners, []);
});

test("los votos a obras que salieron de la galería no cuentan", () => {
  const res = tally(
    [
      { category: "ingenio", teamId: 1 },
      { category: "ingenio", teamId: 1 },
      { category: "ingenio", teamId: 2 },
    ],
    [2, 3],
  );
  assert.deepEqual(res[0].winners, [2]);
});

test("voteRejection: no se vota por la propia obra ni fuera de tiempo", () => {
  const base = { status: "voting" as const, category: "ingenio", teamId: 2, shown: [1, 2], ownTeam: 1 };
  assert.equal(voteRejection(base), null);
  assert.match(voteRejection({ ...base, teamId: 1 })!, /tu equipo/);
  assert.match(voteRejection({ ...base, teamId: 3 })!, /no está/);
  assert.match(voteRejection({ ...base, category: "x" })!, /categoría/);
  assert.match(voteRejection({ ...base, status: "results" })!, /cerró/);
  assert.match(voteRejection({ ...base, status: null })!, /todavía/);
});
