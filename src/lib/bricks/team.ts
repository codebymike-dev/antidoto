// Modo equipos en vivo (fase 6 de docs/plan-construccion-3d.md): qué modos hay, cómo se reparten
// los jugadores, las parcelas de Obra en Equipo y la validación de lo que llega por la red. Lógica
// pura, sin base de datos: la usan el servidor (autoridad) y el navegador (para avisar antes).

import { apply, invert, type Op } from "./ops.ts";
import { BRICK_COLORS } from "./palette.ts";
import { PARTS, part } from "./parts.ts";
import { BrickWorld, footprint, inGrid, type Brick, type Placement, type Rot } from "./world.ts";

export type TeamModeKey = "torre-equipos" | "obra-equipo";

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
  /** La base se divide en una franja por persona (Obra en Equipo). */
  parcels: boolean;
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
    parcels: false,
  },
  {
    key: "obra-equipo",
    title: "Obra en Equipo",
    tag: "TRABAJO EN EQUIPO",
    description: "Cada persona tiene su parcela de la base del equipo y la obra solo queda completa si las parcelas se conectan. Las parcelas evitan que alguien acapare; las conexiones obligan a negociar.",
    prompt: "Construyan juntos un lugar donde les gustaría trabajar. Cada uno construye en su franja (la iluminada), pero la obra tiene que quedar conectada con las de sus vecinos.",
    times: [480, 360, 600],
    maxPieces: null,
    parcels: true,
  },
];

export function getTeamMode(key: string): TeamMode | null {
  return TEAM_MODES.find((m) => m.key === key) ?? null;
}

export const TEAM_SIZES = [3, 4, 5] as const;
/** Ancho de la franja de cada persona en Obra en Equipo, en studs. */
export const PARCEL_W = 8;
/** Lado de la base de La Torre: chica, para que la gracia sea subir. */
const TOWER_BASE = 12;

/** Lado de la base de cada equipo según el modo y el tamaño de equipo. */
export function teamBase(mode: TeamMode, teamSize: number): number {
  return mode.parcels ? PARCEL_W * teamSize : TOWER_BASE;
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
}

export function parcelFor(slot: number): Parcel {
  return { x0: slot * PARCEL_W, x1: (slot + 1) * PARCEL_W };
}

/** La pieza toca la parcela: basta una columna adentro, así se puede conectar con el vecino. */
export function touchesParcel(pl: Placement, parcel: Parcel): boolean {
  const { w } = footprint(part(pl.part), pl.rot);
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
export type OpRejection = "choque" | "parcela" | "presupuesto" | "fuera";

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
