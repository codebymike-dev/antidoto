"use client";

import { useActionState, useState } from "react";
import { assignChallenge, launchMatch, type AssignResult } from "@/lib/live-games-actions";
import { CHALLENGE_MAX_DAYS } from "@/lib/live-challenge-engine";
import { colors, calSans } from "@/lib/theme";
import { card, fieldInput, filledButton, secondaryButton } from "@/lib/styles";

interface Props {
  gameId: number;
  /** Con cambios sin guardar o sin preguntas no se puede jugar: se explica por qué. */
  blockedReason: string | null;
}

/** Valor para <input type="datetime-local"> en la hora local del navegador. */
function toLocalInput(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/** Por defecto, una semana desde hoy a las 6 p. m.: el cierre típico de una campaña. */
function defaultClose(): string {
  const d = new Date();
  d.setDate(d.getDate() + 7);
  d.setHours(18, 0, 0, 0);
  return toLocalInput(d);
}

/**
 * Las dos formas de jugar un juego: en vivo (el host proyecta y todos van al mismo
 * ritmo) o como desafío (cada quien entra con el enlace y juega a su ritmo hasta una fecha).
 */
export default function PlayPanel({ gameId, blockedReason }: Props) {
  const [assigning, setAssigning] = useState(false);
  const [closesLocal, setClosesLocal] = useState("");
  const [state, action, pending] = useActionState<AssignResult, FormData>(assignChallenge, null);
  const blocked = blockedReason !== null;

  // El servidor recibe ISO con zona: la hora que eligió el admin, sin importar dónde corre.
  const closesIso = closesLocal && !Number.isNaN(new Date(closesLocal).getTime()) ? new Date(closesLocal).toISOString() : "";
  const now = new Date();
  const max = new Date(now.getTime() + CHALLENGE_MAX_DAYS * 86_400_000);

  return (
    <section style={{ ...card, padding: "16px 18px", display: "flex", flexDirection: "column", gap: 14 }}>
      {blocked && <span style={{ fontSize: 13, color: colors.muted, lineHeight: 1.5 }}>{blockedReason}</span>}

      <div style={row}>
        <div style={text}>
          <span style={heading}>Jugar en vivo</span>
          <span style={hint}>Proyectas la pantalla y todos juegan al mismo tiempo, con PIN, QR y enlace. Como un Kahoot en vivo.</span>
        </div>
        <form action={launchMatch}>
          <input type="hidden" name="id" value={gameId} />
          <button type="submit" className="btn-filled" style={{ ...filledButton, opacity: blocked ? 0.6 : 1 }} disabled={blocked}>
            ▸ Abrir partida
          </button>
        </form>
      </div>

      <div style={{ ...row, borderTop: `1px solid ${colors.accentTint}`, paddingTop: 14 }}>
        <div style={text}>
          <span style={heading}>Desafío a su ritmo</span>
          <span style={hint}>
            Compartes un enlace y cada persona juega sola desde su celular cuando quiera, hasta la fecha de cierre. Ideal para sedes o
            turnos distintos.
          </span>
        </div>
        {!assigning && (
          <button
            type="button"
            className="btn-secondary"
            style={{ ...secondaryButton, opacity: blocked ? 0.6 : 1 }}
            disabled={blocked}
            onClick={() => {
              setClosesLocal(defaultClose());
              setAssigning(true);
            }}
          >
            Asignar desafío
          </button>
        )}
      </div>

      {assigning && (
        <form action={action} style={{ display: "flex", alignItems: "flex-end", gap: 12, flexWrap: "wrap" }}>
          <input type="hidden" name="id" value={gameId} />
          <input type="hidden" name="closesAt" value={closesIso} />
          <label style={{ display: "flex", flexDirection: "column", gap: 6, flex: "1 1 240px" }}>
            <span style={{ fontSize: 12.5, fontWeight: 600, color: colors.inkSoft }}>Se cierra el</span>
            <input
              type="datetime-local"
              required
              value={closesLocal}
              min={toLocalInput(now)}
              max={toLocalInput(max)}
              onChange={(e) => setClosesLocal(e.target.value)}
              style={fieldInput}
            />
          </label>
          <div style={{ display: "flex", gap: 10 }}>
            <button type="button" className="btn-secondary" style={secondaryButton} onClick={() => setAssigning(false)} disabled={pending}>
              Cancelar
            </button>
            <button
              type="submit"
              className="btn-filled"
              style={{ ...filledButton, opacity: blocked || pending || !closesIso ? 0.6 : 1 }}
              disabled={blocked || pending || !closesIso}
            >
              {pending ? "Creando…" : "Crear desafío"}
            </button>
          </div>
          {state && !state.ok && (
            <span role="alert" style={{ flexBasis: "100%", fontSize: 13, fontWeight: 600, color: colors.danger }}>
              {state.error}
            </span>
          )}
        </form>
      )}
    </section>
  );
}

const row: React.CSSProperties = { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 14, flexWrap: "wrap" };
const text: React.CSSProperties = { display: "flex", flexDirection: "column", gap: 4, flex: "1 1 320px" };
const heading: React.CSSProperties = { ...calSans, fontSize: 16, color: colors.ink };
const hint: React.CSSProperties = { fontSize: 13, color: colors.muted, lineHeight: 1.5 };
