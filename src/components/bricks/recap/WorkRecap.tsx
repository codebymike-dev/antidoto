// Cierre de un reto de construcción: la foto de la obra con su título y frase, la coincidencia
// con el modelo cuando se replicaba y la pregunta de reflexión. Va dentro del pase de misión.

import { colors, calSans } from "@/lib/theme";
import type { BrandPalette } from "@/lib/brand-palette";
import type { WorkSummary } from "@/lib/build-data";

interface Props {
  work: WorkSummary;
  pal: BrandPalette;
  /** Coincidencia con el modelo (0 a 1), solo en los retos de replicar. */
  match: number | null;
  reflection: string;
}

export default function WorkRecap({ work, pal, match, reflection }: Props) {
  const stat = (value: string, label: string) => (
    <div style={{ flex: 1, padding: "10px 4px", borderRadius: 12, background: pal.tint, textAlign: "center" }}>
      <div style={{ ...calSans, fontSize: 22, color: pal.strong }}>{value}</div>
      <div style={{ fontSize: 12, color: colors.inkSoft }}>{label}</div>
    </div>
  );

  return (
    <div data-pass-item style={{ display: "flex", flexDirection: "column", gap: 14, textAlign: "left", paddingBottom: 18 }}>
      {work.hasImage && (
        <figure style={{ margin: 0, display: "flex", flexDirection: "column", gap: 10 }}>
          {/* Ruta propia que revisa la sesión: next/image no aporta nada con una sola foto privada. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`/obra/${work.participationId}`}
            alt={work.title ? `Tu obra: ${work.title}` : "Foto de tu obra"}
            style={{ width: "100%", borderRadius: 14, background: "#16222A", display: "block" }}
          />
          {work.title && (
            <figcaption style={{ display: "flex", flexDirection: "column", gap: 2 }}>
              <span style={{ ...calSans, fontSize: 19, color: colors.ink }}>{work.title}</span>
              {work.phrase && <span style={{ fontSize: 14, lineHeight: 1.5, color: colors.inkSoft }}>{work.phrase}</span>}
            </figcaption>
          )}
        </figure>
      )}

      <div style={{ display: "flex", gap: 8 }}>
        {stat(String(work.brickCount), work.brickCount === 1 ? "pieza" : "piezas")}
        {match !== null && stat(`${Math.round(match * 100)} %`, "igual al modelo")}
      </div>

      {reflection && (
        <div style={{ padding: "12px 14px", borderRadius: 12, background: "#fff", border: `1px solid ${pal.border}` }}>
          <p style={{ margin: "0 0 4px", fontSize: 11, fontWeight: 700, letterSpacing: 1, color: pal.accent }}>PARA PENSAR</p>
          <p style={{ margin: 0, fontSize: 14.5, lineHeight: 1.5, color: colors.ink }}>{reflection}</p>
        </div>
      )}

      {work.hasImage && (
        <a
          href={`/obra/${work.participationId}?descargar`}
          download
          style={{ alignSelf: "flex-start", fontSize: 14, fontWeight: 700, color: pal.strong, textDecoration: "none" }}
        >
          Descargar la foto de tu obra ›
        </a>
      )}
    </div>
  );
}
