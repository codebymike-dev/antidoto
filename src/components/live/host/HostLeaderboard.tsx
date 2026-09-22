"use client";

import { useEffect, useMemo, useState, type CSSProperties } from "react";
import type { LeaderboardEntry } from "@/lib/live-engine";
import { celebration } from "@/lib/live-celebrations";
import { leaderboardMotion } from "@/lib/live-leaderboard-motion";
import { liveSound } from "../sound";
import { calSans, game, liveButton } from "../game-theme";

// Coreografía (docs/investigacion-ux-kahoot.md 4.5): aparece el top de antes, los
// puntajes cuentan hasta el nuevo valor y luego cada fila se desliza a su puesto.
// Segundos desde que se muestra el ranking.
const COUNT_AT = 0.7;
const COUNT_FOR = 1.2;
const MOVE_AT = 2.2;
const MESSAGE_AT = 3.0;
const TOP = 5;
const GAP = 12;

type Phase = "before" | "counting" | "moved";

interface Props {
  entries: LeaderboardEntry[];
  isLast: boolean;
  busy: boolean;
  onNext: () => void;
}

export default function HostLeaderboard({ entries, isLast, busy, onNext }: Props) {
  const rows = useMemo(() => leaderboardMotion(entries, TOP), [entries]);
  const message = celebration(entries);
  const [phase, setPhase] = useState<Phase>("before");
  const [progress, setProgress] = useState(0);
  const [showMessage, setShowMessage] = useState(false);

  // Una sola vez al entrar: los reenvíos de la foto de estado no reinician la animación.
  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      const id = setTimeout(() => {
        setPhase("moved");
        setProgress(1);
        setShowMessage(true);
      }, 0);
      return () => clearTimeout(id);
    }

    const sound = liveSound();
    const top = leaderboardMotion(entries, TOP);
    const gained = top.some((r) => r.to !== null && r.lastPoints > 0);
    const reorders = top.some((r) => r.from !== r.to);
    let frame = 0;

    const timers = [
      setTimeout(() => {
        setPhase("counting");
        if (gained && sound.ready) sound.points(COUNT_FOR);
        const t0 = performance.now();
        const tick = () => {
          const p = Math.min(1, (performance.now() - t0) / (COUNT_FOR * 1000));
          setProgress(p);
          if (p < 1) frame = requestAnimationFrame(tick);
        };
        frame = requestAnimationFrame(tick);
      }, COUNT_AT * 1000),
      setTimeout(() => {
        setPhase("moved");
        if (reorders && sound.ready) sound.whoosh();
      }, MOVE_AT * 1000),
      setTimeout(() => setShowMessage(true), MESSAGE_AT * 1000),
    ];
    return () => {
      timers.forEach(clearTimeout);
      cancelAnimationFrame(frame);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const moved = phase === "moved";
  const visible = Math.min(TOP, entries.length);
  // Desaceleración: los puntos suben rápido y frenan al llegar.
  const eased = 1 - Math.pow(1 - progress, 3);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24, width: "100%", maxWidth: 980, margin: "0 auto" }}>
      <h1 className="live-rise" style={{ ...calSans, margin: 0, textAlign: "center", fontSize: "clamp(34px, 4vw, 60px)", fontWeight: 400 }}>
        Ranking
      </h1>
      <p
        className={showMessage && message ? "live-pop" : undefined}
        aria-live="polite"
        style={{ ...calSans, margin: 0, minHeight: "1.3em", textAlign: "center", color: "#E8A33D", fontSize: "clamp(20px, 2.2vw, 32px)", visibility: showMessage && message ? "visible" : "hidden" }}
      >
        {message}
      </p>

      <ol
        style={
          {
            "--row": "clamp(58px, 8.5vh, 82px)",
            listStyle: "none",
            margin: 0,
            padding: 0,
            position: "relative",
            height: `calc(${visible} * (var(--row) + ${GAP}px) - ${GAP}px)`,
          } as CSSProperties
        }
      >
        {rows.map((r, order) => {
          const slot = moved ? r.to : r.from;
          const shown = slot !== null;
          const first = slot === 0;
          const score = Math.round(r.prevScore + (r.score - r.prevScore) * eased);
          return (
            <li
              key={r.nickname}
              className="live-motion"
              aria-hidden={r.to === null}
              style={{
                position: "absolute",
                left: 0,
                right: 0,
                height: "var(--row)",
                // Sin puesto (entra o sale del top): justo debajo de la última fila, invisible.
                transform: `translateY(calc(${slot ?? visible} * (var(--row) + ${GAP}px)))`,
                opacity: shown ? 1 : 0,
                transition: "transform 0.7s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.4s ease",
                zIndex: TOP - order,
              }}
            >
              <div
                className="live-rise live-motion"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 18,
                  height: "100%",
                  padding: "0 22px",
                  borderRadius: 16,
                  background: first ? "#fff" : game.surfaceStrong,
                  color: first ? game.bg : game.text,
                  transition: "background 0.3s ease, color 0.3s ease",
                  animationDelay: `${(r.from ?? order) * 90}ms`,
                }}
              >
                <span style={{ ...calSans, width: 44, fontSize: "clamp(22px, 2.4vw, 34px)" }}>{moved ? r.rank : r.prevRank}</span>
                <span style={{ flex: 1, fontWeight: 700, fontSize: "clamp(18px, 2vw, 30px)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {r.nickname}
                </span>
                {phase !== "before" && r.lastPoints > 0 && (
                  <span className="live-pop" style={{ ...calSans, fontSize: "clamp(15px, 1.5vw, 22px)", color: first ? "#278458" : "#2FA66A" }}>
                    +{r.lastPoints}
                  </span>
                )}
                {r.streak >= 2 && (
                  <span style={{ fontSize: 14, fontWeight: 700, padding: "4px 10px", borderRadius: 999, background: "#E8A33D", color: game.bg }}>
                    Racha {r.streak}
                  </span>
                )}
                {moved && r.movement !== 0 && (
                  <span
                    className="live-pop"
                    aria-label={r.movement > 0 ? `subió ${r.movement}` : `bajó ${-r.movement}`}
                    // Sobre la fila blanca del primero, los tonos oscuros (contraste 4.5:1).
                    style={{ fontWeight: 700, color: r.movement > 0 ? (first ? "#278458" : "#2FA66A") : first ? "#C94950" : game.danger }}
                  >
                    {r.movement > 0 ? `▲${r.movement}` : `▼${-r.movement}`}
                  </span>
                )}
                <span style={{ ...calSans, fontSize: "clamp(22px, 2.4vw, 36px)", minWidth: 110, textAlign: "right", fontVariantNumeric: "tabular-nums" }}>
                  {score}
                </span>
              </div>
            </li>
          );
        })}
      </ol>

      {entries.length > TOP && (
        <p style={{ margin: 0, textAlign: "center", color: game.muted }}>y {entries.length - TOP} jugadores más</p>
      )}
      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <button type="button" className="btn-live" style={liveButton} onClick={onNext} disabled={busy}>
          {isLast ? "Ver podio" : "Siguiente pregunta"}
        </button>
      </div>
    </div>
  );
}
