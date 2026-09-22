"use client";

import { useState } from "react";
import { closeChallengeNow } from "@/lib/live-games-actions";
import { colors, calSans } from "@/lib/theme";
import { card, secondaryButton } from "@/lib/styles";
import QrCode from "@/components/live/QrCode";

interface Props {
  matchId: number;
  pin: string;
  joinUrl: string;
  /** Fecha de cierre ya formateada en hora de Colombia. */
  closesLabel: string;
  open: boolean;
}

/** Cómo se comparte un desafío: el enlace (con el PIN adentro), el QR y el PIN suelto. */
export default function ChallengeShare({ matchId, pin, joinUrl, closesLabel, open }: Props) {
  const [copy, setCopy] = useState<"idle" | "copied" | "failed">("idle");
  const [confirmClose, setConfirmClose] = useState(false);

  // El portapapeles falla fuera de HTTPS o sin permiso: el enlace queda seleccionable a mano.
  async function copyLink() {
    try {
      await navigator.clipboard.writeText(joinUrl);
      setCopy("copied");
      setTimeout(() => setCopy((c) => (c === "copied" ? "idle" : c)), 2500);
    } catch {
      setCopy("failed");
    }
  }

  if (!open) {
    return (
      <section role="status" style={{ ...card, padding: "14px 18px", background: colors.accentTint, boxShadow: "none" }}>
        <span style={{ fontSize: 13.5, color: colors.accentDark, lineHeight: 1.5 }}>
          Este desafío ya cerró: nadie más puede jugarlo. Para otra ronda, asigna un desafío nuevo desde el juego.
        </span>
      </section>
    );
  }

  return (
    <section style={{ ...card, display: "flex", gap: 24, alignItems: "center", flexWrap: "wrap" }}>
      <QrCode value={joinUrl} size={150} label={`Código QR del desafío con el PIN ${pin}`} />
      <div style={{ display: "flex", flexDirection: "column", gap: 10, flex: "1 1 320px", minWidth: 0 }}>
        <span style={{ ...calSans, fontSize: 18, color: colors.ink }}>Comparte este enlace</span>
        <span style={{ fontSize: 13.5, color: colors.muted, lineHeight: 1.5 }}>
          Cada persona lo abre en su celular y juega cuando quiera hasta el <strong style={{ color: colors.ink }}>{closesLabel}</strong>. También
          pueden entrar en /jugar con el PIN <strong style={{ color: colors.ink, letterSpacing: 1 }}>{pin.slice(0, 3)} {pin.slice(3)}</strong>.
        </span>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <code
            style={{
              flex: "1 1 240px",
              minWidth: 0,
              padding: "10px 12px",
              borderRadius: 10,
              background: colors.accentTint,
              color: colors.accentDark,
              fontSize: 13,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              userSelect: "all",
            }}
            title={joinUrl}
          >
            {joinUrl}
          </code>
          <button type="button" className="btn-secondary" style={secondaryButton} onClick={copyLink} aria-live="polite">
            {copy === "copied" ? "¡Enlace copiado!" : "Copiar enlace"}
          </button>
        </div>
        {copy === "failed" && (
          <span style={{ fontSize: 12.5, color: colors.muted }}>No se pudo copiar solo: selecciona el enlace y cópialo a mano.</span>
        )}
        <form
          action={closeChallengeNow}
          onSubmit={(e) => {
            // Doble paso en vez de confirm(): cerrar no se puede deshacer.
            if (!confirmClose) {
              e.preventDefault();
              setConfirmClose(true);
              setTimeout(() => setConfirmClose(false), 4000);
            }
          }}
        >
          <input type="hidden" name="matchId" value={matchId} />
          <button
            type="submit"
            className="btn-text"
            style={{ background: "none", border: "none", padding: 0, cursor: "pointer", fontSize: 12.5, fontWeight: 600, color: confirmClose ? colors.danger : colors.muted }}
          >
            {confirmClose ? "¿Seguro? Toca de nuevo para cerrarlo ya" : "Cerrar el desafío ahora"}
          </button>
        </form>
      </div>
    </section>
  );
}
