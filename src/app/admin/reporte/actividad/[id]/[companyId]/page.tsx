import type { Metadata } from "next";
import { Fragment } from "react";
import { notFound, redirect } from "next/navigation";
import { currentUser, type AdminUser } from "@/lib/auth";
import { getMission, listCompanyParticipants, listGroups } from "@/lib/queries";
import { getCompanyBrand, getCompanyName } from "@/lib/company-brand";
import { experienceRiskStats, missionStations } from "@/lib/experience-data";
import { brandPalette } from "@/lib/brand-palette";
import { ESTADO_STYLES } from "@/lib/data";
import { formatDateTime } from "@/lib/live-report-format";
import { colors } from "@/lib/theme";
import ReportFrame, { ReportBar, ReportSection, ReportStats, reportTable, reportTd, reportTh } from "@/components/report/ReportFrame";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Reporte de actividad",
  robots: { index: false, follow: false },
};

// Fuera del layout del portal a propósito: es una hoja para imprimir, sin menú lateral.
export default async function ReporteActividadPage({ params }: { params: Promise<{ id: string; companyId: string }> }) {
  const user = await currentUser();
  if (!user) redirect("/admin/login");

  const { id, companyId: rawCompany } = await params;
  const companyId = Number(rawCompany);
  if (!Number.isInteger(companyId) || companyId <= 0) notFound();
  // Un admin de empresa solo ve el reporte de la suya.
  if (user.role === "empresa" && user.company_id !== companyId) notFound();

  const [mission, companyName, brand] = await Promise.all([getMission(id), getCompanyName(companyId), getCompanyBrand(companyId)]);
  if (!mission || companyName === null) notFound();

  // El reporte de una empresa es exactamente lo que vería su admin: mismo filtro de alcance.
  const scoped: AdminUser = { ...user, role: "empresa", company_id: companyId, company_name: companyName };
  const groups = await listGroups(id, scoped);
  if (groups.length === 0) notFound();

  const [participants, stations] = await Promise.all([listCompanyParticipants(id, companyId), missionStations(id)]);
  const risks = stations ? await experienceRiskStats(id, stations, scoped) : null;

  const total = participants.length;
  const completed = participants.filter((p) => p.completed_at).length;
  const avgAvance = total ? Math.round(participants.reduce((s, p) => s + p.avance, 0) / total) : 0;
  const scored = participants.filter((p) => p.puntaje !== null);
  const avgScore = scored.length ? scored.reduce((s, p) => s + p.puntaje!, 0) / scored.length : null;
  const p = brandPalette(brand);

  return (
    <ReportFrame
      brand={brand}
      companyName={companyName}
      kind="Reporte de actividad"
      kicker={mission.tag}
      title={mission.title}
      subtitle={mission.description}
      backHref={`/admin/empresas/${companyId}/actividades/${id}`}
    >
      <ReportStats
        brand={brand}
        items={[
          { label: "Participantes", value: String(total) },
          { label: "Completaron", value: total ? `${Math.round((completed / total) * 100)}%` : "–", hint: `${completed} de ${total}` },
          { label: "Avance promedio", value: `${avgAvance}%` },
          { label: "Puntaje promedio", value: avgScore === null ? "–" : avgScore.toFixed(1).replace(".", ","), hint: "Sobre 10" },
        ]}
      />

      {risks && risks.participants > 0 && (
        <ReportSection title="Riesgos identificados">
          <p style={{ margin: 0, fontSize: 12, color: colors.muted }}>
            <Legend color={p.graphic} /> Acertó a la primera · <Legend color={p.soft} /> Lo encontró
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {risks.stats.map((r, k) => {
              const found = Math.round((r.found / risks.participants) * 100);
              const correct = Math.round((r.correct / risks.participants) * 100);
              const newStation = stations!.length > 1 && (k === 0 || risks.stats[k - 1].station !== r.station);
              return (
                <Fragment key={r.id}>
                  {newStation && (
                    <h3 style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: 0.6, color: p.strong, margin: k === 0 ? 0 : "6px 0 0" }}>
                      ESTACIÓN {r.station} · {r.stationTitle.toUpperCase()}
                    </h3>
                  )}
                  <div className="avoid-break" style={{ display: "grid", gridTemplateColumns: "minmax(0, 1.2fr) minmax(0, 1fr) 92px", gap: 14, alignItems: "center" }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: colors.ink }}>{r.title}</div>
                      <div style={{ fontSize: 11, color: colors.muted }}>
                        {r.category}
                        {r.topWrong && ` · error más común: "${r.topWrong.text}"`}
                      </div>
                    </div>
                    <ReportBar brand={brand} pct={correct} secondary={found} />
                    <span style={{ fontSize: 11.5, color: colors.inkSoft, textAlign: "right" }}>
                      {correct}% · {found}%
                    </span>
                  </div>
                </Fragment>
              );
            })}
          </div>
        </ReportSection>
      )}

      <ReportSection title={groups.length === 1 ? "Código de la actividad" : "Códigos de la actividad"}>
        <table style={reportTable}>
          <thead>
            <tr>
              <th style={reportTh}>Código</th>
              <th style={reportTh}>Estado</th>
              <th style={{ ...reportTh, textAlign: "right" }}>Participantes</th>
              <th style={{ ...reportTh, textAlign: "right" }}>Avance</th>
              <th style={{ ...reportTh, textAlign: "right" }}>Promedio</th>
              <th style={reportTh}>Vence</th>
            </tr>
          </thead>
          <tbody>
            {groups.map((g) => {
              const est = ESTADO_STYLES[g.estado] ?? ESTADO_STYLES.activo;
              return (
                <tr key={g.codigo}>
                  <td style={{ ...reportTd, fontFamily: "ui-monospace, Menlo, monospace" }}>{g.codigo}</td>
                  <td style={reportTd}>
                    <span style={{ fontSize: 10.5, fontWeight: 700, padding: "2px 8px", borderRadius: 100, color: est.color, background: est.bg }}>{est.label}</span>
                  </td>
                  <td style={{ ...reportTd, textAlign: "right" }}>{g.participantes}</td>
                  <td style={{ ...reportTd, textAlign: "right" }}>{g.avance}%</td>
                  <td style={{ ...reportTd, textAlign: "right" }}>{g.promedio.toFixed(1).replace(".", ",")}</td>
                  <td style={reportTd}>{g.expira ? formatDateTime(g.expira).split(",")[0] : "Sin fecha"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </ReportSection>

      <ReportSection title="Participantes">
        {total === 0 ? (
          <p style={{ margin: 0, fontSize: 13, color: colors.muted }}>Todavía nadie ha entrado con estos códigos.</p>
        ) : (
          <table style={reportTable}>
            <thead>
              <tr>
                <th style={{ ...reportTh, width: 36 }}>#</th>
                <th style={reportTh}>Nombre</th>
                <th style={{ ...reportTh, width: "34%" }}>Avance</th>
                <th style={{ ...reportTh, textAlign: "right" }}>Puntaje</th>
                <th style={reportTh}>Estado</th>
              </tr>
            </thead>
            <tbody>
              {participants.map((x, i) => (
                <tr key={`${x.codigo}-${i}`}>
                  <td style={{ ...reportTd, color: colors.muted }}>{i + 1}</td>
                  <td style={{ ...reportTd, fontWeight: 600 }}>{x.nombre}</td>
                  <td style={reportTd}>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 36px", gap: 8, alignItems: "center" }}>
                      <ReportBar brand={brand} pct={x.avance} />
                      <span style={{ fontSize: 11.5, color: colors.inkSoft, textAlign: "right" }}>{x.avance}%</span>
                    </div>
                  </td>
                  <td style={{ ...reportTd, textAlign: "right" }}>{x.puntaje === null ? "–" : x.puntaje.toFixed(1).replace(".", ",")}</td>
                  <td style={{ ...reportTd, color: x.completed_at ? "#1E6B3A" : colors.muted, fontWeight: 600 }}>{x.completed_at ? "Completó" : "En curso"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </ReportSection>
    </ReportFrame>
  );
}

function Legend({ color }: { color: string }) {
  return <span aria-hidden style={{ display: "inline-block", width: 9, height: 9, borderRadius: 9, background: color, marginRight: 4, verticalAlign: "middle" }} />;
}
