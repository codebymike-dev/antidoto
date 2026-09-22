"use client";

// Fase 0 (prueba técnica de tiempo real). Se borra cuando exista el módulo en vivo.

import { useState } from "react";
import { answerProbe } from "@/lib/live-probe-actions";
import type { ProbePing } from "@/lib/live-probe";
import { colors, calSans } from "@/lib/theme";
import { card, fieldInput, primaryButton } from "@/lib/styles";
import { useProbeChannel } from "./useProbeChannel";

export default function ProbePlayer() {
  const [draft, setDraft] = useState("");
  const [nickname, setNickname] = useState("");

  if (!nickname) {
    return (
      <form
        style={{ ...card, display: "flex", flexDirection: "column", gap: 12 }}
        onSubmit={(e) => {
          e.preventDefault();
          if (draft.trim()) setNickname(draft.trim());
        }}
      >
        <h1 style={{ ...calSans, fontSize: 24, margin: 0, color: colors.ink }}>Prueba en vivo</h1>
        <input style={fieldInput} placeholder="Tu apodo" maxLength={24} value={draft} onChange={(e) => setDraft(e.target.value)} />
        <button type="submit" style={primaryButton}>
          Entrar
        </button>
      </form>
    );
  }

  return <Connected nickname={nickname} />;
}

function Connected({ nickname }: { nickname: string }) {
  const [ping, setPing] = useState<(ProbePing & { lagMs: number }) | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  const { state } = useProbeChannel({
    enterPresence: { nickname },
    onMessage(msg) {
      if (msg.name !== "ping") return;
      const p = msg.data as ProbePing;
      // Aproximado: compara el reloj del celular con el del servidor.
      setPing({ ...p, lagMs: Date.now() - p.serverAt });
      setResult(null);
    },
  });

  async function answer() {
    if (!ping) return;
    setSending(true);
    const res = await answerProbe(ping.id, ping.n, nickname);
    setSending(false);
    setResult(res.error ?? `Respondiste en ${res.responseMs} ms (reloj del servidor)`);
    setPing(null);
  }

  return (
    <div style={{ ...card, display: "flex", flexDirection: "column", gap: 14, textAlign: "center" }}>
      <div style={{ fontSize: 13, color: colors.muted }}>
        {nickname} · conexión: <strong>{state}</strong>
      </div>
      {ping ? (
        <>
          <div style={{ ...calSans, fontSize: 22, color: colors.ink }}>Ping #{ping.n}</div>
          <div style={{ fontSize: 13, color: colors.muted }}>llegó con ~{ping.lagMs} ms de retraso</div>
          <button type="button" style={{ ...primaryButton, height: 88, fontSize: 20 }} onClick={answer} disabled={sending}>
            ¡Responder!
          </button>
        </>
      ) : (
        <div style={{ color: colors.inkSoft, padding: "24px 0" }}>Esperando al host…</div>
      )}
      {result && <div style={{ color: colors.accentDark, fontWeight: 600 }}>{result}</div>}
    </div>
  );
}
