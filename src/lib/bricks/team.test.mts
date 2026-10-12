import { test } from "node:test";
import assert from "node:assert/strict";
import { partByKey } from "./parts.ts";
import {
  applyTeamOp,
  canBuildPhone,
  freeSlot,
  getTeamMode,
  parcelFor,
  parseOp,
  phoneArea,
  phoneBuilder,
  PHONE_MODEL_COUNT,
  PHONE_W,
  phoneModel,
  phoneRound,
  phoneScores,
  pickTeam,
  relayTurn,
  RELAY_TURN_MS,
  teamBase,
  teamIdentity,
  TEAM_MODES,
  touchesParcel,
  towerHeight,
  twistDue,
} from "./team.ts";
import { apply } from "./ops.ts";
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

test("cada modo tiene tamaños válidos y la primera duración es la sugerida", () => {
  for (const m of TEAM_MODES) {
    assert.ok(m.sizes.length > 0 && m.sizes.every((n) => n >= 2 && n <= 6), m.key);
    assert.ok(m.times.every((t) => t >= 30 && t <= 3600), m.key);
  }
  assert.deepEqual(getTeamMode("telefono-roto")!.sizes, [2]);
  assert.ok(getTeamMode("relevo")!.twist);
});

test("en el Relevo el turno rota por puesto cada 45 segundos, con los que estén", () => {
  const t0 = 1_000_000;
  assert.equal(relayTurn([2, 0, 1], t0, t0).slot, 0);
  assert.equal(relayTurn([2, 0, 1], t0, t0 + RELAY_TURN_MS).slot, 1);
  assert.equal(relayTurn([2, 0, 1], t0, t0 + 3 * RELAY_TURN_MS + 10).slot, 0);
  assert.equal(relayTurn([0, 3], t0, t0 + RELAY_TURN_MS).slot, 3, "si falta alguien, sigue con el siguiente");
  assert.equal(relayTurn([], t0, t0).slot, null);
  assert.equal(relayTurn([0, 1], t0, t0 + 10).endsMs, t0 + RELAY_TURN_MS);
});

test("la sorpresa y el cambio de rol llegan a mitad del tiempo pactado", () => {
  const t0 = 5000;
  assert.ok(!twistDue(t0, 360, t0 + 179_000));
  assert.ok(twistDue(t0, 360, t0 + 180_000));
  assert.equal(phoneRound(t0, 360, t0 + 10), 0);
  assert.equal(phoneRound(t0, 360, t0 + 200_000), 1);
});

test("en Teléfono Roto construye uno por ronda, salvo que su pareja no esté", () => {
  assert.equal(phoneBuilder(0), 1);
  assert.equal(phoneBuilder(1), 0);
  assert.ok(canBuildPhone(1, 0, [0, 1]));
  assert.ok(!canBuildPhone(0, 0, [0, 1]), "quien describe no construye");
  assert.ok(canBuildPhone(0, 0, [0]), "solo en la pareja: puede hacer las dos cosas");
  const area = phoneArea(1);
  assert.ok(touchesParcel(brick("ladrillo-2x2", PHONE_W, 0, 0), area));
  assert.ok(!touchesParcel(brick("ladrillo-2x2", PHONE_W - 1, 0, 0), area), "la zona es estricta: entera adentro");
});

test("los modelos secretos se pueden armar en la mitad de la base y cambian entre rondas", () => {
  for (let i = 0; i < PHONE_MODEL_COUNT; i++) {
    const m = phoneModel(i, 0);
    const world = new BrickWorld(PHONE_W);
    for (const b of m.bricks) {
      assert.ok(apply(world, { t: "add", brick: b }), `${m.name}: ${b.id} no encaja`);
      assert.ok(b.x >= 0 && b.z >= 0 && b.x < PHONE_W && b.z < PHONE_W, `${m.name} se sale`);
    }
    assert.equal(world.floating().size, 0, m.name);
  }
  assert.notEqual(phoneModel(0, 0).name, phoneModel(0, 1).name);
  assert.notEqual(phoneModel(0, 0).name, phoneModel(1, 0).name);
});

test("la comparación de Teléfono Roto mira cada ronda en su mitad", () => {
  const r0 = phoneModel(3, 0).bricks;
  const r1 = phoneModel(3, 1).bricks.map((b) => ({ ...b, id: `r1${b.id}`, x: b.x + PHONE_W }));
  assert.deepEqual(phoneScores(3, [...r0, ...r1]), [1, 1]);
  const [a, b] = phoneScores(3, r0);
  assert.equal(a, 1);
  assert.equal(b, 0);
});
