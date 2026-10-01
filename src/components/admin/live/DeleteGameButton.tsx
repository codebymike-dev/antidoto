"use client";

import { useState } from "react";
import { colors } from "@/lib/theme";

/** Doble paso en vez de confirm(): borrar no se puede deshacer. */
export default function DeleteGameButton({
  id,
  action,
  matches,
}: {
  id: number;
  action: (formData: FormData) => void | Promise<void>;
  matches: number;
}) {
  const [asking, setAsking] = useState(false);
  const base = { background: "none", border: "none", cursor: "pointer", fontSize: 12.5, fontWeight: 600 } as const;

  if (!asking) {
    return (
      <button type="button" className="btn-text" style={{ ...base, color: colors.danger }} onClick={() => setAsking(true)}>
        Eliminar
      </button>
    );
  }
  return (
    <form action={action} style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <input type="hidden" name="id" value={id} />
      <span style={{ fontSize: 12, color: colors.muted }}>
        {matches > 0 ? `Se borran también ${matches === 1 ? "su partida" : `sus ${matches} partidas`}.` : "No se puede deshacer."}
      </span>
      <button type="submit" className="btn-text" style={{ ...base, color: colors.danger }}>
        Confirmar
      </button>
      <button type="button" className="btn-text" style={{ ...base, color: colors.muted }} onClick={() => setAsking(false)}>
        Cancelar
      </button>
    </form>
  );
}
