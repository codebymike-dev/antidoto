// Modo equipos en vivo (fase 6 de docs/plan-construccion-3d.md): qué modos hay, cómo se reparten
// los jugadores, las parcelas de Obra en Equipo y la validación de lo que llega por la red. Lógica
// pura, sin base de datos: la usan el servidor (autoridad) y el navegador (para avisar antes).

import { matchScore, type BuildKind } from "./challenges.ts";
import { apply, invert, type Op } from "./ops.ts";
import { BRICK_COLORS, colorIndex } from "./palette.ts";
import { PARTS, part, partByKey } from "./parts.ts";
import { BrickWorld, footprint, inGrid, type Brick, type Placement, type Rot } from "./world.ts";

export type TeamModeKey = "torre-equipos" | "obra-equipo" | "relevo" | "telefono-roto";

/**
 * Cómo se reparte el trabajo dentro del equipo: todos a la vez, cada uno en su franja, por turnos
 * o en parejas con roles (uno describe, el otro arma).
 */
export type TeamPlay = "juntos" | "parcelas" | "relevo" | "telefono";

export interface TeamMode {
  key: TeamModeKey;
  title: string;
  tag: string;
  description: string;
  /** Lo que ve cada equipo al empezar. */
  prompt: string;
  /** Duraciones que el anfitrión puede elegir, en segundos; la primera es la sugerida. */
  times: number[];
  /** Piezas por equipo; null = sin límite. */
  maxPieces: number | null;
  play: TeamPlay;
  /** Personas por equipo que el anfitrión puede elegir; la primera es la sugerida. */
  sizes: number[];
  /** Consigna sorpresa que aparece a mitad del tiempo (Relevo). */
  twist?: string;
}

export const TEAM_MODES: TeamMode[] = [
  {
    key: "torre-equipos",
    title: "La Torre en equipo",
    tag: "ROMPEHIELOS",
    description: "Cada equipo levanta la torre más alta que pueda con 30 piezas compartidas. El proyector muestra las torres creciendo y quién va arriba.",
    prompt: "Entre todos, levanten la torre más alta que puedan con 30 piezas. Pónganse de acuerdo: las piezas son del equipo, no de cada uno.",
    times: [180, 120, 300],
    maxPieces: 30,
    play: "juntos",
    sizes: [4, 3, 5],
  },
  {
    key: "obra-equipo",
    title: "Obra en Equipo",
    tag: "TRABAJO EN EQUIPO",
    description: "Cada persona tiene su parcela de la base del equipo y la obra solo queda completa si las parcelas se conectan. Las parcelas evitan que alguien acapare; las conexiones obligan a negociar.",
    prompt: "Construyan juntos un lugar donde les gustaría trabajar. Cada uno construye en su franja (la iluminada), pero la obra tiene que quedar conectada con las de sus vecinos.",
    times: [480, 360, 600],
    maxPieces: null,
    play: "parcelas",
    sizes: [4, 3, 5],
  },
  {
    key: "relevo",
    title: "Relevo de Constructores",
    tag: "TRABAJO EN EQUIPO",
    description: "Una sola obra por equipo, construida por turnos de 45 segundos. A mitad del tiempo llega una consigna sorpresa y al final se ve qué agregó cada persona.",
    prompt: "Construyan entre todos una plaza para su barrio, pero por turnos: solo pone piezas quien tiene el turno. Los demás miran, opinan y preparan su idea.",
    times: [360, 240, 480],
    maxPieces: null,
    play: "relevo",
    sizes: [4, 3, 5],
    twist: "¡Sorpresa! Su obra ahora tiene que tener un puente. Úsenlo para unir dos partes.",
  },
  {
    key: "telefono-roto",
    title: "Teléfono Roto",
    tag: "COMUNICACIÓN",
    description: "En parejas: uno ve un modelo secreto y lo describe en voz alta, el otro lo arma sin verlo. A mitad del tiempo cambian de rol. Al final se ve qué tanto se parecen, solo como curiosidad.",
    prompt: "Uno describe y el otro construye. Quien describe ve un modelo secreto y lo cuenta con palabras, sin mostrar la pantalla. Quien construye solo escucha y arma. A mitad del tiempo cambian.",
    times: [480, 360, 600],
    maxPieces: null,
    play: "telefono",
    sizes: [2],
  },
];

/** Qué portada isométrica usa cada modo en la biblioteca (las mismas composiciones de los retos). */
export const TEAM_THUMB = { juntos: "presupuesto", parcelas: "tema", relevo: "libre", telefono: "replicar" } as const satisfies Record<TeamPlay, BuildKind>;

export function getTeamMode(key: string): TeamMode | null {
  return TEAM_MODES.find((m) => m.key === key) ?? null;
}

/** Ancho de la franja de cada persona en Obra en Equipo, en studs. */
export const PARCEL_W = 8;
/** Lado de la base de La Torre: chica, para que la gracia sea subir. */
const TOWER_BASE = 12;
/** Base del Relevo: una sola obra para todo el equipo. */
const RELAY_BASE = 20;
/** En Teléfono Roto cada ronda se arma en su mitad de la base, así quedan las dos a la vista. */
export const PHONE_W = 12;

/** Lado de la base de cada equipo según el modo y el tamaño de equipo. */
export function teamBase(mode: TeamMode, teamSize: number): number {
  switch (mode.play) {
    case "parcelas":
      return PARCEL_W * teamSize;
    case "relevo":
      return RELAY_BASE;
    case "telefono":
      return PHONE_W * 2;
    default:
      return TOWER_BASE;
  }
}

// --- Relevo -------------------------------------------------------------------------------

export const RELAY_TURN_MS = 45_000;

/**
 * De quién es el turno: los puestos del equipo en orden, uno cada RELAY_TURN_MS desde que empezó.
 * Si alguien entra o sale, la rueda sigue con los que estén.
 */
export function relayTurn(slots: number[], startedMs: number, now: number): { slot: number | null; turn: number; endsMs: number } {
  const turn = Math.max(0, Math.floor((now - startedMs) / RELAY_TURN_MS));
  const order = [...slots].sort((a, b) => a - b);
  return { slot: order.length ? order[turn % order.length] : null, turn, endsMs: startedMs + (turn + 1) * RELAY_TURN_MS };
}

/** La consigna sorpresa aparece a mitad del tiempo pactado (sumar minutos no la mueve). */
export function twistDue(startedMs: number, timeLimit: number, now: number): boolean {
  return now >= startedMs + (timeLimit * 1000) / 2;
}

// --- Teléfono Roto ------------------------------------------------------------------------

/** Ronda 0 o 1: se cambia de rol a mitad del tiempo pactado (sumar minutos alarga la segunda). */
export function phoneRound(startedMs: number, timeLimit: number, now: number): 0 | 1 {
  return twistDue(startedMs, timeLimit, now) ? 1 : 0;
}

/** Quién construye en cada ronda: en la primera el segundo de la pareja, en la segunda el primero. */
export function phoneBuilder(round: 0 | 1): number {
  return round === 0 ? 1 : 0;
}

/** Puede construir quien tiene el rol, o cualquiera si su pareja no está (alguien quedó solo). */
export function canBuildPhone(slot: number, round: 0 | 1, slots: number[]): boolean {
  const builder = phoneBuilder(round);
  return slot === builder || !slots.includes(builder);
}

/** Zona de la base donde se arma cada ronda. */
export function phoneArea(round: 0 | 1): Parcel {
  return { x0: round * PHONE_W, x1: (round + 1) * PHONE_W, strict: true };
}

interface ModelPiece {
  part: string;
  color: string;
  x: number;
  y: number;
  z: number;
  rot?: Rot;
}

/** Modelos secretos: chicos (4 a 7 piezas) para que se puedan describir en un par de minutos. */
const PHONE_MODELS: { name: string; pieces: ModelPiece[] }[] = [
  {
    name: "Semáforo",
    pieces: [
      { part: "ladrillo-2x2", color: "Gris Asfalto", x: 4, y: 0, z: 4 },
      { part: "ladrillo-2x2", color: "Gris Asfalto", x: 4, y: 3, z: 4 },
      { part: "ladrillo-1x1", color: "Verde Cafetal", x: 4, y: 6, z: 4 },
      { part: "ladrillo-1x1", color: "Girasol", x: 4, y: 9, z: 4 },
      { part: "ladrillo-1x1", color: "Rojo Volcán", x: 4, y: 12, z: 4 },
      { part: "placa-2x2", color: "Noche", x: 4, y: 15, z: 4 },
    ],
  },
  {
    name: "Árbol",
    pieces: [
      { part: "ladrillo-redondo-2x2", color: "Café Tinto", x: 5, y: 0, z: 5 },
      { part: "ladrillo-redondo-2x2", color: "Café Tinto", x: 5, y: 3, z: 5 },
      { part: "placa-4x4", color: "Verde Cafetal", x: 4, y: 6, z: 4 },
      { part: "ladrillo-2x2", color: "Verde Cafetal", x: 5, y: 7, z: 5 },
      { part: "ladrillo-1x1", color: "Mandarina", x: 7, y: 7, z: 4 },
      { part: "ladrillo-1x1", color: "Limoncillo", x: 5, y: 10, z: 5 },
    ],
  },
  {
    name: "Banca",
    pieces: [
      { part: "ladrillo-1x1", color: "Café Tinto", x: 3, y: 0, z: 5 },
      { part: "ladrillo-1x1", color: "Café Tinto", x: 8, y: 0, z: 5 },
      { part: "placa-2x6", color: "Panela", x: 3, y: 3, z: 5 },
      { part: "ladrillo-1x6", color: "Arena Caribe", x: 3, y: 4, z: 6 },
      { part: "ladrillo-1x6", color: "Arena Caribe", x: 3, y: 7, z: 6 },
    ],
  },
  {
    name: "Torre de colores",
    pieces: [
      { part: "ladrillo-2x4", color: "Celeste Antídoto", x: 4, y: 0, z: 5 },
      { part: "placa-2x4", color: "Orquídea", x: 4, y: 3, z: 5 },
      { part: "ladrillo-2x2", color: "Girasol", x: 5, y: 4, z: 5 },
      { part: "ladrillo-1x2", color: "Rojo Volcán", x: 5, y: 7, z: 5 },
      { part: "ladrillo-1x1", color: "Blanco Nube", x: 5, y: 10, z: 5 },
    ],
  },
  {
    name: "Casita",
    pieces: [
      { part: "ladrillo-2x4", color: "Blanco Nube", x: 4, y: 0, z: 4 },
      { part: "ladrillo-2x4", color: "Blanco Nube", x: 4, y: 0, z: 6 },
      { part: "inclinada-4x2", color: "Rojo Volcán", x: 4, y: 3, z: 4, rot: 2 },
      { part: "inclinada-4x2", color: "Rojo Volcán", x: 4, y: 3, z: 6 },
      { part: "ladrillo-1x1", color: "Girasol", x: 3, y: 0, z: 5 },
    ],
  },
  {
    name: "Puente",
    pieces: [
      { part: "ladrillo-2x2", color: "Gris Neblina", x: 2, y: 0, z: 5 },
      { part: "ladrillo-2x2", color: "Gris Neblina", x: 2, y: 3, z: 5 },
      { part: "ladrillo-2x2", color: "Gris Neblina", x: 8, y: 0, z: 5 },
      { part: "ladrillo-2x2", color: "Gris Neblina", x: 8, y: 3, z: 5 },
      { part: "placa-2x8", color: "Girasol", x: 2, y: 6, z: 5 },
      { part: "ladrillo-1x1", color: "Rojo Volcán", x: 5, y: 7, z: 5 },
    ],
  },
];

export const PHONE_MODEL_COUNT = PHONE_MODELS.length;

/** El modelo secreto de una pareja en una ronda: distinto en cada ronda y entre parejas vecinas. */
export function phoneModel(position: number, round: 0 | 1): { name: string; bricks: Brick[] } {
  const m = PHONE_MODELS[(position * 2 + round) % PHONE_MODELS.length];
  return {
    name: m.name,
    bricks: m.pieces.map((p, n) => ({ id: `s${n + 1}`, part: partByKey(p.part).id, color: colorIndex(p.color), x: p.x, y: p.y, z: p.z, rot: p.rot ?? 0 })),
  };
}

/** Qué tanto se parece lo armado en cada ronda a su modelo, de 0 a 1 (una curiosidad, no un puntaje). */
export function phoneScores(position: number, bricks: Brick[]): [number, number] {
  const score = (round: 0 | 1) => {
    const area = phoneArea(round);
    const mine = bricks.filter((b) => b.x >= area.x0 && b.x < area.x1).map((b) => ({ ...b, x: b.x - area.x0 }));
    return matchScore(phoneModel(position, round).bricks, mine);
  };
  return [score(0), score(1)];
}

/** Colores de los equipos, en orden de creación: los de la paleta que más se distinguen entre sí. */
const TEAM_COLORS = ["Celeste Antídoto", "Girasol", "Guayaba", "Verde Cafetal", "Orquídea", "Mandarina", "Abismo Antídoto", "Rojo Volcán", "Limoncillo", "Pitaya", "Panela", "Gris Asfalto"];

export function teamIdentity(position: number): { name: string; color: string } {
  const name = TEAM_COLORS[position % TEAM_COLORS.length];
  const color = BRICK_COLORS.find((c) => c.name === name)!.hex;
  // Después de 12 equipos los colores se repiten: el número los distingue.
  const suffix = position >= TEAM_COLORS.length ? ` ${Math.floor(position / TEAM_COLORS.length) + 1}` : "";
  return { name: `Equipo ${name.split(" ")[0]}${suffix}`, color };
}

/**
 * A qué equipo entra alguien nuevo: al que tenga menos gente sin estar lleno (a igualdad, el más
 * antiguo). Null = todos llenos, hay que abrir otro equipo.
 */
export function pickTeam(teams: { id: number; members: number }[], teamSize: number): number | null {
  let best: { id: number; members: number } | null = null;
  for (const t of teams) if (t.members < teamSize && (!best || t.members < best.members)) best = t;
  return best?.id ?? null;
}

/** El primer puesto libre del equipo (0..tamaño-1): define la parcela en Obra en Equipo. */
export function freeSlot(used: number[], teamSize: number): number | null {
  for (let s = 0; s < teamSize; s++) if (!used.includes(s)) return s;
  return null;
}

export interface Parcel {
  x0: number;
  /** Exclusivo. */
  x1: number;
  /** La pieza tiene que quedar entera adentro (Teléfono Roto), no solo tocarla. */
  strict?: boolean;
}

export function parcelFor(slot: number): Parcel {
  return { x0: slot * PARCEL_W, x1: (slot + 1) * PARCEL_W };
}

/** La pieza toca la parcela: basta una columna adentro, así se puede conectar con el vecino. */
export function touchesParcel(pl: Placement, parcel: Parcel): boolean {
  const { w } = footprint(part(pl.part), pl.rot);
  if (parcel.strict) return pl.x >= parcel.x0 && pl.x + w <= parcel.x1;
  return pl.x < parcel.x1 && pl.x + w > parcel.x0;
}

const KNOWN_PARTS = new Set(PARTS.map((p) => p.id));
const isInt = (v: unknown, min: number, max: number): v is number => Number.isInteger(v) && (v as number) >= min && (v as number) <= max;

function parseBrick(v: unknown): Brick | null {
  if (typeof v !== "object" || v === null) return null;
  const b = v as Record<string, unknown>;
  if (typeof b.id !== "string" || !/^[A-Za-z0-9_-]{1,40}$/.test(b.id)) return null;
  if (!isInt(b.part, 0, 65535) || !KNOWN_PARTS.has(b.part)) return null;
  if (!isInt(b.color, 0, BRICK_COLORS.length - 1) || !isInt(b.rot, 0, 3)) return null;
  if (!isInt(b.x, -512, 511) || !isInt(b.y, 0, 1023) || !isInt(b.z, -512, 511) || !inGrid(b.x, b.y, b.z)) return null;
  return { id: b.id, part: b.part, color: b.color, x: b.x, y: b.y, z: b.z, rot: b.rot as Rot };
}

/**
 * Una operación que llega del navegador, revisada campo por campo. Los lotes son de un solo nivel
 * y cortos: mover y girar son quitar + poner.
 */
export function parseOp(v: unknown, depth = 0): Op | null {
  if (typeof v !== "object" || v === null) return null;
  const o = v as Record<string, unknown>;
  switch (o.t) {
    case "add":
    case "remove": {
      const brick = parseBrick(o.brick);
      return brick ? { t: o.t, brick } : null;
    }
    case "paint":
      if (typeof o.id !== "string" || o.id.length > 40) return null;
      if (!isInt(o.from, 0, BRICK_COLORS.length - 1) || !isInt(o.to, 0, BRICK_COLORS.length - 1)) return null;
      return { t: "paint", id: o.id, from: o.from, to: o.to };
    case "batch": {
      if (depth > 0 || !Array.isArray(o.ops) || o.ops.length === 0 || o.ops.length > 4) return null;
      const ops = o.ops.map((x) => parseOp(x, 1));
      return ops.every((x): x is Op => x !== null) ? { t: "batch", ops } : null;
    }
    default:
      return null;
  }
}

export interface TeamRules {
  base: number;
  maxPieces: number | null;
  /** Parcela de quien manda la operación; null = puede construir en toda la base. */
  parcel: Parcel | null;
}

/** Por qué no se acepta una operación; null = se aceptó y ya quedó aplicada al mundo. */
export type OpRejection = "choque" | "parcela" | "presupuesto" | "fuera" | "turno" | "rol";

function opsTouch(world: BrickWorld, op: Op, parcel: Parcel): boolean {
  switch (op.t) {
    case "add":
    case "remove":
      return touchesParcel(op.brick, parcel);
    case "paint": {
      const b = world.bricks.get(op.id);
      return !!b && touchesParcel(b, parcel);
    }
    case "batch":
      return op.ops.every((o) => opsTouch(world, o, parcel));
  }
}

function addsOutside(op: Op, base: number): boolean {
  if (op.t === "batch") return op.ops.some((o) => addsOutside(o, base));
  if (op.t !== "add") return false;
  const { w, d } = footprint(part(op.brick.part), op.brick.rot);
  // Se puede colgar una pieza del borde, pero no construir lejos de la base.
  return op.brick.x + w <= 0 || op.brick.z + d <= 0 || op.brick.x >= base || op.brick.z >= base;
}

/** Aplica una operación de un jugador al mundo del equipo si las reglas lo permiten. */
export function applyTeamOp(world: BrickWorld, op: Op, rules: TeamRules): OpRejection | null {
  if (addsOutside(op, rules.base)) return "fuera";
  if (rules.parcel && !opsTouch(world, op, rules.parcel)) return "parcela";
  const before = world.bricks.size;
  if (!apply(world, op)) return "choque";
  if (rules.maxPieces !== null && world.bricks.size > Math.max(before, rules.maxPieces)) {
    apply(world, invert(op));
    return "presupuesto";
  }
  return null;
}

/** Altura de la torre en placas: lo más alto que sigue conectado a la base. */
export function towerHeight(bricks: Brick[], base: number): number {
  const world = new BrickWorld(base);
  for (const b of bricks) if (!world.collides(b)) world.add(b);
  const loose = world.floating();
  let top = 0;
  for (const b of world.bricks.values()) if (!loose.has(b.id)) top = Math.max(top, b.y + part(b.part).h);
  return top;
}

/** "4,5 ladrillos": la altura en ladrillos, que se entiende mejor que en placas. */
export function heightLabel(plates: number): string {
  const bricks = Math.round((plates / 3) * 10) / 10;
  return `${bricks.toLocaleString("es-CO")} ${bricks === 1 ? "ladrillo" : "ladrillos"}`;
}
