"use client";

// Botón "Descargar el mural" del admin: arma en el navegador una imagen con todas las obras que
// se pueden mostrar (ver mural.ts) y la baja como PNG.

import { useState } from "react";
import { colors } from "@/lib/theme";
import { downloadBlob, drawMural, type MuralItem } from "./mural";

interface Props {
  heading: string;
  subheading: string;
  items: MuralItem[];
  filename: string;
  style?: React.CSSProperties;
}

export default function MuralButton({ heading, subheading, items, filename, style }: Props) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
      <button
        type="button"
        disabled={busy || items.length === 0}
        title={items.length === 0 ? "No hay obras para mostrar" : undefined}
        onClick={async () => {
          setBusy(true);
          setError(false);
          try {
            const blob = await drawMural({ heading, subheading, items });
            if (blob) downloadBlob(blob, filename);
            else setError(true);
          } catch {
            setError(true);
          } finally {
            setBusy(false);
          }
        }}
        style={style}
      >
        {busy ? "Armando el mural…" : "Descargar el mural"}
      </button>
      {error && <span role="alert" style={{ fontSize: 12.5, color: colors.danger }}>No se pudo armar.</span>}
    </span>
  );
}
