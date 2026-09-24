// Iconos pixel para la interfaz de la escena (monedero, barra de herramientas, insignias).
// Cada icono es una grilla de caracteres; cada carácter es un color. Se dibujan como SVG
// con bordes duros, así escalan nítidos a cualquier tamaño.

const PALETTE: Record<string, string> = {
  k: "#0f181d",
  w: "#ffffff",
  g: "#c9d3d8",
  b: "#6b3a1f",
  B: "#9a5a2e",
  l: "#c98a4b",
  y: "#ffd23f",
  Y: "#f2a81d",
  r: "#d8402f",
  R: "#9c2019",
  c: "#3bc8f3",
  C: "#1c99ca",
  d: "#0c5c7d",
  e: "#3e9b4f",
  E: "#2c7a3b",
  s: "#8a969c",
  h: "#ecdcab",
  H: "#c9b27c",
  z: "#2b2320",
  m: "#c98d5f",
  n: "#a8714a",
};

const ICONS = {
  grano: [
    "...kkkk...",
    "..kBBBBk..",
    ".kBlBBbBk.",
    ".kBlBbBBk.",
    "kBlBBbBBBk",
    "kBBBbBBBBk",
    ".kBBbBBBk.",
    ".kBbBBBbk.",
    "..kbBBbk..",
    "...kkkk...",
  ],
  riesgo: [
    "....kk....",
    "...kyyk...",
    "...kyyk...",
    "..kykkyk..",
    "..kykkyk..",
    ".kyykkyyk.",
    ".kyyyyyyk.",
    "kyyykkyyyk",
    "kyyyyyyyyk",
    "kkkkkkkkkk",
  ],
  pista: [
    "...kkkk...",
    "..kyyyyk..",
    ".kywyyyYk.",
    ".kwyyyyYk.",
    ".kyyyyyYk.",
    "..kyyyYk..",
    "...kyYk...",
    "...kggk...",
    "...kssk...",
    "....kk....",
  ],
  zonas: [
    "kkkkkkkkkk",
    "kwwwwwwwwk",
    "kwckwkkkwk",
    "kwwwwwwwwk",
    "kwckwkkkwk",
    "kwwwwwwwwk",
    "kwckwkkwwk",
    "kwwwwwwwwk",
    "kkkkkkkkkk",
  ],
  repetir: [
    "..kkkkk...",
    ".kccccck..",
    "kckkkkkcck",
    "kck...kcck",
    "kck..kccck",
    "kck.......",
    "kck....kk.",
    ".kccccckk.",
    "..kkkkkk..",
  ],
  sonido: ["....kk....", "...kwk..k.", "kkkwwk.k.k", "kwwwwk..k.", "kwwwwk..k.", "kkkwwk.k.k", "...kwk..k.", "....kk...."],
  mudo: ["....kk....", "...kwk....", "kkkwwkr..r", "kwwwwk.rr.", "kwwwwk.rr.", "kkkwwkr..r", "...kwk....", "....kk...."],
  check: [
    "........kk",
    ".......kek",
    "......keEk",
    "kk...keEk.",
    "kek.keEk..",
    "kEekeEk...",
    ".kEeEk....",
    "..kEk.....",
    "...k......",
  ],
  cruz: ["kk....kk", "krk..krk", ".krkkrk.", "..krrk..", "..krrk..", ".krkkrk.", "krk..krk", "kk....kk"],
  candado: ["..kkkk..", ".kggggk.", ".kg..gk.", "kkkkkkkk", "kyyyyyyk", "kyyYYyyk", "kyyYYyyk", "kyyyyyyk", "kkkkkkkk"],
  puerta: ["kkkkkkk.", "kBBBBBk.", "kBllBBk.", "kBllBBk.", "kBBBByk.", "kBBBBBk.", "kBllBBk.", "kBBBBBk.", "kkkkkkk."],
  ramiro: [
    "...kkkk...",
    "..khhhhk..",
    "..kzzzzk..",
    "kkhhhhhhkk",
    ".knmmmmmk.",
    ".knmmkmmk.",
    ".knmmmmmk.",
    ".knmzzzmk.",
    "..knmmmk..",
    "...kkkk...",
  ],
  fabio: [
    "..........",
    "...kkkk...",
    "..kddddk..",
    ".kddddddkk",
    ".knmmmmmmk",
    ".knmmkmmk.",
    ".knmmmmmk.",
    ".knmzzzmk.",
    "..knmmmk..",
    "...kkkk...",
  ],
  luz: [
    "...kkkk...",
    "..kzzzzk..",
    ".kzzzzzzk.",
    "kzzmmmmmzk",
    "kznmmmmmzk",
    "kznmmkmmzk",
    "kznmmmmmzk",
    "kznmmrmmzk",
    "kz.knmmmk.",
    "k...kkkk..",
  ],
  sara: [
    ".kkkk.....",
    "kzzzzkkk..",
    "kzzzzzzzk.",
    ".kzmmmmmzk",
    ".knmmmmmzk",
    ".knmmkmmk.",
    ".knmmmmmk.",
    ".knmmrmmk.",
    "..knmmmk..",
    "...kkkk...",
  ],
  insignia: [
    "kkkkkkkkkkkkkk",
    "kccccccccccCCk",
    "kcwcckkkkcCCCk",
    "kccckBBlBkCCCk",
    "kcckBBlBBBkCCk",
    "kcckBlBBbBkCCk",
    "kcckBBBbBBkCCk",
    "kcckBBbBBBkCCk",
    "kccckBbBBkCCCk",
    "kcccckkkkCCCCk",
    ".kccccccCCCCk.",
    ".kcccyyyyCCCk.",
    "..kccyyyyCCk..",
    "...kcccCCCk...",
    "....kccCCk....",
    ".....kCCk.....",
    "......kk......",
  ],
} as const;

export type PixelIconName = keyof typeof ICONS;

export default function PixelIcon({ name, size = 18, title }: { name: PixelIconName; size?: number; title?: string }) {
  const rows = ICONS[name];
  const w = Math.max(...rows.map((r) => r.length));
  const h = rows.length;
  const rects: { x: number; y: number; c: string }[] = [];
  rows.forEach((row, y) => {
    [...row].forEach((ch, x) => {
      const c = PALETTE[ch];
      if (c) rects.push({ x, y, c });
    });
  });
  return (
    <svg
      width={size}
      height={(size * h) / w}
      viewBox={`0 0 ${w} ${h}`}
      shapeRendering="crispEdges"
      aria-hidden={title ? undefined : true}
      role={title ? "img" : undefined}
      style={{ display: "block", flexShrink: 0 }}
    >
      {title && <title>{title}</title>}
      {rects.map((r, i) => (
        <rect key={i} x={r.x} y={r.y} width={1} height={1} fill={r.c} />
      ))}
    </svg>
  );
}
