"use client";

import type { PublicQuestion } from "@/lib/live-protocol";
import AnswerTile from "../AnswerTile";
import CountdownRing from "../CountdownRing";
import { calSans, game, liveButton, liveGhostButton } from "../game-theme";

export const TYPE_LABELS: Record<PublicQuestion["type"], string> = {
  quiz: "Quiz",
  vf: "Verdadero o falso",
  encuesta: "Encuesta",
  nube: "Nube de palabras",
};

interface Props {
  question: PublicQuestion;
  offsetMs: number;
  answered: number;
  players: number;
  busy: boolean;
  onPauseToggle: () => void;
  onSkip: () => void;
}

export default function HostQuestion({ question, offsetMs, answered, players, busy, onPauseToggle, onSkip }: Props) {
  const paused = question.pausedRemainingMs !== null;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "clamp(16px, 3vh, 32px)", width: "100%" }}>
      <PromptCard question={question} />

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 20 }}>
        <CountdownRing question={question} offsetMs={offsetMs} size={150} />
        <div style={{ textAlign: "center", color: game.muted, fontSize: "clamp(16px, 1.6vw, 24px)", flex: 1 }}>
          {paused ? (
            <span style={{ ...calSans, color: game.text, fontSize: "clamp(28px, 3vw, 44px)" }}>En pausa</span>
          ) : question.type === "nube" ? (
            "Escribe una palabra en tu celular"
          ) : (
            "Responde en tu celular"
          )}
        </div>
        <div style={{ textAlign: "center", minWidth: 150 }} aria-live="polite">
          <div style={{ ...calSans, fontSize: "clamp(44px, 5vw, 72px)", lineHeight: 1 }}>{answered}</div>
          <div style={{ color: game.muted, fontSize: 16 }}>{answered === 1 ? "respuesta" : "respuestas"} de {players}</div>
        </div>
      </div>

      {question.options.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 14 }}>
          {question.options.map((text, i) => (
            <AnswerTile key={i} index={i} text={text} />
          ))}
        </div>
      )}

      <div style={{ display: "flex", gap: 12, justifyContent: "flex-end" }}>
        <button type="button" className="btn-live" style={liveGhostButton} onClick={onPauseToggle} disabled={busy}>
          {paused ? "Reanudar" : "Pausar"}
        </button>
        <button type="button" className="btn-live" style={liveButton} onClick={onSkip} disabled={busy}>
          Cerrar pregunta
        </button>
      </div>
    </div>
  );
}

export function PromptCard({ question, compact = false }: { question: PublicQuestion; compact?: boolean }) {
  return (
    <div className="live-rise" style={{ display: "flex", flexDirection: "column", gap: 10, alignItems: "center" }}>
      <span style={{ color: game.muted, fontWeight: 600, fontSize: "clamp(14px, 1.3vw, 18px)", letterSpacing: 0.5 }}>
        Pregunta {question.position} de {question.total} · {TYPE_LABELS[question.type]}
      </span>
      <h1
        style={{
          ...calSans,
          margin: 0,
          width: "100%",
          textAlign: "center",
          background: "#fff",
          color: game.bg,
          borderRadius: 18,
          padding: compact ? "14px 24px" : "clamp(18px, 3vh, 32px) 32px",
          fontSize: compact ? "clamp(20px, 2.2vw, 32px)" : "clamp(26px, 3.4vw, 54px)",
          lineHeight: 1.15,
          fontWeight: 400,
        }}
      >
        {question.prompt}
      </h1>
    </div>
  );
}
