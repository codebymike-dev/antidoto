"use client";

import { useActionState } from "react";
import { launchTeamSession, type LaunchState } from "@/lib/brick-actions";
import { TEAM_SIZES } from "@/lib/bricks/team";
import { colors } from "@/lib/theme";
import { fieldLabel, filledButton } from "@/lib/styles";

function minutes(seconds: number) {
  return seconds % 60 === 0 ? `${seconds / 60} min` : `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")} min`;
}

/** Tamaño de equipo y duración, y a la pantalla del proyector. */
export default function TeamLaunchForm({ mode, times }: { mode: string; times: number[] }) {
  const [state, action, pending] = useActionState<LaunchState, FormData>(launchTeamSession, null);

  return (
    <form action={action} style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <input type="hidden" name="mode" value={mode} />
      <fieldset style={fieldset}>
        <legend style={fieldLabel}>Personas por equipo</legend>
        <div style={row}>
          {TEAM_SIZES.map((n) => (
            <label key={n} style={choice}>
              <input type="radio" name="teamSize" value={n} defaultChecked={n === 4} required />
              {n}
            </label>
          ))}
        </div>
        <span style={hint}>Los equipos se arman solos a medida que la gente entra, siempre parejos.</span>
      </fieldset>
      <fieldset style={fieldset}>
        <legend style={fieldLabel}>Tiempo para construir</legend>
        <div style={row}>
          {[...times].sort((a, b) => a - b).map((t) => (
            <label key={t} style={choice}>
              <input type="radio" name="timeLimit" value={t} defaultChecked={t === times[0]} required />
              {minutes(t)}
            </label>
          ))}
        </div>
        <span style={hint}>Desde el proyector se puede sumar un minuto o terminar antes.</span>
      </fieldset>
      {state?.error && (
        <p role="alert" style={{ margin: 0, fontSize: 13, color: colors.danger, fontWeight: 600 }}>
          {state.error}
        </p>
      )}
      <button type="submit" className="btn-filled" disabled={pending} style={{ ...filledButton, alignSelf: "flex-start", height: 48, padding: "0 24px", fontSize: 15 }}>
        {pending ? "Abriendo la sala…" : "▸ Abrir la sala en el proyector"}
      </button>
    </form>
  );
}

const fieldset: React.CSSProperties = { border: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 8 };
const row: React.CSSProperties = { display: "flex", gap: 8, flexWrap: "wrap" };
const choice: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 8,
  padding: "10px 16px",
  borderRadius: 12,
  border: `1.5px solid ${colors.border}`,
  background: "#fff",
  fontSize: 15,
  fontWeight: 600,
  color: colors.ink,
  cursor: "pointer",
};
const hint: React.CSSProperties = { fontSize: 12.5, color: colors.muted, lineHeight: 1.45 };
