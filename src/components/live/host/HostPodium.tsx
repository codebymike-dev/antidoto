"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import confetti from "canvas-confetti";
import type { LeaderboardEntry } from "@/lib/live-engine";
import { ANSWER_STYLES } from "../AnswerShape";
import { liveSound } from "../sound";
import { calSans, game, liveButton, liveGhostButton } from "../game-theme";

// Coreografía del podio (docs/investigacion-ux-kahoot.md 4.3), algo más corta:
// 3º, 2º, suspenso y 1º con confeti. Segundos desde que empieza.
const TIMELINE = { bronze: 0.4, bronzeName: 1.2, silver: 2.0, silverName: 2.8, suspense: 3.4, gold: 4.8, goldName: 5.2, rest: 6.2 };
type Step = keyof typeof TIMELINE;
const END = TIMELINE.rest + 0.1;

// Columnas por orden de llegada (2º a la izquierda, 1º al centro, 3º a la derecha). El
// color, la altura y el número salen del puesto real: con empate, dos columnas comparten
// medalla (1, 1, 3 o 1, 2, 2).
const COLUMNS = [
  { place: 2, column: "silver", name: "silverName" },
  { place: 1, column: "gold", name: "goldName" },
  { place: 3, column: "bronze", name: "bronzeName" },
] as const;

const MEDALS: Record<number, { height: string; color: string }> = {
  1: { height: "82%", color: "#E8A33D" },
  2: { height: "58%", color: "#C9D6DC" },
  3: { height: "42%", color: "#D98C5F" },
};

export default function HostPodium({ entries, reportHref }: { entries: LeaderboardEntry[]; reportHref: string }) {
  const [elapsed, setElapsed] = useState(0);
  const [run, setRun] = useState(0);
  const [skipped, setSkipped] = useState(false);
  const seen = (step: Step) => elapsed >= TIMELINE[step];

  // Reloj de la coreografía; "Repetir" la reinicia y "Saltar" lo detiene.
  useEffect(() => {
    if (skipped) return;
    const t0 = performance.now();
    const id = setInterval(() => {
      const s = (performance.now() - t0) / 1000;
      setElapsed(s);
      if (s > END) clearInterval(id);
    }, 100);
    return () => clearInterval(id);
  }, [run, skipped]);

  // Sonido y confeti en su momento exacto (al saltar se cancelan los pendientes).
  useEffect(() => {
    if (entries.length === 0 || skipped) return;
    const sound = liveSound();
    const timers = [
      setTimeout(() => sound.ready && sound.podiumStep(3), TIMELINE.bronze * 1000),
      setTimeout(() => sound.ready && sound.podiumStep(2), TIMELINE.silver * 1000),
      setTimeout(() => sound.ready && sound.fanfare(), TIMELINE.goldName * 1000),
      setTimeout(() => burst(), TIMELINE.goldName * 1000),
      setTimeout(() => burst(0.2), TIMELINE.goldName * 1000 + 700),
      setTimeout(() => burst(0.8), TIMELINE.goldName * 1000 + 1200),
    ];
    return () => timers.forEach(clearTimeout);
  }, [run, entries.length, skipped]);

  const skip = () => {
    setSkipped(true);
    setElapsed(END + 1);
  };
  const replay = () => {
    setSkipped(false);
    setElapsed(0);
    setRun((r) => r + 1);
  };
  const done = elapsed > END;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24, width: "100%", alignItems: "center" }}>
      <h1 className="live-rise" style={{ ...calSans, margin: 0, fontSize: "clamp(34px, 4vw, 64px)", fontWeight: 400 }}>
        Podio
      </h1>

      {entries.length === 0 ? (
        <p style={{ color: game.muted, fontSize: 20 }}>La partida terminó sin jugadores.</p>
      ) : (
        <div style={{ position: "relative", display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 18, width: "100%", maxWidth: 900, height: "clamp(260px, 46vh, 460px)", alignItems: "end" }}>
          {seen("suspense") && !seen("gold") && (
            <p className="live-pop" style={{ ...calSans, position: "absolute", top: 0, left: 0, right: 0, textAlign: "center", fontSize: "clamp(22px, 2.6vw, 38px)", color: game.accent, margin: 0 }}>
              Y el primer lugar es…
            </p>
          )}
          {COLUMNS.map((c) => {
            const e = entries[c.place - 1];
            const rank = e?.rank ?? c.place;
            const medal = MEDALS[rank] ?? MEDALS[3];
            const showColumn = seen(c.column);
            return (
              <div key={c.place} style={{ display: "flex", flexDirection: "column", alignItems: "stretch", gap: 12, height: "100%", justifyContent: "flex-end" }}>
                {e && seen(c.name) && (
                  <div className="live-pop" style={{ textAlign: "center" }}>
                    <div style={{ fontWeight: 700, fontSize: rank === 1 ? "clamp(22px, 2.6vw, 40px)" : "clamp(18px, 2vw, 30px)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {e.nickname}
                    </div>
                    <div style={{ ...calSans, color: game.muted, fontSize: "clamp(16px, 1.6vw, 24px)" }}>{e.score} pts</div>
                  </div>
                )}
                <div
                  className={showColumn ? "live-grow" : undefined}
                  style={{
                    height: medal.height,
                    visibility: showColumn ? "visible" : "hidden",
                    background: medal.color,
                    borderRadius: "16px 16px 4px 4px",
                    display: "flex",
                    alignItems: "flex-start",
                    justifyContent: "center",
                    paddingTop: 16,
                    color: game.bg,
                    opacity: e ? 1 : 0.25,
                    boxShadow: rank === 1 && seen(c.name) ? "0 0 60px rgba(232,163,61,0.55)" : "none",
                  }}
                >
                  <span style={{ ...calSans, fontSize: "clamp(36px, 5vw, 72px)" }}>{rank}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {entries.length > 3 && seen("rest") && (
        <ol start={4} className="live-rise" style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", gap: 14, flexWrap: "wrap", justifyContent: "center" }}>
          {entries.slice(3, 5).map((e) => (
            <li key={e.nickname} style={{ padding: "10px 18px", borderRadius: 12, background: game.surfaceStrong, fontWeight: 600 }}>
              {e.rank}. {e.nickname} · {e.score}
            </li>
          ))}
        </ol>
      )}

      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", justifyContent: "center" }}>
        {entries.length > 0 &&
          (done ? (
            <button type="button" className="btn-live" style={liveGhostButton} onClick={replay}>
              Repetir animación
            </button>
          ) : (
            <button type="button" className="btn-live" style={liveGhostButton} onClick={skip}>
              Saltar animación
            </button>
          ))}
        <Link href={reportHref} className="btn-live" style={{ ...liveButton, display: "inline-flex", alignItems: "center", textDecoration: "none" }}>
          Ver reporte
        </Link>
        <Link href="/admin/juegos" className="btn-live" style={{ ...liveGhostButton, display: "inline-flex", alignItems: "center", textDecoration: "none" }}>
          Volver a juegos
        </Link>
      </div>
    </div>
  );
}

/** Confeti con los 4 colores de respuesta, como en Kahoot. Respeta reduced motion. */
function burst(x = 0.5) {
  void confetti({
    particleCount: 160,
    spread: 100,
    startVelocity: 45,
    origin: { x, y: 0.55 },
    colors: ANSWER_STYLES.map((s) => s.bright),
    disableForReducedMotion: true,
  });
}
