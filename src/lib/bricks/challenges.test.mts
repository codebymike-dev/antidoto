import { test } from "node:test";
import assert from "node:assert/strict";
import { BUILDS, buildMissionId, getBuild, matchScore, modelBricks, validateBuildTexts, validateStory, validateWork } from "./challenges.ts";
import { encodeBuild } from "./codec.ts";
import { apply } from "./ops.ts";
import { part, partByKey } from "./parts.ts";
import { BrickWorld, footprint, type Brick, type Rot } from "./world.ts";

test("los retos tienen claves únicas y un modelo solo donde se replica", () => {
  const keys = new Set(BUILDS.map((b) => b.key));
  assert.equal(keys.size, BUILDS.length);
  for (const b of BUILDS) {
    assert.equal(getBuild(b.key), b);
    assert.equal(b.kind === "replicar", b.model !== null, b.key);
    assert.ok(buildMissionId(b.key).startsWith("bld-"));
    assert.ok(validateBuildTexts(b.defaults).ok, `textos de fábrica de ${b.key}`);
  }
});

test("el modelo a replicar se puede construir pieza por pieza y no queda nada suelto", () => {
  for (const def of BUILDS.filter((b) => b.model)) {
    const world = new BrickWorld(def.model!.base);
    for (const b of modelBricks(def)) assert.ok(apply(world, { t: "add", brick: b }), `${def.key}: ${b.id} no encaja`);
    assert.equal(world.floating().size, 0);
    // También tiene que caber en la base del participante.
    assert.ok(def.model!.base <= def.base);
  }
});

const casa = modelBricks(getBuild("replica-casa")!);

test("la copia exacta coincide al 100 % aunque esté en otro lugar o girada", () => {
  assert.equal(matchScore(casa, casa), 1);
  const moved = casa.map((b) => ({ ...b, x: b.x + 4, z: b.z + 2 }));
  assert.equal(matchScore(casa, moved), 1);
  // Girada media vuelta: cada pieza en la posición simétrica, con la huella al otro lado.
  const turned: Brick[] = casa.map((b) => {
    const { w, d } = footprint(part(b.part), b.rot);
    return { ...b, x: 20 - b.x - w, z: 20 - b.z - d, rot: ((b.rot + 2) % 4) as Rot };
  });
  assert.equal(matchScore(casa, turned), 1);
});

test("girar la copia un cuarto de vuelta no le quita coincidencia", () => {
  // Una L de dos piezas y la misma L girada 90°.
  const red = 8;
  const model: Brick[] = [
    { id: "a", part: partByKey("ladrillo-1x4").id, color: red, x: 0, y: 0, z: 0, rot: 0 },
    { id: "b", part: partByKey("ladrillo-1x1").id, color: red, x: 0, y: 3, z: 0, rot: 0 },
  ];
  const turned: Brick[] = [
    { id: "a", part: partByKey("ladrillo-1x4").id, color: red, x: 5, y: 0, z: 2, rot: 1 },
    { id: "b", part: partByKey("ladrillo-1x1").id, color: red, x: 5, y: 3, z: 5, rot: 0 },
  ];
  // El 1x1 puede quedar en cualquier punta: es la L girada a un lado o al otro.
  assert.equal(matchScore(model, turned), 1);
  assert.equal(matchScore(model, turned.map((b) => (b.id === "b" ? { ...b, z: 2 } : b))), 1);
});

test("un color cambiado o una pieza de menos bajan la coincidencia", () => {
  const recolored = casa.map((b, i) => (i === 0 ? { ...b, color: 0 } : b));
  const missing = casa.slice(0, -1);
  assert.ok(matchScore(casa, recolored) < 1);
  assert.ok(matchScore(casa, missing) < 1);
  assert.ok(matchScore(casa, missing) > 0.5);
  assert.equal(matchScore(casa, []), 0);
});

test("una obra se valida contra la base, el límite de piezas y el catálogo", () => {
  const torre = getBuild("la-torre")!;
  const one: Brick[] = [{ id: "x", part: partByKey("ladrillo-2x2").id, color: 0, x: 0, y: 0, z: 0, rot: 0 }];
  assert.ok(validateWork(torre, encodeBuild(torre.base, one)).ok);
  assert.ok(!validateWork(torre, encodeBuild(24, one)).ok, "otra base");
  const many = Array.from({ length: 16 }, (_, i) => ({ ...one[0], id: `b${i}`, y: i * 3 }));
  assert.ok(!validateWork(torre, encodeBuild(torre.base, many)).ok, "más piezas que el presupuesto");
  const unknown = encodeBuild(torre.base, [{ ...one[0], part: 999 }]);
  assert.ok(!validateWork(torre, unknown).ok, "pieza desconocida");
  assert.ok(!validateWork(torre, new Uint8Array([9, 9, 9])).ok, "basura");
});

test("título y frase se piden solo en los retos con historia", () => {
  const libre = getBuild("construccion-libre")!;
  const metafora = getBuild("metafora-buen-dia")!;
  assert.deepEqual(validateStory(libre, { title: "x", phrase: "y" }), { ok: true, value: { title: null, phrase: null } });
  assert.ok(!validateStory(metafora, { title: "", phrase: "algo" }).ok);
  assert.ok(!validateStory(metafora, { title: "Puente", phrase: "   " }).ok);
  const ok = validateStory(metafora, { title: "  El   puente ", phrase: "Nos une" });
  assert.deepEqual(ok, { ok: true, value: { title: "El puente", phrase: "Nos une" } });
});

test("los textos editados se limpian y se validan", () => {
  assert.ok(!validateBuildTexts({ title: "", prompt: "a", reflection: "" }).ok);
  assert.ok(!validateBuildTexts({ title: "a", prompt: "x".repeat(400), reflection: "" }).ok);
  const ok = validateBuildTexts({ title: " Torre ", prompt: "Haz  una torre", reflection: null });
  assert.deepEqual(ok, { ok: true, value: { title: "Torre", prompt: "Haz una torre", reflection: "" } });
});
