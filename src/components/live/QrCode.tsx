import { encode } from "uqr";

/** QR como SVG propio (sin HTML inyectado). Fondo blanco con margen para que se lea desde lejos. */
export default function QrCode({ value, size = 180, label }: { value: string; size?: number; label: string }) {
  const { data, size: n } = encode(value, { ecc: "M" });
  const margin = 2;
  const total = n + margin * 2;
  let path = "";
  data.forEach((row, y) =>
    row.forEach((on, x) => {
      if (on) path += `M${x + margin},${y + margin}h1v1h-1z`;
    })
  );
  return (
    <svg
      role="img"
      aria-label={label}
      width={size}
      height={size}
      viewBox={`0 0 ${total} ${total}`}
      shapeRendering="crispEdges"
      style={{ background: "#fff", borderRadius: 12, display: "block" }}
    >
      <path d={path} fill="#0F181D" />
    </svg>
  );
}
