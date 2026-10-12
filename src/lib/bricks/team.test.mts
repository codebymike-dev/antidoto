import { test } from "node:test";
import assert from "node:assert/strict";
import { partByKey } from "./parts.ts";
import { applyTeamOp, freeSlot, getTeamMode, parcelFor, parseOp, pickTeam, teamBase, teamIdentity, TEAM_MODES, towerHeight } from "./team.ts";
import { BrickWorld, type Brick } from "./world.ts";

const P = (key: string) => partByKey(key).id;
const brick = (key: string, x: number, y: number, z: number, id = `b${x}${y}${z}`): Brick => ({ id, part: P(key), color: 0, x, y, z, rot: 0 });

test("los modos existen y la base depende del modo", () => {
  assert.equal(new Set(TEAM_MODES.map((m) => m.key)).size, TEAM_MODES.length);
  const obra = getTeamMode("obra-equipo")!;
  const torre = getTeamMode("torre-equipos")!;
  assert.equal(teamBase(obra, 4), 32);
  assert.equal(teamBase(torre, 4), teamBase(torre, 5));
  assert.equal(getTeamMode("nada"), null);
});

test("cada persona entra al equipo con menos gente y abre otro cuando todos están llenos", () => {
  assert.equal(pickTeam([], 3), null);
  assert.equal(pickTeam([{ id: 1, members: 2 }, { id: 2, members: 1 }], 3), 2);
  assert.equal(pickTeam([{ id: 1, members: 1 }, { id: 2, members: 1 }], 3), 1);
  assert.equal(pickTeam([{ id: 1, members: 3 }, { id: 2, members: 3 }], 3), null);
  assert.equal(freeSlot([0, 2], 4), 1);
  assert.equal(freeSlot([0, 1, 2], 3), null);
});

test("los equipos tienen nombre y color distintos", () => {
  const names = Array.from({ length: 12 }, (_, i) => teamIdentity(i).name);
  assert.equal(new Set(names).size, 12);
  assert.notEqual(teamIdentity(0).name, teamIdentity(12).name);
});

test("parseOp acepta lo que manda el constructor y rechaza basura", () => {
  const add = { t: "add", brick: brick("ladrillo-2x2", 0, 0, 0, "pA1") };
  assert.deepEqual(parseOp(add), add);
  assert.deepEqual(parseOp({ t: "paint", id: "pA1", from: 0, to: 3 }), { t: "paint", id: "pA1", from: 0, to: 3 });
  assert.ok(parseOp({ t: "batch", ops: [{ t: "remove", brick: add.brick }, add] }));
  assert.equal(parseOp({ t: "batch", ops: [{ t: "batch", ops: [add] }] }), null, "lotes anidados");
  assert.equal(parseOp({ t: "add", brick: { ...add.brick, part: 999 } }), null, "pieza desconocida");
  assert.equal(parseOp({ t: "add", brick: { ...add.brick, color: 99 } }), null, "color desconocido");
  assert.equal(parseOp({ t: "add", brick: { ...add.brick, id: "<script>" } }), null, "id raro");
  assert.equal(parseOp({ t: "add", brick: { ...add.brick, x: 1.5 } }), null, "coordenada no entera");
  assert.equal(parseOp("hola"), null);
});

test("en Obra en Equipo cada uno construye tocando su franja, y puede unirse con la del vecino", () => {
  const world = new BrickWorld(24);
  const rules = { base: 24, maxPieces: null, parcel: parcelFor(1) };
  assert.equal(applyTeamOp(world, { t: "add", brick: brick("ladrillo-2x2", 0, 0, 0) }, rules), "parcela");
  assert.equal(applyTeamOp(world, { t: "add", brick: brick("ladrillo-2x2", 9, 0, 0) }, rules), null);
  // Un 1x4 desde la franja 0 hasta la 1: toca la propia, vale.
  assert.equal(applyTeamOp(world, { t: "add", brick: brick("ladrillo-1x4", 6, 0, 4) }, rules), null);
  // Quitar una pieza ajena que no toca la franja propia no se puede.
  const ajena = brick("ladrillo-1x1", 2, 0, 9, "ajena");
  world.add(ajena);
  assert.equal(applyTeamOp(world, { t: "remove", brick: ajena }, rules), "parcela");
  assert.equal(applyTeamOp(world, { t: "add", brick: brick("ladrillo-2x2", 9, 0, 0, "otra") }, rules), "choque");
});

test("el presupuesto del equipo no deja pasar del límite y no construye lejos de la base", () => {
  const world = new BrickWorld(12);
  const rules = { base: 12, maxPieces: 2, parcel: null };
  assert.equal(applyTeamOp(world, { t: "add", brick: brick("ladrillo-2x2", 0, 0, 0) }, rules), null);
  assert.equal(applyTeamOp(world, { t: "add", brick: brick("ladrillo-2x2", 0, 3, 0) }, rules), null);
  assert.equal(applyTeamOp(world, { t: "add", brick: brick("ladrillo-2x2", 0, 6, 0) }, rules), "presupuesto");
  assert.equal(world.bricks.size, 2);
  assert.equal(applyTeamOp(world, { t: "add", brick: brick("ladrillo-2x2", 40, 0, 0) }, rules), "fuera");
});

test("la altura de la torre cuenta solo lo conectado a la base", () => {
  const tower = [brick("ladrillo-2x2", 0, 0, 0), brick("ladrillo-2x2", 0, 3, 0), brick("placa-2x2", 0, 6, 0)];
  assert.equal(towerHeight(tower, 12), 7);
  assert.equal(towerHeight([...tower, brick("ladrillo-1x1", 8, 30, 8)], 12), 7);
  assert.equal(towerHeight([], 12), 0);
});
