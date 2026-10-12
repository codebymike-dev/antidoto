// Retos de construcción de la biblioteca (fase 5 de docs/plan-construccion-3d.md). Igual que las
// escenas de riesgos, la definición vive en código y el superadmin edita solo los textos. Lógica
// pura, sin base de datos, para probarla con node --test y validar en el servidor.

import { decodeBuild } from "./codec.ts";
import { colorIndex } from "./palette.ts";
import { PARTS, part, partByKey } from "./parts.ts";
import { footprint, type Brick, type Rot } from "./world.ts";

export type BuildKind = "libre" | "tema" | "presupuesto" | "replicar" | "metafora";

export const KIND_LABEL: Record<BuildKind, string> = {
  libre: "Construcción libre",
  tema: "Tema con tiempo",
  presupuesto: "Presupuesto de piezas",
  replicar: "Replicar un modelo",
  metafora: "Metáfora",
};

/** Lo editable de un reto desde la biblioteca. */
export interface BuildTexts {
  title: string;
  /** La consigna que lee el participante antes de construir. */
  prompt: string;
  /** Pregunta de reflexión del cierre; vacía = no se muestra. */
  reflection: string;
}

/** Una pieza del modelo a replicar, escrita a mano con nombres en vez de ids. */
interface ModelPiece {
  part: string;
  color: string;
  x: number;
  y: number;
  z: number;
  rot?: Rot;
}

export interface BuildDef {
  key: string;
  kind: BuildKind;
  tag: string;
  /** Para la tarjeta de la biblioteca. */
  description: string;
  minutes: string;
  /** Lado de la base en studs. */
  base: number;
  /** Segundos; null = sin reloj. */
  timeLimit: number | null;
  /** Máximo de piezas; null = sin límite. */
  maxPieces: number | null;
  /** La base arranca con una pieza puesta, que invita a poner la siguiente encima. */
  starter: boolean;
  /** Al entregar se pide título y frase (el modelo se cuenta, no solo se muestra). */
  story: boolean;
  model: { base: number; pieces: ModelPiece[] } | null;
  defaults: BuildTexts;
}

export const LIMITS = { title: 60, prompt: 280, reflection: 200, workTitle: 50, workPhrase: 160 } as const;

/** Una obra guardada no puede pesar más que esto (unas 7.000 piezas). */
export const MAX_WORK_BYTES = 64 * 1024;
/** La foto de la obra entra por una server action, que acepta hasta 1 MB por defecto. */
export const MAX_IMAGE_BYTES = 600 * 1024;

/** JPEG o WebP de verdad, mirando los primeros bytes y no solo lo que dice el navegador. */
export function imageMime(bytes: Uint8Array): "image/jpeg" | "image/webp" | null {
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "image/jpeg";
  const ascii = (from: number, to: number) => String.fromCharCode(...bytes.subarray(from, to));
  if (bytes.length > 12 && ascii(0, 4) === "RIFF" && ascii(8, 12) === "WEBP") return "image/webp";
  return null;
}

const CASA: ModelPiece[] = [
  { part: "ladrillo-2x4", color: "Rojo Volcán", x: 3, y: 0, z: 3 },
  { part: "ladrillo-2x4", color: "Rojo Volcán", x: 3, y: 0, z: 5 },
  { part: "ladrillo-2x4", color: "Blanco Nube", x: 3, y: 3, z: 3 },
  { part: "ladrillo-2x4", color: "Blanco Nube", x: 3, y: 3, z: 5 },
  // Dos inclinadas espalda con espalda forman el techo a dos aguas.
  { part: "inclinada-4x2", color: "Abismo Antídoto", x: 3, y: 6, z: 3, rot: 2 },
  { part: "inclinada-4x2", color: "Abismo Antídoto", x: 3, y: 6, z: 5 },
  { part: "ladrillo-1x1", color: "Noche", x: 6, y: 9, z: 5 },
  { part: "ladrillo-redondo-2x2", color: "Café Tinto", x: 8, y: 0, z: 7 },
  { part: "ladrillo-2x2", color: "Verde Cafetal", x: 8, y: 3, z: 7 },
];

export const BUILDS: BuildDef[] = [
  {
    key: "construccion-libre",
    kind: "libre",
    tag: "CREATIVIDAD",
    description: "Una base, todas las piezas y ninguna regla. Sirve para calentar o para cerrar un taller con algo propio.",
    minutes: "5 a 8 min",
    base: 24,
    timeLimit: null,
    maxPieces: null,
    starter: true,
    story: false,
    model: null,
    defaults: {
      title: "Construcción libre",
      prompt: "Construye lo que quieras. No hay respuesta correcta: tómate tu tiempo, prueba y diviértete.",
      reflection: "",
    },
  },
  {
    key: "la-torre",
    kind: "presupuesto",
    tag: "ROMPEHIELOS",
    description: "La torre más alta con 15 piezas en 90 segundos. Se aprenden los controles sin presión y con risas.",
    minutes: "2 min",
    base: 16,
    timeLimit: 90,
    maxPieces: 15,
    starter: false,
    story: false,
    model: null,
    defaults: {
      title: "La Torre",
      prompt: "Levanta la torre más alta que puedas con 15 piezas. Tienes 90 segundos: ¡que no se caiga!",
      reflection: "",
    },
  },
  {
    key: "lugar-seguro",
    kind: "tema",
    tag: "SEGURIDAD Y SALUD",
    description: "Cada persona construye su lugar de trabajo ideal, uno donde todos vuelven sanos a casa. Con reloj de 6 minutos.",
    minutes: "6 min",
    base: 24,
    timeLimit: 360,
    maxPieces: null,
    starter: true,
    story: true,
    model: null,
    defaults: {
      title: "Un lugar seguro",
      prompt: "Construye tu lugar de trabajo ideal: uno donde todos vuelven sanos a casa. ¿Qué tiene que no tenga el de hoy?",
      reflection: "¿Qué parte de tu construcción podrías empezar a cambiar mañana en tu trabajo?",
    },
  },
  {
    key: "replica-casa",
    kind: "replicar",
    tag: "ATENCIÓN AL DETALLE",
    description: "Hay que mirar bien un modelo pequeño y construirlo igual: mismas piezas, mismos colores.",
    minutes: "3 a 4 min",
    base: 16,
    timeLimit: null,
    maxPieces: null,
    starter: false,
    story: false,
    model: { base: 10, pieces: CASA },
    defaults: {
      title: "Replica la casa",
      prompt: "Mira el modelo y constrúyelo igual: mismas piezas, mismos colores, en el mismo orden. Lo puedes volver a ver cuando quieras.",
      reflection: "",
    },
  },
  {
    key: "metafora-buen-dia",
    kind: "metafora",
    tag: "TRABAJO EN EQUIPO",
    description: "Una pregunta sin respuesta correcta, 30 piezas y una historia. Al entregar, cada persona le pone título y una frase a su obra.",
    minutes: "10 a 15 min",
    base: 24,
    timeLimit: null,
    maxPieces: 30,
    starter: false,
    story: true,
    model: null,
    defaults: {
      title: "Un buen día en el equipo",
      prompt: "¿Cómo se ve un buen día en tu equipo de trabajo? Constrúyelo con 30 piezas. No tiene que parecerse a nada real: cada pieza puede significar lo que tú quieras.",
      reflection: "¿Qué pieza de tu modelo representa algo que hoy le falta a tu equipo?",
    },
  },
];

export function getBuild(key: string): BuildDef | null {
  return BUILDS.find((b) => b.key === key) ?? null;
}

/** Id fijo de la misión que representa a cada reto en actividades y códigos. */
export function buildMissionId(key: string): string {
  return `bld-${key}`;
}

/** Las piezas del modelo a replicar, con ids y colores del motor. */
export function modelBricks(def: BuildDef): Brick[] {
  return (def.model?.pieces ?? []).map((p, n) => ({
    id: `m${n + 1}`,
    part: partByKey(p.part).id,
    color: colorIndex(p.color),
    x: p.x,
    y: p.y,
    z: p.z,
    rot: p.rot ?? 0,
  }));
}

export type BuildTextOverride = BuildTexts | null;

export function buildTexts(def: BuildDef, override: BuildTextOverride): BuildTexts {
  return override ?? def.defaults;
}

/** Lo que recibe el navegador del participante. */
export interface PublicBuild {
  key: string;
  kind: BuildKind;
  base: number;
  timeLimit: number | null;
  maxPieces: number | null;
  starter: boolean;
  story: boolean;
  model: { base: number; bricks: Brick[] } | null;
  texts: BuildTexts;
}

export function publicBuild(def: BuildDef, texts: BuildTexts): PublicBuild {
  return {
    key: def.key,
    kind: def.kind,
    base: def.base,
    timeLimit: def.timeLimit,
    maxPieces: def.maxPieces,
    starter: def.starter,
    story: def.story,
    model: def.model ? { base: def.model.base, bricks: modelBricks(def) } : null,
    texts,
  };
}

const clean = (v: unknown) => String(v ?? "").replace(/\s+/g, " ").trim();

export function validateBuildTexts(input: { title: unknown; prompt: unknown; reflection: unknown }): { ok: true; value: BuildTexts } | { ok: false; error: string } {
  const title = clean(input.title);
  const prompt = clean(input.prompt);
  const reflection = clean(input.reflection);
  if (!title) return { ok: false, error: "El título no puede quedar vacío." };
  if (!prompt) return { ok: false, error: "La consigna no puede quedar vacía." };
  if (title.length > LIMITS.title) return { ok: false, error: `El título admite máximo ${LIMITS.title} caracteres.` };
  if (prompt.length > LIMITS.prompt) return { ok: false, error: `La consigna admite máximo ${LIMITS.prompt} caracteres.` };
  if (reflection.length > LIMITS.reflection) return { ok: false, error: `La pregunta de cierre admite máximo ${LIMITS.reflection} caracteres.` };
  return { ok: true, value: { title, prompt, reflection } };
}

/** Título y frase de la obra: obligatorios solo si el reto los pide. */
export function validateStory(def: BuildDef, input: { title: unknown; phrase: unknown }): { ok: true; value: { title: string | null; phrase: string | null } } | { ok: false; error: string } {
  if (!def.story) return { ok: true, value: { title: null, phrase: null } };
  const title = clean(input.title);
  const phrase = clean(input.phrase);
  if (!title) return { ok: false, error: "Ponle un título a tu obra." };
  if (!phrase) return { ok: false, error: "Escribe una frase que cuente tu obra." };
  if (title.length > LIMITS.workTitle) return { ok: false, error: `El título admite máximo ${LIMITS.workTitle} caracteres.` };
  if (phrase.length > LIMITS.workPhrase) return { ok: false, error: `La frase admite máximo ${LIMITS.workPhrase} caracteres.` };
  return { ok: true, value: { title, phrase } };
}

const KNOWN_PARTS = new Set(PARTS.map((p) => p.id));

/**
 * Una obra que llega del navegador: se decodifica y se revisa contra el reto. No se revisa que
 * cada pieza encaje: eso lo cuida el constructor y una obra rara no le hace daño a nadie.
 */
export function validateWork(def: BuildDef, data: Uint8Array): { ok: true; bricks: Brick[] } | { ok: false; error: string } {
  if (data.byteLength > MAX_WORK_BYTES) return { ok: false, error: "La obra es demasiado grande." };
  let decoded;
  try {
    decoded = decodeBuild(data);
  } catch {
    return { ok: false, error: "No pudimos leer la obra." };
  }
  if (decoded.base !== def.base) return { ok: false, error: "La obra no corresponde a este reto." };
  if (decoded.bricks.some((b) => !KNOWN_PARTS.has(b.part))) return { ok: false, error: "La obra tiene piezas desconocidas." };
  if (def.maxPieces !== null && decoded.bricks.length > def.maxPieces) return { ok: false, error: `Este reto admite máximo ${def.maxPieces} piezas.` };
  return { ok: true, bricks: decoded.bricks };
}

/** Celdas ocupadas con su color, llevadas a la esquina mínima. */
function voxels(bricks: Brick[]): Map<string, number> {
  const cells: [number, number, number, number][] = [];
  for (const b of bricks) {
    const p = part(b.part);
    const { w, d } = footprint(p, b.rot);
    for (let i = 0; i < w; i++) for (let k = 0; k < d; k++) for (let j = 0; j < p.h; j++) cells.push([b.x + i, b.y + j, b.z + k, b.color]);
  }
  const minX = Math.min(...cells.map((c) => c[0]));
  const minZ = Math.min(...cells.map((c) => c[2]));
  return new Map(cells.map(([x, y, z, c]) => [`${x - minX},${y},${z - minZ}`, c]));
}

/** Gira las piezas un cuarto de vuelta alrededor del eje vertical (solo importan las celdas). */
function turn(bricks: Brick[]): Brick[] {
  return bricks.map((b) => {
    // (x, z) pasa a (-z, x): la huella se voltea y su esquina mínima cambia de lado.
    const { d } = footprint(part(b.part), b.rot);
    return { ...b, x: -(b.z + d - 1), z: b.x, rot: ((b.rot + 1) % 4) as Rot };
  });
}

/**
 * Qué tanto se parece una copia al modelo, de 0 a 1: celdas con el mismo color sobre todas las
 * celdas ocupadas por cualquiera de los dos. Da igual dónde de la base se construyó y hacia
 * dónde mira; tampoco castiga cambiar un 1x4 por dos 1x2. Es una curiosidad, no un examen.
 */
export function matchScore(model: Brick[], built: Brick[]): number {
  if (model.length === 0 || built.length === 0) return 0;
  const target = voxels(model);
  let best = 0;
  let current = built;
  for (let r = 0; r < 4; r++) {
    const mine = voxels(current);
    let same = 0;
    for (const [key, color] of mine) if (target.get(key) === color) same++;
    const union = new Set([...target.keys(), ...mine.keys()]).size;
    best = Math.max(best, same / union);
    current = turn(current);
  }
  return best;
}
