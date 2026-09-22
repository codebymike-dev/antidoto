import Link from "next/link";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { currentUser } from "@/lib/auth";
import { getMatchReport } from "@/lib/live-reports";
import { durationMinutes, formatDateTime, formatSeconds, matchStatusLabel } from "@/lib/live-report-format";
import { colors, calSans } from "@/lib/theme";
import { card, secondaryButton } from "@/lib/styles";
import { CheckIcon } from "@/components/icons";
import AnswerShape, { ANSWER_STYLES } from "@/components/live/AnswerShape";
import { TYPE_LABELS } from "@/lib/live-validation";
import ChallengeShare from "@/components/admin/live/ChallengeShare";

export const dynamic = "force-dynamic";

export default async function PartidaPage({ params }: { params: Promise<{ id: string; matchId: string }> }) {
  const { id, matchId } = await params;
  const user = (await currentUser())!;
  const report = await getMatchReport(Number(id), Number(matchId), user);
  if (!report) notFound();

  const { match, questions, ranking, players } = report;
  const played = questions.filter((q) => match.lastPosition !== null && q.position <= match.lastPosition);
  const scoredPlayed = played.filter((q) => q.stats.correctPct !== null);
  const avgCorrect = scoredPlayed.length
    ? Math.round(scoredPlayed.reduce((s, q) => s + (q.stats.correctPct ?? 0), 0) / scoredPlayed.length)
    : null;
  const withTime = played.filter((q) => q.stats.avgResponseMs !== null);
  const avgTime = withTime.length ? withTime.reduce((s, q) => s + (q.stats.avgResponseMs ?? 0), 0) / withTime.length : null;
  const kicked = players.filter((p) => p.kicked);
  const isChallenge = match.closes_at !== null;
  // En un desafío la duración no dice nada: cada jugador juega en un momento distinto.
  const minutes = isChallenge ? null : durationMinutes(match.started_at, match.finished_at);
  const challengeOpen = match.challengeOpen;

  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20, maxWidth: 980 }}>
      <Link href={`/admin/juegos/${match.gameId}`} style={{ fontSize: 13, color: colors.accentDark, fontWeight: 600 }}>
        ‹ {match.gameTitle}
      </Link>

      <header style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
        <div>
          <span style={{ fontSize: 11.5, fontWeight: 700, color: colors.accent, letterSpacing: 1 }}>
            {isChallenge ? "DESAFÍO A SU RITMO" : "REPORTE DE PARTIDA"}
          </span>
          <h1 style={{ ...calSans, fontSize: 26, margin: "4px 0 6px 0", color: colors.ink, fontWeight: 400 }}>
            {formatDateTime(match.started_at ?? match.created_at)}
          </h1>
          <p style={{ margin: 0, fontSize: 13.5, color: colors.muted }}>
            {matchStatusLabel(match.status, match.started_at, match.closes_at)} · PIN {match.pin}
            {match.host && ` · host ${match.host}`}
            {minutes !== null && ` · ${minutes} min`}
          </p>
        </div>
        <a
          href={`/admin/juegos/${match.gameId}/partidas/${match.id}/export`}
          className="btn-secondary"
          style={{ ...secondaryButton, display: "inline-flex", alignItems: "center" }}
        >
          Exportar CSV
        </a>
      </header>

      {isChallenge && (
        <ChallengeShare
          matchId={match.id}
          pin={match.pin}
          joinUrl={`${proto}://${host}/jugar?pin=${match.pin}`}
          closesLabel={formatDateTime(match.closes_at)}
          open={challengeOpen}
        />
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 14 }}>
        <Stat label="Jugadores" value={String(match.players)} />
        {isChallenge ? (
          <Stat
            label="Terminaron"
            value={`${report.finished} de ${match.players}`}
            hint="Jugadores que respondieron hasta la última pregunta"
          />
        ) : (
          <Stat label="Preguntas jugadas" value={`${played.length} de ${questions.length}`} />
        )}
        <Stat label="Acierto promedio" value={avgCorrect === null ? "–" : `${avgCorrect}%`} hint="En quiz y V/F, sobre quienes respondieron" />
        <Stat label="Tiempo de respuesta" value={formatSeconds(avgTime)} hint="Promedio de todas las preguntas" />
      </div>

      <section style={{ ...card, padding: 0, overflow: "hidden" }}>
        <h2 style={{ ...calSans, fontSize: 18, margin: 0, padding: "18px 22px 10px", color: colors.ink, fontWeight: 400 }}>{challengeOpen ? "Ranking hasta ahora" : "Ranking final"}</h2>
        {ranking.length === 0 ? (
          <p style={{ margin: 0, padding: "0 22px 18px", color: colors.muted, fontSize: 13.5 }}>No hubo jugadores.</p>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14, minWidth: 520 }}>
              <thead>
                <tr style={{ textAlign: "left", color: colors.muted, fontSize: 12, textTransform: "uppercase", letterSpacing: 0.4 }}>
                  <th style={th}>Puesto</th>
                  <th style={th}>Jugador</th>
                  <th style={{ ...th, textAlign: "right" }}>Puntos</th>
                  <th style={{ ...th, textAlign: "right" }}>Aciertos</th>
                  <th style={{ ...th, textAlign: "right" }}>Tiempo promedio</th>
                </tr>
              </thead>
              <tbody>
                {ranking.map((e) => (
                  <tr key={e.nickname} style={{ borderTop: `1px solid ${colors.accentTint}` }}>
                    <td style={{ ...td, ...calSans, fontSize: 16 }}>{e.rank}</td>
                    <td style={{ ...td, fontWeight: 600 }}>{e.nickname}</td>
                    <td style={{ ...td, textAlign: "right", ...calSans, fontSize: 16 }}>{e.score}</td>
                    <td style={{ ...td, textAlign: "right" }}>{e.correct}</td>
                    <td style={{ ...td, textAlign: "right", color: colors.muted }}>{formatSeconds(e.avgResponseMs)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {kicked.length > 0 && (
          <p style={{ margin: 0, padding: "12px 22px 18px", fontSize: 12.5, color: colors.muted }}>
            Expulsados (fuera del ranking, incluidos en el CSV): {kicked.map((p) => p.nickname).join(", ")}
          </p>
        )}
      </section>

      <h2 style={{ ...calSans, fontSize: 20, margin: "8px 0 0", color: colors.ink, fontWeight: 400 }}>Pregunta por pregunta</h2>
      {questions.map((q) => {
        const wasPlayed = match.lastPosition !== null && q.position <= match.lastPosition;
        const total = q.stats.answered;
        return (
          <section key={q.id} style={{ ...card, display: "flex", flexDirection: "column", gap: 12, opacity: wasPlayed ? 1 : 0.6 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
              <span style={{ ...calSans, width: 30, height: 30, borderRadius: 9, background: colors.accentTint, color: colors.accentDark, display: "flex", alignItems: "center", justifyContent: "center" }}>
                {q.position}
              </span>
              <span style={{ fontSize: 12, fontWeight: 700, color: colors.inkSoft, textTransform: "uppercase", letterSpacing: 0.4 }}>{TYPE_LABELS[q.type]}</span>
              <span style={{ fontSize: 12.5, color: colors.muted, marginLeft: "auto" }}>
                {wasPlayed
                  ? [
                      `${total} de ${q.players} respondieron`,
                      q.stats.correctPct !== null ? `${q.stats.correctPct}% de acierto` : null,
                      q.stats.avgResponseMs !== null ? `${formatSeconds(q.stats.avgResponseMs)} promedio` : null,
                    ]
                      .filter(Boolean)
                      .join(" · ")
                  : "No se llegó a jugar"}
              </span>
            </div>
            <h3 style={{ margin: 0, fontSize: 16, color: colors.ink, lineHeight: 1.4 }}>{q.prompt}</h3>

            {q.type === "nube" ? (
              q.stats.words.length === 0 ? (
                <p style={{ margin: 0, color: colors.muted, fontSize: 13.5 }}>Sin palabras.</p>
              ) : (
                <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {q.stats.words.map((w) => (
                    <li key={w.text} style={{ padding: "6px 12px", borderRadius: 999, background: colors.accentTint, color: colors.accentDark, fontWeight: 600, fontSize: 13.5 }}>
                      {w.text} <span style={{ color: colors.muted, fontWeight: 500 }}>× {w.count}</span>
                    </li>
                  ))}
                </ul>
              )
            ) : (
              <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 8 }}>
                {q.optionTexts.map((text, i) => {
                  const count = q.stats.distribution[i] ?? 0;
                  const pct = total ? Math.round((count / total) * 100) : 0;
                  const correct = q.options[i]?.correct && (q.type === "quiz" || q.type === "vf");
                  return (
                    <li key={i} style={{ display: "grid", gridTemplateColumns: "28px minmax(0, 1fr) 90px", alignItems: "center", gap: 10 }}>
                      <span style={{ width: 28, height: 28, borderRadius: 7, background: ANSWER_STYLES[i].bg, display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <AnswerShape index={i} size={14} />
                      </span>
                      <div style={{ display: "flex", flexDirection: "column", gap: 4, minWidth: 0 }}>
                        <span style={{ fontSize: 13.5, color: colors.ink, fontWeight: correct ? 700 : 500, display: "flex", alignItems: "center", gap: 6 }}>
                          {text}
                          {correct && (
                            <span style={{ display: "inline-flex", alignItems: "center", gap: 3, fontSize: 11.5, color: "#1F8A4C", fontWeight: 700 }}>
                              <CheckIcon /> correcta
                            </span>
                          )}
                        </span>
                        <div style={{ height: 8, borderRadius: 8, background: colors.accentTint, overflow: "hidden" }}>
                          <div style={{ height: "100%", width: `${pct}%`, background: ANSWER_STYLES[i].bg }} />
                        </div>
                      </div>
                      <span style={{ fontSize: 13, color: colors.muted, textAlign: "right" }}>
                        {count} · {pct}%
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        );
      })}
    </div>
  );
}

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div style={{ ...card, padding: 18 }} title={hint}>
      <div style={{ fontSize: 11.5, fontWeight: 600, color: colors.muted, textTransform: "uppercase", letterSpacing: 0.4 }}>{label}</div>
      <div style={{ ...calSans, fontSize: 26, color: colors.ink, marginTop: 4 }}>{value}</div>
      {hint && <div style={{ fontSize: 11.5, color: colors.mutedLight, marginTop: 2 }}>{hint}</div>}
    </div>
  );
}

const th: React.CSSProperties = { padding: "10px 22px", fontWeight: 600 };
const td: React.CSSProperties = { padding: "12px 22px", color: colors.ink };
