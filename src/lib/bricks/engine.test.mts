import { test } from "node:test";
import assert from "node:assert/strict";
import { decodeBuild, encodeBuild } from "./codec.ts";
import { History, apply, invert, type Op } from "./ops.ts";
import { PARTS, part, partByKey } from "./parts.ts";
import { proposePlacement } from "./place.ts";
import { castRay } from "./ray.ts";
import { PLATE_H } from "./units.ts";
import { BrickWorld, footprint, localCell, type Brick, type Rot } from "./world.ts";

const P = (key: string) => partByKey(key).id;
let n = 0;
const brick = (key: string, x: number, y: number, z: number, rot: Rot = 0, color = 0): Brick => ({ id: `t${++n}`, part: P(key), x, y, z, rot, color });

test("el catálogo es coherente", () => {
  const ids = new Set<number>();
  const keys = new Set<string>();
  for (const p of PARTS) {
    assert.ok(!ids.has(p.id), `id repetido ${p.id}`);
    assert.ok(!keys.has(p.key), `clave repetida ${p.key}`);
    ids.add(p.id);
    keys.add(p.key);
    assert.equal(p.top.length, p.w * p.d, p.key);
    assert.equal(p.bottom.length, p.w * p.d, p.key);
    assert.equal(part(p.id), p);
  }
});

test("cada rotación recorre todas las celdas de la pieza una sola vez", () => {
  for (const p of PARTS)
    for (const rot of [0, 1, 2, 3] as Rot[]) {
      const { w, d } = footprint(p, rot);
      const seen = new Set<number>();
      for (let i = 0; i < w; i++) for (let k = 0; k < d; k++) seen.add(localCell(p, rot, i, k));
      assert.equal(seen.size, p.w * p.d, `${p.key} rot ${rot}`);
    }
});

test("la inclinada rotada lleva sus studs al lado correcto", () => {
  const s = part(P("inclinada-2x2"));
  const studs = (rot: Rot) => {
    const { w, d } = footprint(s, rot);
    const out: string[] = [];
    for (let k = 0; k < d; k++) for (let i = 0; i < w; i++) if (s.top[localCell(s, rot, i, k)]) out.push(`${i},${k}`);
    return out.join(" ");
  };
  assert.equal(studs(0), "0,0 1,0"); // fila del fondo (z = 0)
  assert.equal(studs(2), "0,1 1,1"); // media vuelta: fila del frente
  assert.notEqual(studs(1), studs(3));
});

test("choques y apoyo sobre la base", () => {
  const w = new BrickWorld(16);
  const a = brick("ladrillo-2x4", 0, 0, 0);
  assert.ok(w.isSupported(a));
  w.add(a);
  assert.ok(w.collides({ part: P("ladrillo-1x1"), rot: 0, x: 3, y: 2, z: 1 }));
  assert.ok(!w.collides({ part: P("ladrillo-1x1"), rot: 0, x: 4, y: 0, z: 0 }));
  // Fuera de la base no hay studs: una pieza en el suelo ahí no se sostiene.
  assert.ok(!w.isSupported({ part: P("ladrillo-1x1"), rot: 0, x: 20, y: 0, z: 0 }));
  // Encima del 2x4, sí.
  assert.ok(w.isSupported({ part: P("ladrillo-1x1"), rot: 0, x: 3, y: 3, z: 1 }));
  // En el aire, no.
  assert.ok(!w.isSupported({ part: P("ladrillo-1x1"), rot: 0, x: 8, y: 3, z: 8 }));
});

test("tejas e inclinadas solo sostienen donde tienen studs", () => {
  const w = new BrickWorld(16);
  w.add(brick("teja-2x2", 0, 0, 0));
  assert.ok(!w.isSupported({ part: P("placa-1x1"), rot: 0, x: 0, y: 1, z: 0 }), "sobre una teja no encaja nada");
  w.add(brick("inclinada-2x2", 4, 0, 0));
  assert.ok(w.isSupported({ part: P("placa-1x1"), rot: 0, x: 4, y: 3, z: 0 }), "fila alta de la inclinada");
  assert.ok(!w.isSupported({ part: P("placa-1x1"), rot: 0, x: 4, y: 3, z: 1 }), "sobre la rampa no");
});

test("una pieza puede colgar debajo de otra", () => {
  const w = new BrickWorld(16);
  w.add(brick("ladrillo-1x1", 0, 0, 0));
  w.add(brick("placa-2x4", 0, 3, 0));
  // Cuelga debajo de la placa, sin tocar la base.
  assert.ok(w.isSupported({ part: P("placa-1x1"), rot: 0, x: 3, y: 2, z: 1 }));
});

test("al quitar una pieza se detecta lo que queda suelto", () => {
  const w = new BrickWorld(16);
  const pilar = brick("ladrillo-1x1", 0, 0, 0);
  const puente = brick("placa-1x4", 0, 3, 0);
  const torre = brick("ladrillo-1x1", 3, 4, 0);
  for (const b of [pilar, puente, torre]) w.add(b);
  assert.equal(w.floating().size, 0);
  w.remove(pilar.id);
  assert.deepEqual([...w.floating()].sort(), [puente.id, torre.id].sort());
});

test("el rayo toca la cara superior de una pieza y la base", () => {
  const w = new BrickWorld(16);
  w.add(brick("ladrillo-2x2", 4, 0, 4));
  const fromAbove = castRay(w, [5, 10, 5], [0, -1, 0]);
  assert.ok(fromAbove);
  assert.deepEqual(fromAbove.cell, [5, 2, 5]);
  assert.deepEqual(fromAbove.normal, [0, 1, 0]);
  const ground = castRay(w, [1.5, 10, 1.5], [0, -1, 0]);
  assert.ok(ground && !ground.brickId);
  assert.deepEqual(ground.cell, [1, -1, 1]);
  // De lado, a media altura del ladrillo.
  const side = castRay(w, [0.5, 1.5 * PLATE_H, 4.5], [1, 0, 0]);
  assert.ok(side);
  assert.deepEqual(side.cell, [4, 1, 4]);
  assert.deepEqual(side.normal, [-1, 0, 0]);
  // Fuera de la base y sin piezas: nada.
  assert.equal(castRay(w, [40, 10, 40], [0, -1, 0]), null);
});

test("la propuesta apila, pega de lado y sube si choca", () => {
  const w = new BrickWorld(16);
  const a = brick("ladrillo-2x4", 0, 0, 0);
  w.add(a);
  const top = proposePlacement(w, castRay(w, [1.5, 10, 0.5], [0, -1, 0])!, P("ladrillo-2x2"), 0, [0, 0]);
  assert.deepEqual([top.x, top.y, top.z, top.ok], [1, 3, 0, true]);

  const side = proposePlacement(w, castRay(w, [8.5, 0.5, 0.5], [-1, 0, 0])!, P("ladrillo-1x1"), 0, [0, 0]);
  assert.deepEqual([side.x, side.y, side.z, side.ok], [4, 0, 0, true]);

  // El ancla es la celda bajo el dedo: un 2x4 tocado por su tercera celda queda corrido.
  const anchored = proposePlacement(w, castRay(w, [6.5, 10, 6.5], [0, -1, 0])!, P("ladrillo-2x4"), 0, [2, 1]);
  assert.deepEqual([anchored.x, anchored.z], [4, 5]);

  // Un 1x1 encima del 2x4 estorba a un 2x2 que se pone al lado: el fantasma sube y queda
  // apoyado sobre el 1x1.
  w.add(brick("ladrillo-1x1", 1, 3, 0));
  const lifted = proposePlacement(w, castRay(w, [0.5, 10, 0.5], [0, -1, 0])!, P("ladrillo-2x2"), 0, [0, 0]);
  assert.deepEqual([lifted.x, lifted.y, lifted.z, lifted.ok], [0, 6, 0, true]);
});

test("la propuesta avisa por qué no cabe", () => {
  const w = new BrickWorld(16);
  w.add(brick("teja-2x2", 0, 0, 0));
  const hit = castRay(w, [0.5, 10, 0.5], [0, -1, 0])!;
  const p = proposePlacement(w, hit, P("ladrillo-1x1"), 0, [0, 0]);
  assert.equal(p.ok, false);
  assert.equal(p.problem, "sin apoyo");
});

test("deshacer y rehacer, y un lote es todo o nada", () => {
  const w = new BrickWorld(16);
  const h = new History(w);
  const a = brick("ladrillo-2x2", 0, 0, 0);
  assert.ok(h.do({ t: "add", brick: a }));
  assert.ok(!h.do({ t: "add", brick: brick("ladrillo-1x1", 1, 1, 1) }), "no se coloca dentro de otra");
  assert.ok(h.do({ t: "paint", id: a.id, from: 0, to: 5 }));
  assert.equal(w.bricks.get(a.id)!.color, 5);
  h.undo();
  assert.equal(w.bricks.get(a.id)!.color, 0);
  h.undo();
  assert.equal(w.bricks.size, 0);
  assert.ok(!h.canUndo);
  h.redo();
  h.redo();
  assert.equal(w.bricks.get(a.id)!.color, 5);

  // Mover = quitar y poner. Si poner falla, quitar se revierte.
  const moved = { ...a, x: 30 };
  const bad: Op = { t: "batch", ops: [{ t: "remove", brick: w.bricks.get(a.id)! }, { t: "add", brick: moved }] };
  assert.ok(!apply(w, bad));
  assert.ok(w.bricks.has(a.id), "la pieza vuelve a su sitio");
  const good: Op = { t: "batch", ops: [{ t: "remove", brick: w.bricks.get(a.id)! }, { t: "add", brick: { ...a, color: 5, x: 6 } }] };
  assert.ok(apply(w, good));
  assert.ok(apply(w, invert(good)));
  assert.equal(w.bricks.get(a.id)!.x, 0);
});

test("en equipo, deshacer se descarta si alguien apoyó algo encima", () => {
  const w = new BrickWorld(16);
  const h = new History(w);
  const base = brick("placa-2x2", 0, 0, 0);
  h.do({ t: "add", brick: base });
  const top = brick("ladrillo-1x1", 0, 1, 0);
  w.add(top); // la pone otra persona, fuera de este historial
  // Quitar la placa sí se permite (deja la otra suelta, la vista la marca).
  assert.ok(h.undo());
  assert.deepEqual([...w.floating()], [top.id]);
});

test("el formato binario ida y vuelta", () => {
  const bricks = [brick("ladrillo-2x4", 3, 0, -2, 1, 7), brick("inclinada-2x2", 0, 3, 0, 3, 22), brick("puerta-1x4x6", -10, 600, 9, 2, 0)];
  const data = encodeBuild(32, bricks);
  assert.equal(data.byteLength, 6 + 9 * bricks.length);
  const back = decodeBuild(data);
  assert.equal(back.base, 32);
  const noId = ({ part, x, y, z, rot, color }: Brick) => ({ part, x, y, z, rot, color });
  assert.deepEqual(back.bricks.map(noId), bricks.map(noId));
  assert.throws(() => decodeBuild(data.subarray(0, data.byteLength - 1)));
  const wrong = data.slice();
  wrong[0] = 99;
  assert.throws(() => decodeBuild(wrong));
});
