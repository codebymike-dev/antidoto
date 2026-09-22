"use client";

import { useState } from "react";
import QrCode from "../QrCode";
import { calSans, formatPin, game, liveButton, liveGhostButton } from "../game-theme";

interface Props {
  pin: string;
  joinHost: string;
  joinUrl: string;
  nicknames: string[];
  joinLocked: boolean;
  busy: boolean;
  onStart: () => void;
  onToggleLock: () => void;
  onKick: (nickname: string) => void;
}

export default function HostLobby({ pin, joinHost, joinUrl, nicknames, joinLocked, busy, onStart, onToggleLock, onKick }: Props) {
  const [confirming, setConfirming] = useState<string | null>(null);
  const [copy, setCopy] = useState<"idle" | "copied" | "failed">("idle");

  // El portapapeles falla fuera de HTTPS o sin permiso: en ese caso se muestra el enlace para copiarlo a mano.
  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(joinUrl);
      setCopy("copied");
      setTimeout(() => setCopy((c) => (c === "copied" ? "idle" : c)), 2500);
    } catch {
      setCopy("failed");
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 28, alignItems: "center", width: "100%" }}>
      <section
        className="live-rise"
        style={{
          display: "flex",
          alignItems: "center",
          gap: "clamp(20px, 4vw, 56px)",
          background: "#fff",
          color: game.bg,
          borderRadius: 24,
          padding: "clamp(18px, 3vw, 32px) clamp(24px, 4vw, 48px)",
          flexWrap: "wrap",
          justifyContent: "center",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <span style={{ fontSize: "clamp(16px, 1.6vw, 24px)", fontWeight: 600 }}>
            Únete en <strong style={{ color: "#1C99CA" }}>{joinHost}/jugar</strong>
          </span>
          <span style={{ fontSize: "clamp(13px, 1.2vw, 18px)", fontWeight: 600, color: "#5C7680" }}>PIN del juego</span>
          <span style={{ ...calSans, fontSize: "clamp(56px, 9vw, 132px)", lineHeight: 1, letterSpacing: 4 }}>{formatPin(pin)}</span>
        </div>
        <QrCode value={joinUrl} size={170} label={`Código QR para unirse con el PIN ${pin}`} />
      </section>

      <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap", justifyContent: "center" }}>
        <span style={{ ...calSans, fontSize: "clamp(22px, 2.4vw, 34px)" }} aria-live="polite">
          {nicknames.length === 1 ? "1 jugador" : `${nicknames.length} jugadores`}
        </span>
        <button type="button" className="btn-live" style={liveGhostButton} onClick={copyLink} aria-live="polite">
          {copy === "copied" ? "¡Enlace copiado!" : "Copiar enlace"}
        </button>
        <button type="button" className="btn-live" style={liveGhostButton} onClick={onToggleLock} disabled={busy}>
          {joinLocked ? "Abrir la entrada" : "Cerrar la entrada"}
        </button>
        <button
          type="button"
          className="btn-live"
          style={{ ...liveButton, height: 56, fontSize: 18, padding: "0 34px", opacity: nicknames.length === 0 ? 0.5 : 1 }}
          onClick={onStart}
          disabled={busy || nicknames.length === 0}
        >
          Comenzar
        </button>
      </div>

      {copy === "failed" && (
        <p style={{ margin: 0, color: game.muted, fontSize: 15, userSelect: "all", wordBreak: "break-all", textAlign: "center" }}>
          {joinUrl}
        </p>
      )}

      {joinLocked && (
        <p style={{ margin: 0, color: game.muted, fontSize: 15 }}>La entrada está cerrada: nadie más puede unirse.</p>
      )}

      {nicknames.length === 0 ? (
        <p style={{ margin: 0, color: game.muted, fontSize: "clamp(16px, 1.6vw, 22px)" }}>Esperando jugadores…</p>
      ) : (
        <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexWrap: "wrap", gap: 10, justifyContent: "center", maxWidth: 1200 }}>
          {nicknames.map((n) => (
            <li key={n} className="live-pop">
              <button
                type="button"
                className="btn-live"
                title={confirming === n ? "Tocar de nuevo para sacarlo" : "Tocar para sacar de la partida"}
                onClick={() => {
                  if (confirming === n) {
                    setConfirming(null);
                    onKick(n);
                  } else {
                    setConfirming(n);
                    setTimeout(() => setConfirming((c) => (c === n ? null : c)), 3000);
                  }
                }}
                style={{
                  padding: "10px 18px",
                  borderRadius: 999,
                  border: "none",
                  cursor: "pointer",
                  fontWeight: 700,
                  fontSize: "clamp(15px, 1.4vw, 20px)",
                  background: confirming === n ? game.danger : game.surfaceStrong,
                  color: game.text,
                }}
              >
                {confirming === n ? `¿Sacar a ${n}?` : n}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
