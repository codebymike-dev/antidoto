import { LOGO_MAX_BYTES, LOGO_MAX_INPUT_BYTES, unsafeSvg } from "@/lib/logo-file";
import { parseHex } from "@/lib/brand-palette";

// Preparación del logo en el navegador, antes de subirlo: recorta el aire sobrante,
// lo reduce a un tamaño de pantalla, lo comprime y de paso lee sus colores y su tono.
// Así el servidor recibe siempre un archivo liviano y el editor puede sugerir colores.

/** Lado mayor del logo guardado: nítido en el proyector sin pesar de más. */
const MAX_SIDE = 640;

export interface ProcessedLogo {
  file: File;
  /** Object URL para la vista previa; hay que liberarla con URL.revokeObjectURL. */
  url: string;
  /** Colores dominantes del logo, del más al menos presente. */
  colors: string[];
  /** Fondo para el que parece pensado: un logo casi blanco es para fondo oscuro. */
  surface: "claro" | "oscuro";
  width: number;
  height: number;
}

export type ProcessResult = { ok: true; logo: ProcessedLogo } | { ok: false; error: string };

const ACCEPTED = ["image/png", "image/jpeg", "image/webp", "image/svg+xml"];

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("load"));
    img.src = url;
  });
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality?: number): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, type, quality));
}

type Rgb = [number, number, number];

const near = (d: Uint8ClampedArray, i: number, c: Rgb, tolerance: number) =>
  Math.abs(d[i] - c[0]) + Math.abs(d[i + 1] - c[1]) + Math.abs(d[i + 2] - c[2]) <= tolerance;

/**
 * Color de fondo de una imagen sin transparencia (un JPG, un PNG con fondo blanco): el de
 * las cuatro esquinas, si coinciden. Null si la imagen ya tiene fondo transparente.
 */
function solidBackground(data: ImageData): Rgb | null {
  const { width: w, height: h, data: d } = data;
  const corners = [0, (w - 1) * 4, (h - 1) * w * 4, ((h - 1) * w + w - 1) * 4];
  if (corners.some((i) => d[i + 3] < 250)) return null;
  const first: Rgb = [d[0], d[1], d[2]];
  return corners.every((i) => near(d, i, first, 30)) ? first : null;
}

/** Caja del contenido: lo visible (alfa > 8) que no es el fondo. Null si no hay nada. */
function contentBounds(data: ImageData, bg: Rgb | null) {
  const { width, height, data: d } = data;
  let [top, left, right, bottom] = [height, width, -1, -1];
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      if (d[i + 3] > 8 && !(bg && near(d, i, bg, 30))) {
        if (y < top) top = y;
        if (y > bottom) bottom = y;
        if (x < left) left = x;
        if (x > right) right = x;
      }
    }
  }
  if (right < 0) return null;
  // Un respiro alrededor cuando el logo trae fondo propio, para que no quede pegado al borde.
  const pad = bg ? Math.round(Math.max(right - left, bottom - top) * 0.06) : 0;
  const x = Math.max(0, left - pad);
  const y = Math.max(0, top - pad);
  return { x, y, w: Math.min(width, right + pad + 1) - x, h: Math.min(height, bottom + pad + 1) - y };
}

/**
 * Colores dominantes: se agrupan los píxeles visibles en cubetas de 16 niveles por canal
 * y se descartan blancos, negros y grises (no sirven como acento). Luego se quitan los
 * que se parecen demasiado a uno ya elegido.
 */
function dominantColors(data: ImageData, max = 5): string[] {
  const buckets = new Map<number, { n: number; r: number; g: number; b: number }>();
  const d = data.data;
  for (let i = 0; i < d.length; i += 4) {
    if (d[i + 3] < 200) continue;
    const [r, g, b] = [d[i], d[i + 1], d[i + 2]];
    const hi = Math.max(r, g, b);
    const lo = Math.min(r, g, b);
    if (hi - lo < 28) continue;
    const key = ((r >> 4) << 8) | ((g >> 4) << 4) | (b >> 4);
    const bucket = buckets.get(key) ?? { n: 0, r: 0, g: 0, b: 0 };
    bucket.n++;
    bucket.r += r;
    bucket.g += g;
    bucket.b += b;
    buckets.set(key, bucket);
  }
  const sorted = [...buckets.values()].sort((a, b) => b.n - a.n);
  const picked: Rgb[] = [];
  for (const { n, r, g, b } of sorted) {
    const c: Rgb = [r / n, g / n, b / n];
    if (picked.some((p) => Math.hypot(p[0] - c[0], p[1] - c[1], p[2] - c[2]) < 70)) continue;
    picked.push(c);
    if (picked.length === max) break;
  }
  return picked.map((c) => parseHex(c.map((v) => Math.round(v).toString(16).padStart(2, "0")).join(""))!);
}

/** Luminancia media de lo visible: por encima de 0.8 el logo es blanco o casi. */
function surfaceFor(data: ImageData): "claro" | "oscuro" {
  const d = data.data;
  let [sum, n] = [0, 0];
  for (let i = 0; i < d.length; i += 4) {
    if (d[i + 3] < 128) continue;
    sum += (0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2]) / 255;
    n++;
  }
  return n > 0 && sum / n > 0.8 ? "oscuro" : "claro";
}

function analyze(img: HTMLImageElement, sourceWidth: number, sourceHeight: number) {
  // Una muestra chica basta para leer colores y tono.
  const scale = Math.min(1, 96 / Math.max(sourceWidth, sourceHeight));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(sourceWidth * scale));
  canvas.height = Math.max(1, Math.round(sourceHeight * scale));
  const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  const data = ctx.getImageData(0, 0, canvas.width, canvas.height);
  return { colors: dominantColors(data), surface: surfaceFor(data) };
}

async function processSvg(file: File): Promise<ProcessResult> {
  if (file.size > LOGO_MAX_BYTES) {
    return { ok: false, error: "Este SVG pesa más de 200 KB. Simplifícalo o súbelo como PNG." };
  }
  const text = await file.text();
  if (unsafeSvg(text)) {
    return { ok: false, error: "Este SVG trae código o enlaces externos. Expórtalo de nuevo como SVG simple o como PNG." };
  }
  const url = URL.createObjectURL(file);
  try {
    const img = await loadImage(url);
    // Un SVG sin width/height puede medir 0: se toma una caja nominal para leerlo.
    const w = img.naturalWidth || 300;
    const h = img.naturalHeight || 150;
    return { ok: true, logo: { file, url, width: w, height: h, ...analyze(img, w, h) } };
  } catch {
    URL.revokeObjectURL(url);
    return { ok: false, error: "No pudimos leer este SVG. Prueba exportándolo de nuevo o como PNG." };
  }
}

async function processRaster(file: File): Promise<ProcessResult> {
  const sourceUrl = URL.createObjectURL(file);
  let img: HTMLImageElement;
  try {
    img = await loadImage(sourceUrl);
  } catch {
    URL.revokeObjectURL(sourceUrl);
    return { ok: false, error: "No pudimos abrir esta imagen. ¿Está dañada?" };
  }
  URL.revokeObjectURL(sourceUrl);

  const full = document.createElement("canvas");
  full.width = img.naturalWidth;
  full.height = img.naturalHeight;
  const fctx = full.getContext("2d", { willReadFrequently: true })!;
  fctx.drawImage(img, 0, 0);
  const pixels = fctx.getImageData(0, 0, full.width, full.height);
  const bg = solidBackground(pixels);
  const bounds = contentBounds(pixels, bg);
  if (!bounds) return { ok: false, error: "La imagen está vacía: no encontramos el logo dentro." };

  // Se recorta el aire sobrante y se reduce (nunca se amplía) al tamaño de pantalla.
  const scale = Math.min(1, MAX_SIDE / Math.max(bounds.w, bounds.h));
  const out = document.createElement("canvas");
  out.width = Math.max(1, Math.round(bounds.w * scale));
  out.height = Math.max(1, Math.round(bounds.h * scale));
  const octx = out.getContext("2d")!;
  octx.imageSmoothingQuality = "high";
  octx.drawImage(full, bounds.x, bounds.y, bounds.w, bounds.h, 0, 0, out.width, out.height);

  // WebP conserva la transparencia y pesa mucho menos que PNG. Si el navegador no sabe
  // codificarlo, toBlob devuelve PNG: se acepta igual si cabe.
  let blob: Blob | null = null;
  for (const quality of [0.92, 0.85, 0.75, 0.6]) {
    blob = await canvasToBlob(out, "image/webp", quality);
    if (blob && blob.size <= LOGO_MAX_BYTES) break;
  }
  if (!blob || blob.size > LOGO_MAX_BYTES) {
    return { ok: false, error: "No logramos dejar el logo por debajo de 200 KB. Prueba con una versión más simple." };
  }

  const ext = blob.type === "image/webp" ? "webp" : "png";
  const processed = new File([blob], `logo.${ext}`, { type: blob.type });
  const url = URL.createObjectURL(processed);
  const shown = await loadImage(url);
  const read = analyze(shown, out.width, out.height);
  // Con fondo propio, el logo está pensado para ese fondo, no para el tono de sus trazos.
  const surface = bg ? (0.2126 * bg[0] + 0.7152 * bg[1] + 0.0722 * bg[2] > 128 ? "claro" : "oscuro") : read.surface;
  return { ok: true, logo: { file: processed, url, width: out.width, height: out.height, colors: read.colors, surface } };
}

export async function processLogo(file: File): Promise<ProcessResult> {
  if (!ACCEPTED.includes(file.type)) return { ok: false, error: "Formato no admitido. Usa PNG, JPG, WebP o SVG." };
  if (file.size > LOGO_MAX_INPUT_BYTES) return { ok: false, error: "La imagen pesa más de 8 MB. Usa una versión más liviana." };
  return file.type === "image/svg+xml" ? processSvg(file) : processRaster(file);
}

/** Lee colores y tono de un logo ya guardado (al editar), para ofrecer las mismas sugerencias. */
export async function analyzeLogoUrl(url: string): Promise<{ colors: string[]; surface: "claro" | "oscuro" } | null> {
  try {
    const img = await loadImage(url);
    return analyze(img, img.naturalWidth || 300, img.naturalHeight || 150);
  } catch {
    return null;
  }
}
