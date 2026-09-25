// Trazos de guilloche: las rosetas de líneas finas de los billetes y los pases impresos.
// Son hipotrocoides (un círculo que rueda dentro de otro, con el lápiz fuera del centro).
// Se calculan en el servidor y viajan como un <path> SVG: cero JS en el cliente.

function gcd(a: number, b: number): number {
  return b === 0 ? a : gcd(b, a % b);
}

export interface RosetteOptions {
  /** Radio del círculo fijo. Entero, para que la curva se cierre. */
  R: number;
  /** Radio del círculo que rueda. Entero. */
  r: number;
  /** Distancia del lápiz al centro del círculo que rueda. */
  d: number;
  /** Puntos por vuelta completa del círculo fijo. */
  steps?: number;
  cx?: number;
  cy?: number;
}

/** Puntos de la hipotrocoide, del inicio hasta que la curva vuelve a cerrarse. */
export function rosettePoints({ R, r, d, steps = 90, cx = 0, cy = 0 }: RosetteOptions): [number, number][] {
  const turns = r / gcd(R, r);
  const total = Math.round(steps * turns);
  const k = (R - r) / r;
  const points: [number, number][] = [];
  for (let i = 0; i <= total; i++) {
    const t = (i / total) * turns * Math.PI * 2;
    points.push([cx + (R - r) * Math.cos(t) + d * Math.cos(k * t), cy + (R - r) * Math.sin(t) - d * Math.sin(k * t)]);
  }
  return points;
}

/** La curva como atributo `d` de un <path>, en enteros: a esta escala no se nota y pesa la mitad. */
export function rosettePath(options: RosetteOptions): string {
  const pts = rosettePoints(options);
  return (
    pts.map(([x, y], i) => `${i === 0 ? "M" : "L"}${Math.round(x)} ${Math.round(y)}`).join("") + "Z"
  );
}
