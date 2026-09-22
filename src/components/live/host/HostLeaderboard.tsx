"use client";

import type { LeaderboardEntry } from "@/lib/live-engine";
import { celebration } from "@/lib/live-celebrations";
import { calSans, game, liveButton } from "../game-theme";

interface Props {
  entries: LeaderboardEntry[];
  isLast: boolean;
  busy: boolean;
  onNext: () => void;
}

export default function HostLeaderboard({ entries, isLast, busy, onNext }: Props) {
  const top = entries.slice(0, 5);
  const message = celebration(entries);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24, width: "100%", maxWidth: 980, margin: "0 auto" }}>
      <h1 className="live-rise" style={{ ...calSans, margin: 0, textAlign: "center", fontSize: "clamp(34px, 4vw, 60px)", fontWeight: 400 }}>
        Ranking
      </h1>
      {message && (
        <p className="live-pop" style={{ ...calSans, margin: 0, textAlign: "center", color: "#E8A33D", fontSize: "clamp(20px, 2.2vw, 32px)", animationDelay: "0.6s" }}>
          {message}
        </p>
      )}
      <ol style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 12 }}>
        {top.map((e, i) => (
          <li
            key={e.nickname}
            className="live-rise"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 18,
              padding: "14px 22px",
              borderRadius: 16,
              background: i === 0 ? "#fff" : game.surfaceStrong,
              color: i === 0 ? game.bg : game.text,
              animationDelay: `${i * 90}ms`,
            }}
          >
            <span style={{ ...calSans, width: 44, fontSize: "clamp(22px, 2.4vw, 34px)" }}>{e.rank}</span>
            <span style={{ flex: 1, fontWeight: 700, fontSize: "clamp(18px, 2vw, 30px)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {e.nickname}
            </span>
            {e.streak >= 2 && (
              <span style={{ fontSize: 14, fontWeight: 700, padding: "4px 10px", borderRadius: 999, background: "#E8A33D", color: game.bg }}>
                Racha {e.streak}
              </span>
            )}
            {e.movement !== 0 && (
              <span aria-label={e.movement > 0 ? `subió ${e.movement}` : `bajó ${-e.movement}`} style={{ fontWeight: 700, color: e.movement > 0 ? "#2FA66A" : game.danger }}>
                {e.movement > 0 ? `▲${e.movement}` : `▼${-e.movement}`}
              </span>
            )}
            <span style={{ ...calSans, fontSize: "clamp(22px, 2.4vw, 36px)", minWidth: 110, textAlign: "right" }}>{e.score}</span>
          </li>
        ))}
      </ol>
      {entries.length > 5 && (
        <p style={{ margin: 0, textAlign: "center", color: game.muted }}>y {entries.length - 5} jugadores más</p>
      )}
      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <button type="button" className="btn-live" style={liveButton} onClick={onNext} disabled={busy}>
          {isLast ? "Ver podio" : "Siguiente pregunta"}
        </button>
      </div>
    </div>
  );
}
