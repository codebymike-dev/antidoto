"use client";

import type { PublicQuestion, RevealData } from "@/lib/live-protocol";
import AnswerShape, { ANSWER_STYLES } from "../AnswerShape";
import { calSans, game, liveButton, liveGhostButton } from "../game-theme";
import { PromptCard } from "./HostQuestion";

interface Props {
  question: PublicQuestion;
  reveal: RevealData;
  isLast: boolean;
  busy: boolean;
  onLeaderboard: () => void;
  onNext: () => void;
}

export default function HostReveal({ question, reveal, isLast, busy, onLeaderboard, onNext }: Props) {
  const scored = question.type === "quiz" || question.type === "vf";
  const max = Math.max(1, ...reveal.distribution);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "clamp(16px, 3vh, 28px)", width: "100%" }}>
      <PromptCard question={question} compact />

      {question.type === "nube" ? (
        <WordCloud words={reveal.words} />
      ) : (
        <div
          role="list"
          aria-label="Resultados por opción"
          style={{ display: "grid", gridTemplateColumns: `repeat(${question.options.length}, minmax(0, 1fr))`, gap: 18, alignItems: "end", height: "clamp(220px, 40vh, 420px)" }}
        >
          {question.options.map((text, i) => {
            const count = reveal.distribution[i] ?? 0;
            const correct = reveal.correct.includes(i);
            const dim = scored && !correct;
            const style = ANSWER_STYLES[i];
            return (
              <div
                key={i}
                role="listitem"
                aria-label={`${text}: ${count} ${count === 1 ? "voto" : "votos"}${correct ? ", correcta" : ""}`}
                style={{ display: "flex", flexDirection: "column", alignItems: "stretch", gap: 10, height: "100%", justifyContent: "flex-end", opacity: dim ? 0.4 : 1 }}
              >
                <span style={{ ...calSans, textAlign: "center", fontSize: "clamp(26px, 3vw, 44px)" }}>{count}</span>
                <div
                  style={{
                    // Hasta el 70% de la columna: el resto es para el número y la etiqueta.
                    height: `${Math.max(4, (count / max) * 70)}%`,
                    minHeight: 12,
                    background: style.bg,
                    borderRadius: "12px 12px 4px 4px",
                    transition: "height 0.8s cubic-bezier(0.34, 1.56, 0.64, 1)",
                  }}
                />
                <div style={{ display: "flex", alignItems: "center", gap: 10, justifyContent: "center", minHeight: 44 }}>
                  <span style={{ background: style.bg, borderRadius: 8, padding: 6, display: "flex" }}>
                    <AnswerShape index={i} size={22} />
                  </span>
                  <span style={{ fontWeight: 700, fontSize: "clamp(14px, 1.4vw, 20px)", overflow: "hidden", textOverflow: "ellipsis" }}>{text}</span>
                  {correct && <span style={{ fontWeight: 900, fontSize: 26, color: "#2FA66A" }}>✓</span>}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <span style={{ color: game.muted, fontSize: 16 }}>
          {reveal.answered === 1 ? "1 respuesta" : `${reveal.answered} respuestas`}
          {question.type === "encuesta" && " · encuesta, sin respuesta correcta"}
        </span>
        <div style={{ display: "flex", gap: 12 }}>
          {!isLast && (
            <button type="button" className="btn-live" style={liveGhostButton} onClick={onLeaderboard} disabled={busy}>
              Ver ranking
            </button>
          )}
          <button type="button" className="btn-live" style={liveButton} onClick={onNext} disabled={busy}>
            {isLast ? "Ver podio" : "Siguiente pregunta"}
          </button>
        </div>
      </div>
    </div>
  );
}

function WordCloud({ words }: { words: RevealData["words"] }) {
  if (words.length === 0) {
    return <p style={{ textAlign: "center", color: game.muted, fontSize: 22 }}>Nadie escribió una palabra.</p>;
  }
  const max = words[0].count;
  return (
    <ul
      aria-label="Nube de palabras"
      style={{ listStyle: "none", margin: 0, padding: "24px 0", display: "flex", flexWrap: "wrap", gap: "12px 26px", justifyContent: "center", alignItems: "center", minHeight: "clamp(220px, 40vh, 420px)" }}
    >
      {words.map((w, i) => (
        <li
          key={w.text}
          className="live-pop"
          title={`${w.count} ${w.count === 1 ? "vez" : "veces"}`}
          style={{
            ...calSans,
            fontSize: `clamp(18px, ${1.4 + (w.count / max) * 4}vw, ${24 + (w.count / max) * 72}px)`,
            color: ANSWER_STYLES[i % 4].bg,
            animationDelay: `${i * 60}ms`,
            lineHeight: 1.1,
          }}
        >
          {w.text}
        </li>
      ))}
    </ul>
  );
}
