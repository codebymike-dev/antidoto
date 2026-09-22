"use client";

import { useEffect, useState } from "react";
import { remainingMs } from "@/lib/live-client-state";
import type { PublicQuestion } from "@/lib/live-protocol";
import { calSans, game } from "./game-theme";

/** Segundos restantes con anillo de progreso, según el reloj del servidor. */
export default function CountdownRing({ question, offsetMs, size = 140 }: { question: PublicQuestion; offsetMs: number; size?: number }) {
  // null hasta montar: el tiempo depende del reloj del navegador y no debe salir del servidor.
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 200);
    return () => clearInterval(id);
  }, []);

  const left = now === null ? question.timeLimitMs : remainingMs(question, offsetMs, now);
  const fraction = Math.max(0, Math.min(1, left / question.timeLimitMs));
  const seconds = Math.ceil(left / 1000);
  const r = 44;
  const circ = 2 * Math.PI * r;
  const urgent = seconds <= 5 && question.pausedRemainingMs === null;

  return (
    <div style={{ position: "relative", width: size, height: size }} role="timer" aria-label={`${seconds} segundos`}>
      <svg viewBox="0 0 100 100" width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <circle cx="50" cy="50" r={r} fill="none" stroke={game.surfaceStrong} strokeWidth="8" />
        <circle
          cx="50"
          cy="50"
          r={r}
          fill="none"
          stroke={urgent ? game.danger : game.accent}
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={circ * (1 - fraction)}
          style={{ transition: "stroke-dashoffset 0.2s linear, stroke 0.3s ease" }}
        />
      </svg>
      <span
        style={{
          ...calSans,
          position: "absolute",
          inset: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: size * 0.36,
          color: urgent ? game.danger : game.text,
        }}
      >
        {question.pausedRemainingMs !== null ? "II" : seconds}
      </span>
    </div>
  );
}
