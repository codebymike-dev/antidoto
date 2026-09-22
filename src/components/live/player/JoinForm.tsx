"use client";

import { useState } from "react";
import type { ChallengeSnapshot, PlayerSnapshot } from "@/lib/live-protocol";
import { NICKNAME_MAX } from "@/lib/live-engine";
import PolicyModal from "@/components/PolicyModal";
import { LOGO_SRC } from "@/lib/theme";
import { calSans, game, liveButton } from "../game-theme";

interface Props {
  initialPin: string;
  policyText: string;
  termsText: string;
  onJoined: (snapshot: PlayerSnapshot | ChallengeSnapshot) => void;
}

export default function JoinForm({ initialPin, policyText, termsText, onJoined }: Props) {
  const [step, setStep] = useState<"pin" | "nickname">(initialPin.length === 6 ? "nickname" : "pin");
  const [pin, setPin] = useState(initialPin);
  const [nickname, setNickname] = useState("");
  const [accepted, setAccepted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [policyTab, setPolicyTab] = useState<"privacidad" | "terminos" | null>(null);

  async function join(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!accepted) return setError("Debes aceptar la política de tratamiento de datos.");
    setSending(true);
    try {
      const res = await fetch("/api/live/join", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ pin, nickname, acceptedPolicy: accepted }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "No se pudo entrar.");
        // Un PIN que no existe se corrige en el paso anterior.
        if (res.status === 404) setStep("pin");
        return;
      }
      const me = await fetch("/api/live/me", { cache: "no-store" });
      if (me.ok) onJoined(await me.json());
      else setError("Entraste, pero no pudimos cargar la partida. Recarga la página.");
    } catch {
      setError("Sin conexión. Revisa tu internet.");
    } finally {
      setSending(false);
    }
  }

  return (
    <main style={{ position: "relative", flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 24, padding: "32px 16px" }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={LOGO_SRC} alt="Antídoto" style={{ height: 40 }} />

      {step === "pin" ? (
        <form
          className="live-rise"
          onSubmit={(e) => {
            e.preventDefault();
            setError(null);
            if (pin.length !== 6) return setError("El PIN tiene 6 dígitos.");
            setStep("nickname");
          }}
          style={card}
        >
          <label htmlFor="pin" style={{ ...calSans, fontSize: 22, color: game.bg, textAlign: "center" }}>
            PIN del juego
          </label>
          <input
            id="pin"
            inputMode="numeric"
            autoComplete="off"
            autoFocus
            placeholder="123 456"
            value={pin.length > 3 ? `${pin.slice(0, 3)} ${pin.slice(3)}` : pin}
            onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
            style={{ ...input, ...calSans, textAlign: "center", fontSize: 30, letterSpacing: 4 }}
          />
          <button type="submit" className="btn-live" style={{ ...liveButton, height: 54, fontSize: 17 }}>
            Entrar
          </button>
          {error && <ErrorText text={error} />}
        </form>
      ) : (
        <form className="live-rise" onSubmit={join} style={card}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", color: "#5C7680", fontSize: 13 }}>
            <span>
              PIN <strong style={{ color: game.bg }}>{pin.slice(0, 3)} {pin.slice(3)}</strong>
            </span>
            <button type="button" onClick={() => setStep("pin")} style={linkButton}>
              Cambiar
            </button>
          </div>
          <label htmlFor="nickname" style={{ ...calSans, fontSize: 22, color: game.bg, textAlign: "center" }}>
            ¿Cómo te llamamos?
          </label>
          <input
            id="nickname"
            autoComplete="nickname"
            autoFocus
            maxLength={NICKNAME_MAX}
            placeholder="Tu apodo"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            style={{ ...input, textAlign: "center", fontSize: 20, fontWeight: 600 }}
          />
          <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
            <input id="accepted" type="checkbox" aria-label="Acepto la política de tratamiento de datos y los términos y condiciones" checked={accepted} onChange={(e) => setAccepted(e.target.checked)} style={{ marginTop: 3 }} />
            <label htmlFor="accepted" style={{ fontSize: 12.5, color: "#5C7680", lineHeight: 1.45 }}>
              Acepto la{" "}
              <button type="button" onClick={() => setPolicyTab("privacidad")} style={linkButton}>
                política de tratamiento de datos
              </button>{" "}
              y los{" "}
              <button type="button" onClick={() => setPolicyTab("terminos")} style={linkButton}>
                términos y condiciones
              </button>
              .
            </label>
          </div>
          <button type="submit" disabled={sending || !nickname.trim()} className="btn-live" style={{ ...liveButton, height: 54, fontSize: 17, opacity: sending || !nickname.trim() ? 0.6 : 1 }}>
            {sending ? "Entrando…" : "¡Vamos!"}
          </button>
          {error && <ErrorText text={error} />}
        </form>
      )}

      {policyTab && (
        <PolicyModal tab={policyTab} onTab={setPolicyTab} onClose={() => setPolicyTab(null)} policyText={policyText} termsText={termsText} />
      )}
    </main>
  );
}

function ErrorText({ text }: { text: string }) {
  return (
    <span role="alert" style={{ fontSize: 13.5, color: "#C0392B", fontWeight: 600, textAlign: "center" }}>
      {text}
    </span>
  );
}

const card: React.CSSProperties = {
  width: "100%",
  maxWidth: 380,
  background: "#fff",
  borderRadius: 20,
  padding: 22,
  display: "flex",
  flexDirection: "column",
  gap: 14,
};

const input: React.CSSProperties = {
  height: 56,
  borderRadius: 12,
  border: "2px solid #CFEFFB",
  padding: "0 14px",
  color: game.bg,
  width: "100%",
};

const linkButton: React.CSSProperties = {
  background: "none",
  border: "none",
  padding: 0,
  color: "#1C99CA",
  fontWeight: 600,
  cursor: "pointer",
  fontSize: "inherit",
  textDecoration: "underline",
};
