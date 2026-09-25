// Lógica del tablero split-flap (las celdas que giran como en un tablero de aeropuerto).
// Sin DOM: decide qué caracteres pasan por cada celda y cuándo empieza a girar cada una.
// El componente solo pinta estos fotogramas; así la secuencia se puede probar en Node.

/** Lo que puede "pasar" por una celda mientras gira. Sin 0/O ni 1/I, como los códigos. */
export const FLAP_CHARSET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";

export interface FlapCell {
  /** Carácter en el que termina la celda. */
  final: string;
  /** Caracteres intermedios, en orden. Vacío si la celda no gira (espacios, guiones, %). */
  frames: string[];
  /** Segundos de espera antes de empezar a girar. */
  delay: number;
}

export interface FlapOptions {
  seed?: number;
  minFlips?: number;
  maxFlips?: number;
  /** Segundos entre el arranque de una celda y la siguiente. */
  stagger?: number;
}

/** PRNG pequeño y determinista (mulberry32): la misma semilla da la misma secuencia. */
export function seededRandom(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Semilla estable a partir de un texto (FNV-1a), para que cada código gire a su manera. */
export function seedFrom(text: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** Solo giran letras y dígitos; la puntuación queda impresa en su sitio. */
export function flips(char: string): boolean {
  return /[\p{L}\p{N}]/u.test(char);
}

export function flapPlan(target: string, options: FlapOptions = {}): FlapCell[] {
  const { seed = seedFrom(target), minFlips = 3, maxFlips = 7, stagger = 0.035 } = options;
  const random = seededRandom(seed);
  return Array.from(target).map((final, i) => {
    if (!flips(final)) return { final, frames: [], delay: i * stagger };
    const count = minFlips + Math.floor(random() * (maxFlips - minFlips + 1));
    const frames: string[] = [];
    while (frames.length < count) {
      const next = FLAP_CHARSET[Math.floor(random() * FLAP_CHARSET.length)];
      // Nunca el final antes de tiempo ni dos iguales seguidos: se vería como una pausa.
      if (next !== final.toUpperCase() && next !== frames[frames.length - 1]) frames.push(next);
    }
    return { final, frames, delay: i * stagger };
  });
}

/** Posiciones que cambiaron entre dos textos: al actualizar solo giran esas celdas. */
export function changedCells(previous: string, next: string): number[] {
  const a = Array.from(previous);
  const b = Array.from(next);
  const out: number[] = [];
  for (let i = 0; i < b.length; i++) if (a[i] !== b[i]) out.push(i);
  return out;
}

/** Rellena con espacios a la derecha para que una columna del tablero no cambie de ancho. */
export function padCells(text: string, length: number): string {
  const chars = Array.from(text).slice(0, length);
  return chars.join("") + " ".repeat(length - chars.length);
}
