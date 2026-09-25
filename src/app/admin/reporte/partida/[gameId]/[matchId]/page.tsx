import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { currentUser } from "@/lib/auth";
import { getMatchReport } from "@/lib/live-reports";
import { getCompanyBrand, getCompanyName } from "@/lib/company-brand";
import { brandPalette } from "@/lib/brand-palette";
import { formatDateTime, formatSeconds, matchStatusLabel } from "@/lib/live-report-format";
import { TYPE_LABELS } from "@/lib/live-validation";
import { colors, calSans } from "@/lib/theme";
import ReportFrame, { ReportBar, ReportSection, ReportStats, reportTable, reportTd, reportTh } from "@/components/report/ReportFrame";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Reporte de partida",
  robots: { index: false, follow: false },
};

const MEDALS = ["#E5B53A", "#AFBBC2", "#C98A55"];

// Fuera del layout del portal a propósito: es una hoja para imprimir, sin menú lateral.
export default async function ReportePartidaPage({ params }: { params: Promise<{ gameId: string; matchId: string }> }) {
  const user = await currentUser();
  if (!user) redirect("/admin/login");

  const { gameId, matchId } = await params;
  const report = await getMatchReport(Number(gameId), Number(matchId), user);
  if (!report) notFound();

  const { match, questions, ranking } = report;
  const [brand, companyName] = match.companyId === null ? [null, null] : await Promise.all([getCompanyBrand(match.companyId), getCompanyName(match.companyId)]);
  const p = brandPalette(brand);

  const played = questions.filter((q) => match.lastPosition !== null && q.position <= match.lastPosition);
  const scoredPlayed = played.filter((q) => q.stats.correctPct !== null);
  const avgCorrect = scoredPlayed.length ? Math.round(scoredPlayed.reduce((s, q) => s + (q.stats.correctPct ?? 0), 0) / scoredPlayed.length) : null;
  const withTime = played.filter((q) => q.stats.avgResponseMs !== null);
  const avgTime = withTime.length ? withTime.reduce((s, q) => s + (q.stats.avgResponseMs ?? 0), 0) / withTime.length : null;
  const isChallenge = match.closes_at !== null;
  const podium = ranking.slice(0, 3);

  return (
    <ReportFrame
      brand={brand}
      companyName={companyName}
      kind={isChallenge ? "Reporte de desafío" : "Reporte de juego en vivo"}
      kicker={isChallenge ? "DESAFÍO A SU RITMO" : "JUEGO EN VIVO"}
      title={match.gameTitle}
      subtitle={`${formatDateTime(match.started_at ?? match.created_at)} · ${matchStatusLabel(match.status, match.started_at, match.closes_at)}`}
      backHref={`/admin/juegos/${match.gameId}/partidas/${match.id}`}
    >
      <ReportStats
        brand={brand}
        items={[
          { label: "Jugadores", value: String(match.players) },
          isChallenge
            ? { label: "Terminaron", value: `${report.finished}`, hint: `de ${match.players}` }
            : { label: "Preguntas", value: `${played.length}`, hint: `de ${questions.length}` },
          { label: "Acierto promedio", value: avgCorrect === null ? "–" : `${avgCorrect}%`, hint: "Quiz y V/F" },
          { label: "Respuesta", value: formatSeconds(avgTime).replace(".", ","), hint: "Tiempo promedio" },
        ]}
      />

      {podium.length > 0 && (
        <ReportSection title="Podio">
          <div style={{ display: "grid", gridTemplateColumns: `repeat(${podium.length}, minmax(0, 1fr))`, gap: 12 }}>
            {podium.map((e, i) => (
              <div key={e.nickname} className="avoid-break" style={{ borderRadius: 12, padding: "14px 16px", background: i === 0 ? p.tint : "#F6F9FA", display: "flex", alignItems: "center", gap: 12 }}>
                <span style={{ ...calSans, width: 34, height: 34, borderRadius: 999, background: MEDALS[i], color: "#fff", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 16, flexShrink: 0 }}>
                  {e.rank}
                </span>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 14, color: colors.ink, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{e.nickname}</div>
                  <div style={{ fontSize: 11.5, color: colors.muted }}>
                    {e.score} pts · {e.correct} aciertos
                  </div>
                </div>
              </div>
            ))}
          </div>
        </ReportSection>
      )}

      <ReportSection title="Ranking">
        {ranking.length === 0 ? (
          <p style={{ margin: 0, fontSize: 13, color: colors.muted }}>No hubo jugadores.</p>
        ) : (
          <table style={reportTable}>
            <thead>
              <tr>
                <th style={{ ...reportTh, width: 60 }}>Puesto</th>
                <th style={reportTh}>Jugador</th>
                <th style={{ ...reportTh, textAlign: "right" }}>Puntos</th>
                <th style={{ ...reportTh, textAlign: "right" }}>Aciertos</th>
                <th style={{ ...reportTh, textAlign: "right" }}>Tiempo promedio</th>
              </tr>
            </thead>
            <tbody>
              {ranking.map((e) => (
                <tr key={e.nickname}>
                  <td style={{ ...reportTd, ...calSans, fontSize: 14 }}>{e.rank}</td>
                  <td style={{ ...reportTd, fontWeight: 600 }}>{e.nickname}</td>
                  <td style={{ ...reportTd, textAlign: "right", ...calSans, fontSize: 14 }}>{e.score}</td>
                  <td style={{ ...reportTd, textAlign: "right" }}>{e.correct}</td>
                  <td style={{ ...reportTd, textAlign: "right", color: colors.muted }}>{formatSeconds(e.avgResponseMs)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </ReportSection>

      <ReportSection title="Pregunta por pregunta">
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {played.map((q) => (
            <div key={q.id} className="avoid-break" style={{ display: "grid", gridTemplateColumns: "28px minmax(0, 1fr) 150px", gap: 12, alignItems: "center", padding: "10px 0", borderBottom: "1px solid #EEF4F6" }}>
              <span style={{ ...calSans, width: 26, height: 26, borderRadius: 8, background: p.tint, color: p.strong, display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 13 }}>{q.position}</span>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: colors.ink, lineHeight: 1.4 }}>{q.prompt}</div>
                <div style={{ fontSize: 11, color: colors.muted }}>
                  {TYPE_LABELS[q.type]} · {q.stats.answered} de {q.players} respondieron
                  {q.type === "nube" && q.stats.words.length > 0 && ` · más dicha: "${q.stats.words[0].text}"`}
                </div>
              </div>
              {q.stats.correctPct !== null ? (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 40px", gap: 8, alignItems: "center" }}>
                  <ReportBar brand={brand} pct={q.stats.correctPct} />
                  <span style={{ fontSize: 11.5, color: colors.inkSoft, textAlign: "right" }}>{q.stats.correctPct}%</span>
                </div>
              ) : (
                <span style={{ fontSize: 11, color: colors.muted, textAlign: "right" }}>Sin respuesta correcta</span>
              )}
            </div>
          ))}
          {played.length === 0 && <p style={{ margin: 0, fontSize: 13, color: colors.muted }}>No se llegó a jugar ninguna pregunta.</p>}
        </div>
      </ReportSection>
    </ReportFrame>
  );
}
