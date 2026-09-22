import Link from "next/link";
import type { MatchSummary } from "@/lib/live-reports";
import { formatDateTime, matchStatusLabel } from "@/lib/live-report-format";
import { colors, calSans } from "@/lib/theme";
import { card } from "@/lib/styles";
import { ArrowRightIcon } from "@/components/icons";

/** Partidas en vivo y desafíos de este juego, con enlace a su reporte. */
export default function MatchHistory({ gameId, matches }: { gameId: number; matches: MatchSummary[] }) {
  return (
    <section style={{ ...card, display: "flex", flexDirection: "column", gap: 12, maxWidth: 860 }}>
      <h2 style={{ ...calSans, fontSize: 18, margin: 0, color: colors.ink, fontWeight: 400 }}>Partidas y desafíos</h2>
      {matches.length === 0 ? (
        <p style={{ margin: 0, color: colors.muted, fontSize: 13.5 }}>Todavía no hay partidas ni desafíos con este juego.</p>
      ) : (
        <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column" }}>
          {matches.map((m, i) => (
            <li key={m.id} style={{ borderTop: i ? `1px solid ${colors.accentTint}` : "none" }}>
              <Link
                href={`/admin/juegos/${gameId}/partidas/${m.id}`}
                className="btn-text"
                style={{ display: "flex", alignItems: "center", gap: 14, padding: "12px 4px", color: colors.ink, flexWrap: "wrap" }}
              >
                <span style={{ fontWeight: 600, fontSize: 14, minWidth: 170 }}>{formatDateTime(m.started_at ?? m.created_at)}</span>
                <span style={{ fontSize: 13, color: colors.muted, flex: 1 }}>
                  {m.players === 1 ? "1 jugador" : `${m.players} jugadores`} · {matchStatusLabel(m.status, m.started_at, m.closes_at)}
                  {m.host ? ` · host ${m.host}` : ""}
                </span>
                <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12.5, fontWeight: 700, color: colors.accent }}>
                  Ver reporte <ArrowRightIcon />
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
