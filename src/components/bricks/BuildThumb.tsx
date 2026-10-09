// Portada de un reto de construcción en la biblioteca: ladrillos en perspectiva isométrica, en
// SVG para que la lista no tenga que abrir WebGL. Cada tipo de reto tiene su composición.

import type { BuildKind } from "@/lib/bricks/challenges";

/** w, d, h (placas), x, y (placas), z, color. */
type Box = [number, number, number, number, number, number, string];

const C = {
  celeste: "#3BC8F3",
  abismo: "#0C5C7D",
  girasol: "#FAC80A",
  rojo: "#C91A09",
  blanco: "#F4F4F4",
  mandarina: "#F57A12",
  verde: "#00852B",
  orquidea: "#A06EB9",
  cafe: "#5F3109",
  noche: "#1A242B",
};

const SCENES: Record<BuildKind, Box[]> = {
  libre: [
    [4, 2, 3, 3, 0, 4, C.celeste],
    [2, 2, 3, 4, 3, 4, C.girasol],
    [2, 1, 3, 7, 0, 2, C.orquidea],
    [1, 1, 3, 2, 0, 7, C.rojo],
    [2, 2, 1, 6, 0, 6, C.verde],
  ],
  presupuesto: [
    [2, 2, 3, 4, 0, 4, C.celeste],
    [2, 2, 3, 4, 3, 4, C.girasol],
    [2, 2, 3, 4, 6, 4, C.rojo],
    [2, 2, 3, 4, 9, 4, C.celeste],
    [2, 2, 3, 4, 12, 4, C.girasol],
    [2, 2, 3, 4, 15, 4, C.blanco],
    [1, 1, 3, 4, 18, 4, C.mandarina],
  ],
  tema: [
    [4, 2, 3, 2, 0, 3, C.blanco],
    [4, 2, 3, 2, 0, 5, C.blanco],
    [4, 2, 3, 2, 3, 3, C.celeste],
    [4, 2, 3, 2, 3, 5, C.celeste],
    [4, 4, 1, 2, 6, 3, C.abismo],
    [1, 1, 3, 7, 0, 7, C.girasol],
    [1, 1, 3, 7, 3, 7, C.girasol],
    [2, 2, 3, 7, 0, 3, C.cafe],
    [2, 2, 3, 7, 3, 3, C.verde],
  ],
  replicar: [
    [2, 2, 3, 1, 0, 4, C.rojo],
    [2, 2, 3, 1, 3, 4, C.blanco],
    [2, 2, 1, 1, 6, 4, C.abismo],
    [2, 2, 3, 6, 0, 4, C.rojo],
    [2, 2, 3, 6, 3, 4, C.blanco],
    [2, 2, 1, 6, 6, 4, C.abismo],
  ],
  metafora: [
    [2, 2, 3, 2, 0, 4, C.orquidea],
    [2, 2, 3, 2, 3, 4, C.orquidea],
    [2, 2, 3, 7, 0, 4, C.celeste],
    [2, 2, 3, 7, 3, 4, C.celeste],
    [7, 2, 1, 2, 6, 4, C.girasol],
    [1, 1, 3, 5, 7, 4, C.mandarina],
    [1, 1, 3, 5, 10, 4, C.blanco],
  ],
};

const BASE = 10;
const S = 15;
const PH = S * 0.4;
const COS = S * 0.866;
const SIN = S * 0.5;
const OX = 200;
const OY = 40;

const pt = (x: number, y: number, z: number) => `${(OX + (x - z) * COS).toFixed(1)},${(OY + (x + z) * SIN - y * PH).toFixed(1)}`;

function shade(hex: string, f: number): string {
  const n = parseInt(hex.slice(1), 16);
  const ch = (v: number) => Math.round(f > 0 ? v + (255 - v) * f : v * (1 + f));
  return `rgb(${ch(n >> 16)},${ch((n >> 8) & 255)},${ch(n & 255)})`;
}

function Stud({ x, y, z, color }: { x: number; y: number; z: number; color: string }) {
  const [cx, cy] = pt(x, y, z).split(",").map(Number);
  const rx = S * 0.36;
  const ry = S * 0.21;
  const h = PH * 0.45;
  return (
    <g>
      <path d={`M${cx - rx},${cy} v${-h} a${rx},${ry} 0 0 0 ${rx * 2},0 v${h} a${rx},${ry} 0 0 1 ${-rx * 2},0z`} fill={shade(color, -0.18)} />
      <ellipse cx={cx} cy={cy - h} rx={rx} ry={ry} fill={shade(color, 0.22)} />
    </g>
  );
}

function Brick({ box, studs = true }: { box: Box; studs?: boolean }) {
  const [w, d, h, x, y, z, color] = box;
  const top = y + h;
  return (
    <g>
      <polygon points={[pt(x, top, z), pt(x + w, top, z), pt(x + w, top, z + d), pt(x, top, z + d)].join(" ")} fill={shade(color, 0.12)} />
      <polygon points={[pt(x, top, z + d), pt(x + w, top, z + d), pt(x + w, y, z + d), pt(x, y, z + d)].join(" ")} fill={color} />
      <polygon points={[pt(x + w, top, z), pt(x + w, top, z + d), pt(x + w, y, z + d), pt(x + w, y, z)].join(" ")} fill={shade(color, -0.25)} />
      {studs &&
        Array.from({ length: w * d }, (_, n) => {
          const i = n % w;
          const k = Math.floor(n / w);
          return <Stud key={n} x={x + i + 0.5} y={top} z={z + k + 0.5} color={color} />;
        })}
    </g>
  );
}

export default function BuildThumb({ kind, label }: { kind: BuildKind; label: string }) {
  // De atrás hacia adelante y de abajo hacia arriba: lo que está más cerca tapa lo de atrás.
  const boxes = [...SCENES[kind]].sort((a, b) => a[3] + a[5] - (b[3] + b[5]) || a[4] - b[4]);
  // Un stud de la base queda tapado si hay una pieza encima.
  const covered = new Set<string>();
  for (const [w, d, , x, y, z] of boxes) if (y === 0) for (let i = 0; i < w; i++) for (let k = 0; k < d; k++) covered.add(`${x + i},${z + k}`);
  const baseColor = "#3A5260";

  return (
    <svg viewBox="0 0 400 250" role="img" aria-label={label} style={{ display: "block", width: "100%", height: "auto", aspectRatio: "400 / 250" }}>
      <defs>
        <radialGradient id={`bt-bg-${kind}`} cx="50%" cy="30%" r="80%">
          <stop offset="0" stopColor="#24404F" />
          <stop offset="1" stopColor="#0F181D" />
        </radialGradient>
      </defs>
      <rect width="400" height="250" fill={`url(#bt-bg-${kind})`} />
      <g transform="translate(0 30)">
        <Brick box={[BASE, BASE, 1, 0, -1, 0, baseColor]} studs={false} />
        {Array.from({ length: BASE * BASE }, (_, n) => {
          const x = n % BASE;
          const z = Math.floor(n / BASE);
          return covered.has(`${x},${z}`) ? null : <Stud key={n} x={x + 0.5} y={0} z={z + 0.5} color={baseColor} />;
        })}
        {boxes.map((b, n) => (
          <Brick key={n} box={b} />
        ))}
      </g>
    </svg>
  );
}
