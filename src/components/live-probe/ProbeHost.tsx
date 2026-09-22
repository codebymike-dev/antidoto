"use client";

// Fase 0 (prueba técnica de tiempo real). Se borra cuando exista el módulo en vivo.

import { useRef, useState } from "react";
import { sendProbePing } from "@/lib/live-probe-actions";
import type { ProbeAnswer, ProbePing } from "@/lib/live-probe";
import { colors, calSans } from "@/lib/theme";
import { card, filledButton } from "@/lib/styles";
import { useProbeChannel } from "./useProbeChannel";

interface PingRow {
  n: number;
  roundTripMs: number | null;
  answers: ProbeAnswer[];
}

export default function ProbeHost() {
  const [pings, setPings] = useState<PingRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const sentAt = useRef(new Map<number, number>());

  const { state, present } = useProbeChannel({
    watchPresence: true,
    onMessage(msg) {
      if (msg.name === "ping") {
        const ping = msg.data as ProbePing;
        const t0 = sentAt.current.get(ping.n);
        // Mismo reloj en ambos extremos: acción del servidor + publicación + entrega de Ably.
        const roundTripMs = t0 ? Date.now() - t0 : null;
        setPings((prev) => prev.map((p) => (p.n === ping.n ? { ...p, roundTripMs } : p)));
      } else if (msg.name === "answer") {
        const answer = msg.data as ProbeAnswer;
        setPings((prev) =>
          prev.map((p) => (p.n === answer.pingN ? { ...p, answers: [...p.answers, answer] } : p))
        );
      }
    },
  });

  async function ping() {
    const n = pings.length + 1;
    setError(null);
    setPings((prev) => [{ n, roundTripMs: null, answers: [] }, ...prev]);
    sentAt.current.set(n, Date.now());
    try {
      await sendProbePing(n);
    } catch {
      setError("No se pudo publicar. Revisa ABLY_API_KEY.");
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <div>
        <span style={{ fontSize: 11.5, fontWeight: 700, color: colors.accent, letterSpacing: 1 }}>
          FASE 0 · PRUEBA DE TIEMPO REAL
        </span>
        <h1 style={{ ...calSans, fontSize: 26, margin: "4px 0 0 0", color: colors.ink }}>Host de prueba</h1>
        <p style={{ color: colors.muted, fontSize: 14, margin: "6px 0 0 0" }}>
          Abre <strong>/prueba-vivo</strong> en varios celulares, envía pings y mira las latencias.
        </p>
      </div>

      <div style={{ ...card, display: "flex", gap: 24, alignItems: "center", flexWrap: "wrap" }}>
        <Stat label="Conexión" value={state} />
        <Stat label="Jugadores conectados" value={String(present)} />
        <button type="button" style={{ ...filledButton, marginLeft: "auto" }} onClick={ping} disabled={state !== "connected"}>
          Enviar ping
        </button>
      </div>
      {error && <p style={{ color: colors.danger, margin: 0 }}>{error}</p>}

      {pings.map((p) => (
        <div key={p.n} style={card}>
          <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 600, color: colors.ink }}>
            <span>Ping #{p.n}</span>
            <span style={{ color: colors.muted, fontWeight: 500 }}>
              ida y vuelta al host: {p.roundTripMs === null ? "…" : `${p.roundTripMs} ms`}
            </span>
          </div>
          {p.answers.length > 0 && (
            <ul style={{ margin: "10px 0 0 0", paddingLeft: 18, color: colors.inkSoft, fontSize: 14 }}>
              {p.answers
                .toSorted((a, b) => a.responseMs - b.responseMs)
                .map((a, i) => (
                  <li key={i}>
                    {a.nickname}: {a.responseMs} ms
                  </li>
                ))}
            </ul>
          )}
        </div>
      ))}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div style={{ fontSize: 11.5, fontWeight: 600, color: colors.muted, textTransform: "uppercase" }}>{label}</div>
      <div style={{ ...calSans, fontSize: 22, color: colors.ink }}>{value}</div>
    </div>
  );
}
