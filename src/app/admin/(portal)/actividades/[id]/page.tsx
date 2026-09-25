import { Fragment } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { currentUser } from "@/lib/auth";
import {
  getMission,
  listGroups,
  getTrend,
  listParticipants,
} from "@/lib/queries";
import { colors, calSans } from "@/lib/theme";
import {
  filledButton,
  secondaryButton,
  card,
  tabButton,
  tabButtonActive,
} from "@/lib/styles";
import { trendToPoints } from "@/lib/utils";
import GroupsTable from "@/components/admin/GroupsTable";
import { experienceRiskStats, missionStations } from "@/lib/experience-data";
import type { Estado } from "@/lib/types";

export const dynamic = "force-dynamic";

const ESTADOS: ("todos" | Estado)[] = ["todos", "activo", "pausado", "vencido"];

export default async function DetallePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ q?: string; estado?: string }>;
}) {
  const { id } = await params;
  const { q = "", estado = "todos" } = await searchParams;
  const user = (await currentUser())!;

  const mission = await getMission(id);
  if (!mission) notFound();

  const allGroups = await listGroups(id, user);
  // Un admin de empresa sin códigos en esta misión no debe ver ni su metadata.
  if (user.role === "empresa" && allGroups.length === 0) notFound();

  const trend = await getTrend(id, user);
  const stations = await missionStations(id);
  const experience = stations?.[0] ?? null;
  const riskReport = stations
    ? await experienceRiskStats(id, stations, user)
    : null;

  const groups = allGroups.filter(
    (g) =>
      (estado === "todos" || g.estado === estado) &&
      (!q.trim() || g.empresa.toLowerCase().includes(q.trim().toLowerCase())),
  );

  // La muestra de participantes se carga por grupo para la fila expandible.
  const withParticipants = await Promise.all(
    groups.map(async (g) => ({
      ...g,
      participantsPreview: await listParticipants(g.id),
    })),
  );

  const totalParticipantes = allGroups.reduce((a, g) => a + g.participantes, 0);
  const avgAvance = allGroups.length
    ? Math.round(allGroups.reduce((a, g) => a + g.avance, 0) / allGroups.length)
    : 0;

  const exportQuery = new URLSearchParams({ q, estado }).toString();
  // Un reporte PDF por empresa, con su marca: las empresas con códigos en esta actividad.
  const reportCompanies = [...new Map(allGroups.map((g) => [g.company_id, g.empresa])).entries()].sort((a, b) =>
    a[1].localeCompare(b[1], "es"),
  );

  return (
    <div>
      <Link
        href="/admin"
        style={{ fontSize: 13, color: colors.accentDark, fontWeight: 600 }}
      >
        ‹ Actividades
      </Link>
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: 20,
          flexWrap: "wrap",
          margin: "14px 0 20px 0",
        }}
      >
        <div>
          <span
            style={{
              fontSize: 11.5,
              fontWeight: 700,
              color: colors.accent,
              letterSpacing: 1,
            }}
          >
            {mission.tag}
          </span>
          <h1
            style={{
              ...calSans,
              fontSize: 26,
              margin: "4px 0 6px 0",
              color: colors.ink,
            }}
          >
            {mission.title}
          </h1>
          <p
            style={{
              fontSize: 14,
              color: colors.muted,
              margin: 0,
              maxWidth: 520,
            }}
          >
            {mission.description}
          </p>
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <a
            href={`/admin/actividades/${id}/export?${exportQuery}`}
            className="btn-secondary"
            style={{
              ...secondaryButton,
              display: "inline-flex",
              alignItems: "center",
            }}
          >
            Exportar CSV
          </a>
          {reportCompanies.length === 1 ? (
            <Link
              href={`/admin/reporte/actividad/${id}/${reportCompanies[0][0]}`}
              className="btn-secondary"
              style={{ ...secondaryButton, display: "inline-flex", alignItems: "center" }}
            >
              Reporte PDF
            </Link>
          ) : (
            <details className="report-menu" style={{ position: "relative" }}>
              <summary
                className="btn-secondary"
                style={{ ...secondaryButton, display: "inline-flex", alignItems: "center", gap: 6, listStyle: "none" }}
              >
                Reporte PDF <span aria-hidden style={{ fontSize: 10 }}>▾</span>
              </summary>
              <div
                style={{
                  position: "absolute",
                  right: 0,
                  top: "calc(100% + 6px)",
                  zIndex: 20,
                  minWidth: 240,
                  maxHeight: 320,
                  overflowY: "auto",
                  background: "#fff",
                  borderRadius: 12,
                  padding: 6,
                  boxShadow: "0 16px 40px rgba(15,24,29,0.16)",
                }}
              >
                <div style={{ padding: "8px 10px 6px", fontSize: 11, fontWeight: 700, color: colors.muted, textTransform: "uppercase", letterSpacing: 0.5 }}>
                  Reporte de la empresa
                </div>
                {reportCompanies.map(([companyId, name]) => (
                  <Link
                    key={companyId}
                    href={`/admin/reporte/actividad/${id}/${companyId}`}
                    className="report-menu-item"
                    style={{ display: "block", padding: "9px 10px", borderRadius: 8, fontSize: 13.5, color: colors.ink, fontWeight: 600 }}
                  >
                    {name}
                  </Link>
                ))}
              </div>
            </details>
          )}
          <Link
            href={`/admin/config?mission=${id}`}
            className="btn-filled"
            style={{
              ...filledButton,
              padding: "0 18px",
              fontSize: 13.5,
              display: "inline-flex",
              alignItems: "center",
            }}
          >
            ＋ Nuevo código
          </Link>
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
          gap: 16,
          marginBottom: 22,
        }}
      >
        <div style={{ ...card, padding: "18px 20px" }}>
          <div style={statLabel}>Participantes</div>
          <div style={statValue}>{totalParticipantes}</div>
        </div>
        <div style={{ ...card, padding: "18px 20px" }}>
          <div style={statLabel}>Avance promedio</div>
          <div style={statValue}>{avgAvance}%</div>
        </div>
        <div style={{ ...card, padding: "18px 20px" }}>
          <div style={statLabel}>Grupos activos</div>
          <div style={statValue}>{allGroups.length}</div>
        </div>
        <div style={{ ...card, padding: "18px 20px" }}>
          <div style={{ ...statLabel, marginBottom: 8 }}>
            Tendencia · 6 semanas
          </div>
          <svg
            width="140"
            height="40"
            viewBox="0 0 140 40"
            style={{ display: "block" }}
            role="img"
            aria-label="Tendencia de avance"
          >
            <polyline
              points={trendToPoints(trend)}
              fill="none"
              stroke={colors.accent}
              strokeWidth={2.5}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
      </div>

      {experience && riskReport && (
        <section
          style={{ ...card, padding: "20px 22px", marginBottom: 22 }}
          aria-labelledby="riesgos-escena"
        >
          <div
            style={{
              display: "flex",
              alignItems: "baseline",
              justifyContent: "space-between",
              gap: 12,
              flexWrap: "wrap",
              marginBottom: 14,
            }}
          >
            <h2
              id="riesgos-escena"
              style={{ ...calSans, fontSize: 18, margin: 0, color: colors.ink }}
            >
              Riesgos de la escena
            </h2>
            <Link
              href={`/admin/escena/${experience.key}`}
              style={{ fontSize: 13, fontWeight: 700, color: colors.accent }}
            >
              Probar la escena ›
            </Link>
          </div>
          {riskReport.participants === 0 ? (
            <p style={{ fontSize: 13.5, color: colors.muted, margin: 0 }}>
              Todavía nadie ha jugado esta escena.
            </p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {riskReport.stats.map((r, k) => {
                const foundPct = Math.round(
                  (r.found / riskReport.participants) * 100,
                );
                const correctPct = Math.round(
                  (r.correct / riskReport.participants) * 100,
                );
                const newStation =
                  stations!.length > 1 &&
                  (k === 0 || riskReport.stats[k - 1].station !== r.station);
                return (
                  <Fragment key={r.id}>
                    {newStation && (
                      <h3
                        style={{
                          fontSize: 12,
                          fontWeight: 700,
                          letterSpacing: 0.6,
                          color: colors.accentDark,
                          margin: k === 0 ? 0 : "8px 0 0",
                        }}
                      >
                        ESTACIÓN {r.station} · {r.stationTitle.toUpperCase()}
                      </h3>
                    )}
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns:
                          "minmax(180px, 1.2fr) minmax(160px, 2fr)",
                        gap: 14,
                        alignItems: "center",
                      }}
                    >
                      <div>
                        <div
                          style={{
                            fontSize: 14,
                            fontWeight: 600,
                            color: colors.ink,
                          }}
                        >
                          {r.title}
                        </div>
                        <div style={{ fontSize: 12, color: colors.muted }}>
                          {r.category}
                          {r.topWrong &&
                            ` · error más común: "${r.topWrong.text}" (${r.topWrong.count})`}
                        </div>
                      </div>
                      <div
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          gap: 4,
                        }}
                      >
                        <div
                          style={{
                            position: "relative",
                            height: 10,
                            borderRadius: 999,
                            background: colors.accentTint,
                            overflow: "hidden",
                          }}
                          role="img"
                          aria-label={`${foundPct}% lo encontró, ${correctPct}% acertó a la primera`}
                        >
                          <div
                            style={{
                              position: "absolute",
                              inset: 0,
                              width: `${foundPct}%`,
                              background: colors.accentLight,
                              borderRadius: 999,
                            }}
                          />
                          <div
                            style={{
                              position: "absolute",
                              inset: 0,
                              width: `${correctPct}%`,
                              background: colors.accentDark,
                              borderRadius: 999,
                            }}
                          />
                        </div>
                        <div style={{ fontSize: 12, color: colors.muted }}>
                          {correctPct}% a la primera · {foundPct}% lo encontró
                          {r.revealed > 0 &&
                            ` · ${r.revealed} no ${r.revealed === 1 ? "lo vio" : "lo vieron"}`}
                        </div>
                      </div>
                    </div>
                  </Fragment>
                );
              })}
            </div>
          )}
        </section>
      )}

      <form
        style={{
          display: "flex",
          gap: 10,
          flexWrap: "wrap",
          alignItems: "center",
          marginBottom: 14,
        }}
      >
        <input
          name="q"
          defaultValue={q}
          placeholder="Buscar empresa o grupo..."
          aria-label="Buscar empresa o grupo"
          style={{
            height: 40,
            borderRadius: 10,
            border: `1.5px solid ${colors.border}`,
            padding: "0 12px",
            fontSize: 13.5,
            minWidth: 220,
            flex: 1,
          }}
        />
        {ESTADOS.map((value) => (
          <Link
            key={value}
            href={`/admin/actividades/${id}?${new URLSearchParams({ q, estado: value })}`}
            className={estado === value ? "btn-tab-active" : "btn-tab"}
            style={{
              ...(estado === value ? tabButtonActive : tabButton),
              fontSize: 12.5,
              color: estado === value ? colors.accentDark : colors.muted,
            }}
          >
            {value === "todos"
              ? "Todos"
              : value.charAt(0).toUpperCase() + value.slice(1)}
          </Link>
        ))}
      </form>

      <GroupsTable groups={withParticipants} />
    </div>
  );
}

const statLabel = {
  fontSize: 12,
  color: colors.muted,
  fontWeight: 600 as const,
  textTransform: "uppercase" as const,
  letterSpacing: 0.4,
};

const statValue = { ...calSans, fontSize: 26, color: colors.ink, marginTop: 4 };
