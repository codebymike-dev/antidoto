"use client";

import Link from "next/link";
import type { LeaderboardEntry } from "@/lib/live-engine";
import { calSans, game, liveButton } from "../game-theme";

const MEDALS = [
  { place: 2, height: "58%", color: "#C9D6DC", delay: 400 },
  { place: 1, height: "82%", color: "#E8A33D", delay: 900 },
  { place: 3, height: "42%", color: "#D98C5F", delay: 0 },
];

export default function HostPodium({ entries }: { entries: LeaderboardEntry[] }) {
  // Orden de aparición 3º → 2º → 1º (ver docs/investigacion-ux-kahoot.md, 4.3).
  const byIndex = (i: number) => entries[i];
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 28, width: "100%", alignItems: "center" }}>
      <h1 className="live-rise" style={{ ...calSans, margin: 0, fontSize: "clamp(34px, 4vw, 64px)", fontWeight: 400 }}>
        Podio
      </h1>

      {entries.length === 0 ? (
        <p style={{ color: game.muted, fontSize: 20 }}>La partida terminó sin jugadores.</p>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 18, width: "100%", maxWidth: 900, height: "clamp(260px, 46vh, 460px)", alignItems: "end" }}>
          {MEDALS.map((m) => {
            const e = byIndex(m.place - 1);
            return (
              <div key={m.place} style={{ display: "flex", flexDirection: "column", alignItems: "stretch", gap: 12, height: "100%", justifyContent: "flex-end" }}>
                {e && (
                  <div className="live-pop" style={{ textAlign: "center", animationDelay: `${m.delay + 300}ms` }}>
                    <div style={{ fontWeight: 700, fontSize: "clamp(18px, 2vw, 30px)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{e.nickname}</div>
                    <div style={{ ...calSans, color: game.muted, fontSize: "clamp(16px, 1.6vw, 24px)" }}>{e.score} pts</div>
                  </div>
                )}
                <div
                  className="live-rise"
                  style={{
                    height: m.height,
                    background: m.color,
                    borderRadius: "16px 16px 4px 4px",
                    display: "flex",
                    alignItems: "flex-start",
                    justifyContent: "center",
                    paddingTop: 16,
                    color: game.bg,
                    animationDelay: `${m.delay}ms`,
                    opacity: e ? 1 : 0.25,
                  }}
                >
                  <span style={{ ...calSans, fontSize: "clamp(36px, 5vw, 72px)" }}>{m.place}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {entries.length > 3 && (
        <ol start={4} style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", gap: 14, flexWrap: "wrap", justifyContent: "center" }}>
          {entries.slice(3, 5).map((e) => (
            <li key={e.nickname} style={{ padding: "10px 18px", borderRadius: 12, background: game.surfaceStrong, fontWeight: 600 }}>
              {e.rank}. {e.nickname} · {e.score}
            </li>
          ))}
        </ol>
      )}

      <Link href="/admin/juegos" className="btn-live" style={{ ...liveButton, display: "inline-flex", alignItems: "center", textDecoration: "none" }}>
        Volver a juegos
      </Link>
    </div>
  );
}
