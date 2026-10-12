// Mural de cierre (fase 7): todas las obras en una sola imagen, con su título, para entregarle a
// la empresa. Se dibuja en el navegador con un canvas 2D a partir de las fotos ya guardadas: no
// hace falta WebGL ni trabajo del servidor.

export interface MuralItem {
  /** URL de la foto (misma origen, para poder leer el canvas). */
  src: string;
  title: string;
  subtitle?: string;
  /** Categorías ganadas, por ejemplo. */
  badges?: string[];
  /** Punto de color junto al título (equipo). */
  color?: string;
}

const W = 2400;
const PAD = 96;
const GAP = 36;
const BG = "#0F181D";
const CARD = "#16222A";
const INK = "#F4F8FA";
const SOFT = "#9DB4BF";
const ACCENT = "#80DCFF";

/** Convierte una imagen PNG (data URL) en JPEG reducido, que pesa poco para subirlo. */
export async function toJpeg(src: string, maxSide = 1200, quality = 0.86): Promise<Blob | null> {
  const img = new Image();
  img.src = src;
  await img.decode();
  const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(img.width * scale);
  canvas.height = Math.round(img.height * scale);
  canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
  return new Promise((ok) => canvas.toBlob(ok, "image/jpeg", quality));
}

async function loadImage(src: string): Promise<HTMLImageElement | null> {
  const img = new Image();
  img.src = src;
  try {
    await img.decode();
    return img;
  } catch {
    // Una obra sin foto no debe impedir bajar el mural: queda su recuadro vacío.
    return null;
  }
}

/** Corta el texto con puntos suspensivos para que quepa en `max` píxeles. */
function fit(ctx: CanvasRenderingContext2D, text: string, max: number): string {
  if (ctx.measureText(text).width <= max) return text;
  let t = text;
  while (t.length > 1 && ctx.measureText(`${t}…`).width > max) t = t.slice(0, -1);
  return `${t.trimEnd()}…`;
}

function columns(n: number): number {
  if (n <= 3) return Math.max(1, n);
  if (n === 4) return 2;
  if (n <= 9) return 3;
  if (n <= 20) return 4;
  return 5;
}

export async function drawMural(opts: { heading: string; subheading: string; items: MuralItem[] }): Promise<Blob | null> {
  const display = "'Cal Sans', sans-serif";
  const poppins = getComputedStyle(document.body).getPropertyValue("--font-poppins").trim();
  const body = poppins ? `${poppins}, sans-serif` : "Poppins, sans-serif";
  await Promise.all([document.fonts.load(`64px ${display}`), document.fonts.load(`28px ${body}`)]).catch(() => undefined);

  const n = opts.items.length;
  const cols = columns(n);
  const rows = Math.max(1, Math.ceil(n / cols));
  const cardW = (W - PAD * 2 - GAP * (cols - 1)) / cols;
  const photoH = Math.round((cardW * 3) / 4);
  const s = Math.max(0.7, Math.min(1.2, cardW / 700));
  const capH = Math.round(150 * s);
  const cardH = photoH + capH;
  const headH = 230;
  const footH = 110;
  const H = PAD + headH + rows * cardH + (rows - 1) * GAP + footH;

  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = BG;
  ctx.fillRect(0, 0, W, H);

  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = ACCENT;
  ctx.font = `600 30px ${body}`;
  ctx.fillText("BRICKS SERIOUS PLAY · ANTÍDOTO", PAD, PAD + 30);
  ctx.fillStyle = INK;
  ctx.font = `88px ${display}`;
  ctx.fillText(fit(ctx, opts.heading, W - PAD * 2), PAD, PAD + 130);
  ctx.fillStyle = SOFT;
  ctx.font = `34px ${body}`;
  ctx.fillText(fit(ctx, opts.subheading, W - PAD * 2), PAD, PAD + 190);

  const images = await Promise.all(opts.items.map((it) => loadImage(it.src)));
  opts.items.forEach((it, i) => {
    const x = PAD + (i % cols) * (cardW + GAP);
    const y = PAD + headH + Math.floor(i / cols) * (cardH + GAP);
    const r = 22;
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(x, y, cardW, cardH, r);
    ctx.fillStyle = CARD;
    ctx.fill();
    ctx.clip();
    const img = images[i];
    if (img) {
      // Recorte tipo "cover": la foto llena el recuadro sin deformarse.
      const k = Math.max(cardW / img.width, photoH / img.height);
      const w = img.width * k;
      const h = img.height * k;
      ctx.drawImage(img, x + (cardW - w) / 2, y + (photoH - h) / 2, w, h);
    }
    ctx.restore();

    let tx = x + 28 * s;
    const ty = y + photoH + 56 * s;
    if (it.color) {
      ctx.beginPath();
      ctx.arc(tx + 10 * s, ty - 12 * s, 10 * s, 0, Math.PI * 2);
      ctx.fillStyle = it.color;
      ctx.fill();
      tx += 32 * s;
    }
    ctx.fillStyle = INK;
    ctx.font = `${Math.round(40 * s)}px ${display}`;
    ctx.fillText(fit(ctx, it.title, x + cardW - 28 * s - tx), tx, ty);
    const line = [it.badges?.length ? `★ ${it.badges.join(" · ")}` : null, it.subtitle].filter(Boolean).join("   ");
    if (line) {
      ctx.fillStyle = it.badges?.length ? ACCENT : SOFT;
      ctx.font = `${Math.round(26 * s)}px ${body}`;
      ctx.fillText(fit(ctx, line, cardW - 56 * s), x + 28 * s, ty + 48 * s);
    }
  });

  ctx.fillStyle = SOFT;
  ctx.font = `26px ${body}`;
  ctx.fillText(`${n} ${n === 1 ? "obra" : "obras"}`, PAD, H - PAD / 2 - 10);

  return new Promise((ok) => canvas.toBlob(ok, "image/png"));
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}
