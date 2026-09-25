// Marca de una empresa: a partir de uno o dos colores elegidos en el editor se derivan
// todos los tonos que usan las pantallas, con el contraste WCAG resuelto aquí y no en
// cada componente. Módulo puro: lo usan el servidor, la vista previa del editor y los tests.

export const INK = "#0F181D";
const WHITE = "#FFFFFF";
/** Fondo de las pantallas de juego (proyector y celular), ver components/live/game-theme.ts. */
const GAME_BG = "#0F181D";

/** Lo que las pantallas públicas necesitan saber de la marca. Nunca lleva el archivo del logo. */
export interface PublicBrand {
  companyId: number;
  name: string;
  primary: string;
  secondary: string | null;
  welcome: string | null;
  /** Con versión para cachearlo; null = sin logo (se muestra un monograma). */
  logoUrl: string | null;
  /** Fondo para el que está pensado el logo; sobre el contrario va en una placa. */
  logoSurface: "claro" | "oscuro";
}

export interface BrandPalette {
  /** Acento legible como texto pequeño sobre blanco (etiquetas, enlaces). */
  accent: string;
  /** Más oscuro que accent: texto sobre `tint`. */
  strong: string;
  /** Tono decorativo: filetes, barras, halos. Nunca lleva texto encima. */
  soft: string;
  /** El color elegido tal cual, para gráficos (barras de avance, puntos). */
  graphic: string;
  tint: string;
  border: string;
  button: string;
  buttonText: string;
  /** Brillo que recorre el botón principal (animación buttonSheen de globals.css). */
  buttonSheen: string;
  buttonGradient: string;
  buttonShadow: string;
  /** Sombra del botón en hover. */
  glow: string;
  pageGradient: string;
  /** Acento legible sobre el fondo oscuro del juego. */
  onDark: string;
  /** Fondo (color o degradado) del botón principal del juego. */
  liveButton: string;
  liveButtonText: string;
  /** El botón se oscureció respecto al color elegido para que su texto se lea. */
  adjusted: boolean;
}

/**
 * La marca de Antídoto, con los valores exactos de lib/theme.ts: una empresa sin marca
 * configurada se ve igual que antes de existir esta función.
 */
export const ANTIDOTO_PALETTE: BrandPalette = {
  accent: "#1C99CA",
  strong: "#0C5C7D",
  soft: "#3BC8F3",
  graphic: "#1C99CA",
  tint: "#E3F6FC",
  border: "#CFEFFB",
  button: "#1C99CA",
  buttonText: WHITE,
  buttonSheen: "#4DC6EC",
  buttonGradient: "linear-gradient(135deg,#3BC8F3,#1C99CA)",
  buttonShadow: "0 12px 24px rgba(28,153,202,0.35)",
  glow: "rgba(28,153,202,0.42)",
  pageGradient: "linear-gradient(160deg,#EAFBFF 0%,#FFFFFF 60%)",
  onDark: "#3BC8F3",
  liveButton: "linear-gradient(135deg,#3BC8F3,#1C99CA)",
  liveButtonText: WHITE,
  adjusted: false,
};

// --- Color -----------------------------------------------------------------------------

/** Acepta "#abc", "abc", "#aabbcc" o "aabbcc". Devuelve "#AABBCC" o null. */
export function parseHex(value: string): string | null {
  const raw = value.trim().replace(/^#/, "");
  if (/^[0-9a-f]{3}$/i.test(raw)) {
    return ("#" + [...raw].map((c) => c + c).join("")).toUpperCase();
  }
  return /^[0-9a-f]{6}$/i.test(raw) ? ("#" + raw).toUpperCase() : null;
}

function channels(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function toHex([r, g, b]: [number, number, number]): string {
  return "#" + [r, g, b].map((c) => Math.round(Math.min(255, Math.max(0, c))).toString(16).padStart(2, "0")).join("").toUpperCase();
}

/** Mezcla `a` con `b`; `amount` es la proporción de `b` (0 = a, 1 = b). */
export function mix(a: string, b: string, amount: number): string {
  const ca = channels(a);
  const cb = channels(b);
  return toHex([0, 1, 2].map((i) => ca[i] + (cb[i] - ca[i]) * amount) as [number, number, number]);
}

export function rgba(hex: string, alpha: number): string {
  const [r, g, b] = channels(hex);
  return `rgba(${r},${g},${b},${alpha})`;
}

function luminance(hex: string): number {
  const [r, g, b] = channels(hex).map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** Razón de contraste WCAG 2.x, de 1 a 21. */
export function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

/** Acerca `color` a `toward` en pasos cortos hasta llegar al contraste pedido contra `against`. */
function shiftUntil(color: string, toward: string, against: string, min: number): string {
  for (let step = 0; step <= 25; step++) {
    const candidate = mix(color, toward, step * 0.04);
    if (contrast(candidate, against) >= min) return candidate;
  }
  return toward;
}

/** Texto blanco o casi negro, el que mejor se lea sobre `bg` (blanco si ambos alcanzan). */
export function readableText(bg: string): string {
  const onWhite = contrast(WHITE, bg);
  if (onWhite >= 4.5) return WHITE;
  return contrast(INK, bg) > onWhite ? INK : WHITE;
}

// --- Paleta ------------------------------------------------------------------------------

export function derivePalette(primaryInput: string, secondaryInput?: string | null): BrandPalette {
  const primary = parseHex(primaryInput) ?? ANTIDOTO_PALETTE.graphic;
  const secondary = secondaryInput ? parseHex(secondaryInput) : null;

  const accent = shiftUntil(primary, INK, WHITE, 4.5);

  // Botón: el color elegido si su texto se lee (blanco, o casi negro en colores muy claros
  // como un amarillo). Si no, se oscurece lo justo para que el blanco pase AA.
  let button = primary;
  let buttonText = WHITE;
  let adjusted = false;
  if (contrast(WHITE, primary) < 4.5) {
    if (contrast(INK, primary) >= 7) buttonText = INK;
    else {
      button = shiftUntil(primary, "#000000", WHITE, 4.5);
      adjusted = true;
    }
  }

  // En el juego el botón debe distinguirse del fondo oscuro (3:1, componente de interfaz).
  const liveButton = shiftUntil(primary, WHITE, GAME_BG, 3);

  return {
    accent,
    strong: mix(accent, INK, 0.3),
    soft: secondary ?? mix(primary, WHITE, 0.3),
    graphic: primary,
    tint: mix(primary, WHITE, 0.9),
    border: mix(primary, WHITE, 0.78),
    button,
    buttonText,
    buttonSheen: mix(button, WHITE, 0.22),
    buttonGradient: `linear-gradient(135deg,${mix(button, WHITE, 0.18)},${button})`,
    buttonShadow: `0 12px 24px ${rgba(button, 0.35)}`,
    glow: rgba(button, 0.42),
    pageGradient: `linear-gradient(160deg,${mix(secondary ?? primary, WHITE, 0.9)} 0%,#FFFFFF 60%)`,
    onDark: shiftUntil(primary, WHITE, GAME_BG, 4.5),
    liveButton,
    liveButtonText: readableText(liveButton),
    adjusted,
  };
}

export function brandPalette(brand: Pick<PublicBrand, "primary" | "secondary"> | null): BrandPalette {
  return brand ? derivePalette(brand.primary, brand.secondary) : ANTIDOTO_PALETTE;
}

/**
 * Variables CSS para el contenedor de una pantalla con marca. globals.css y los tokens del
 * juego las leen con un valor por defecto, así que fuera de ese contenedor nada cambia.
 */
export function brandCssVars(p: BrandPalette): Record<`--${string}`, string> {
  return {
    "--brand-accent": p.accent,
    "--brand-strong": p.strong,
    "--brand-soft": p.soft,
    "--brand-tint": p.tint,
    "--brand-border": p.border,
    "--brand-button": p.button,
    "--brand-button-text": p.buttonText,
    "--brand-sheen": p.buttonSheen,
    "--brand-glow": p.glow,
    "--live-accent": p.onDark,
    "--live-button": p.liveButton,
    "--live-button-text": p.liveButtonText,
  };
}

/** Iniciales para el monograma de una empresa sin logo: "Grupo Acme S.A." → "GA". */
export function initials(name: string): string {
  const words = name
    .replace(/\b(s\.?a\.?s?|ltda|inc|corp)\b\.?/gi, "")
    .split(/\s+/)
    .filter((w) => /[\p{L}\p{N}]/u.test(w));
  if (words.length === 0) return "?";
  const letters = words.length === 1 ? [...words[0]].slice(0, 2) : [words[0][0], words[1][0]];
  return letters.join("").toUpperCase();
}

/** Colores sugeridos en el editor cuando el logo no da pistas. Probados contra el fondo del juego. */
export const PRESET_COLORS = [
  "#1C99CA",
  "#2563EB",
  "#4F46E5",
  "#7C3AED",
  "#C026D3",
  "#E11D48",
  "#EA580C",
  "#D97706",
  "#16A34A",
  "#0D9488",
  "#0F766E",
  "#334155",
];
