// Galería de Cierre (fase 7 de docs/plan-construccion-3d.md, investigación 6.3): votación por
// varias categorías para que gane más gente y se premien virtudes distintas a la destreza. Las
// obras van sin nombre hasta los resultados y solo se muestra quién ganó cada categoría: nunca los
// últimos. Reglas puras, sin base ni red, para probarlas sin servidor.

export interface GalleryCategory {
  key: string;
  title: string;
  hint: string;
}

export const GALLERY_CATEGORIES: readonly GalleryCategory[] = [
  { key: "ingenio", title: "La más ingeniosa", hint: "La idea que nadie más tuvo" },
  { key: "historia", title: "La que mejor cuenta una historia", hint: "La que se entiende sin explicarla" },
  { key: "riesgo", title: "La que más se arriesgó", hint: "Probó algo difícil, aunque no saliera perfecto" },
  { key: "pocas", title: "Mejor uso de pocas piezas", hint: "Dice mucho con poco" },
];

export const getCategory = (key: string) => GALLERY_CATEGORIES.find((c) => c.key === key) ?? null;

export type GalleryStatus = "voting" | "results";

/**
 * Orden de las obras en la galería: barajado con la sesión como semilla, igual en el proyector y en
 * los celulares, para que "la obra 3" no delate al tercer equipo que entró.
 */
export function galleryOrder(ids: readonly number[], seed: number): number[] {
  const out = [...ids].sort((a, b) => a - b);
  let s = (seed * 2654435761) >>> 0 || 1;
  const rand = () => {
    // xorshift32: suficiente para barajar unas pocas obras de forma reproducible.
    s ^= s << 13;
    s >>>= 0;
    s ^= s >>> 17;
    s ^= s << 5;
    s >>>= 0;
    return s / 4294967296;
  };
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

export interface Vote {
  category: string;
  teamId: number;
}

export interface CategoryResult {
  category: GalleryCategory;
  /** Obras con más votos (varias si empatan); vacío si nadie votó en esta categoría. */
  winners: number[];
  votes: number;
}

/** Ganadores por categoría. Solo cuentan las obras que siguen en la galería. */
export function tally(votes: readonly Vote[], shown: readonly number[]): CategoryResult[] {
  const visible = new Set(shown);
  return GALLERY_CATEGORIES.map((category) => {
    const counts = new Map<number, number>();
    for (const v of votes) {
      if (v.category !== category.key || !visible.has(v.teamId)) continue;
      counts.set(v.teamId, (counts.get(v.teamId) ?? 0) + 1);
    }
    const top = Math.max(0, ...counts.values());
    const winners = top === 0 ? [] : [...counts].filter(([, n]) => n === top).map(([id]) => id).sort((a, b) => a - b);
    return { category, winners, votes: top };
  });
}

/** Por qué no se acepta un voto; null si vale. */
export function voteRejection(input: { status: GalleryStatus | null; category: string; teamId: number; shown: readonly number[]; ownTeam: number | null }) {
  if (input.status !== "voting") return input.status === "results" ? "La votación ya cerró." : "La votación todavía no abre.";
  if (!getCategory(input.category)) return "Esa categoría no existe.";
  if (!input.shown.includes(input.teamId)) return "Esa obra no está en la galería.";
  if (input.teamId === input.ownTeam) return "No puedes votar por la obra de tu equipo.";
  return null;
}

/** Hacen falta al menos dos obras para votar: con una sola no hay nada que elegir. */
export const MIN_GALLERY_WORKS = 2;
