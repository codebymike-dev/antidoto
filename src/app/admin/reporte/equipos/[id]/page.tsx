import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { currentUser } from "@/lib/auth";
import { sessionReport } from "@/lib/brick-gallery";
import { getTeamMode, heightLabel, phoneModel, phoneScores, towerHeight, teamBase } from "@/lib/bricks/team";
import { getCompanyBrand, getCompanyName } from "@/lib/company-brand";
import { brandPalette } from "@/lib/brand-palette";
import { formatDateTime } from "@/lib/live-report-format";
import { colors, calSans } from "@/lib/theme";
import ReportFrame, { ReportSection, ReportStats } from "@/components/report/ReportFrame";
import MuralButton from "@/components/bricks/MuralButton";
import { BRICKS_VISIBLE } from "@/lib/bricks/visible";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Reporte de construcción en equipo",
  robots: { index: false, follow: false },
};

const STATUS: Record<string, string> = { lobby: "Esperando gente", building: "Construyendo", finished: "Terminada" };

// Fuera del layout del portal a propósito: es una hoja para imprimir, sin menú lateral.
export default async function ReporteEquiposPage({ params }: { params: Promise<{ id: string }> }) {
  if (!BRICKS_VISIBLE) notFound();
  const user = await currentUser();
  if (!user) redirect("/admin/login");
  const report = await sessionReport(Number((await params).id), user);
  if (!report) notFound();

  const { session, teams, gallery, votesByCategory } = report;
  const mode = getTeamMode(session.mode)!;
  const [brand, companyName] = session.companyId === null ? [null, null] : await Promise.all([getCompanyBrand(session.companyId), getCompanyName(session.companyId)]);
  const p = brandPalette(brand);
  const base = teamBase(mode, session.teamSize);

  const people = teams.reduce((n, t) => n + t.members.length, 0);
  const pieces = teams.reduce((n, t) => n + t.bricks.length, 0);
  const badges = new Map<number, string[]>();
  for (const r of gallery.results ?? []) for (const w of r.winners) badges.set(w.teamId, [...(badges.get(w.teamId) ?? []), r.title]);
  const muralTeams = teams.filter((t) => !gallery.hidden.includes(t.id) && gallery.photos.includes(t.id));

  const statOf = (t: (typeof teams)[number]): string | null => {
    if (mode.play === "juntos") return `${heightLabel(towerHeight(t.bricks, base))} de alto`;
    if (mode.play === "telefono") {
      return phoneScores(t.position, t.bricks)
        .map((sc, r) => `${phoneModel(t.position, r as 0 | 1).name}: ${Math.round(sc * 100)} % parecido`)
        .join(" · ");
    }
    return null;
  };

  return (
    <ReportFrame
      brand={brand}
      companyName={companyName}
      kind="Reporte de construcción en equipo"
      kicker="CONSTRUCCIÓN EN EQUIPO"
      title={mode.title}
      subtitle={`${formatDateTime(session.createdAt)} · PIN ${session.pin} · ${STATUS[session.status] ?? session.status}`}
      backHref={`/admin/biblioteca/equipos/${mode.key}`}
    >
      <ReportStats
        brand={brand}
        items={[
          { label: "Personas", value: String(people) },
          { label: "Equipos", value: String(teams.length), hint: `de hasta ${session.teamSize}` },
          { label: "Piezas", value: String(pieces), hint: "entre todos" },
          gallery.status === null
            ? { label: "Votación", value: "No", hint: "Se cerró sin galería" }
            : { label: "Votaron", value: String(gallery.voters), hint: `de ${gallery.players}` },
        ]}
      />

      <div className="no-print" style={{ display: "flex", justifyContent: "flex-end", marginTop: -10 }}>
        <MuralButton
          heading={mode.title}
          subheading={`${companyName ? `${companyName} · ` : ""}${formatDateTime(session.createdAt)}`}
          items={muralTeams.map((t) => ({ src: `/api/bricks/photo/${t.id}`, title: t.name, color: t.color, subtitle: t.members.map((m) => m.nickname).join(" · "), badges: badges.get(t.id) }))}
          filename={`mural-${session.pin}.png`}
          style={{ border: 0, borderRadius: 10, padding: "9px 16px", background: p.strong, color: "#fff", font: "inherit", fontSize: 13, fontWeight: 700, cursor: "pointer" }}
        />
      </div>

      {gallery.status !== null && (
        <ReportSection title="Galería de cierre">
          <p style={{ margin: "0 0 12px", fontSize: 12.5, color: colors.muted, lineHeight: 1.5 }}>
            Cada persona votó desde su celular por categorías, sin saber de quién era cada obra y sin poder votar por la de su equipo. Solo se muestra quién ganó cada categoría.
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 10 }}>
            {(gallery.results ?? []).map((r) => (
              <div key={r.key} className="avoid-break" style={{ borderRadius: 12, padding: "12px 14px", background: r.winners.length ? p.tint : "#F6F9FA" }}>
                <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 0.4, textTransform: "uppercase", color: p.strong }}>{r.title}</div>
                {r.winners.length === 0 ? (
                  <div style={{ fontSize: 13, color: colors.muted, marginTop: 4 }}>Nadie votó en esta categoría</div>
                ) : (
                  r.winners.map((w) => (
                    <div key={w.teamId} style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 6, fontSize: 14, fontWeight: 700, color: colors.ink }}>
                      <span aria-hidden="true" style={{ width: 10, height: 10, borderRadius: 3, background: w.color }} />
                      {w.name}
                    </div>
                  ))
                )}
                <div style={{ fontSize: 11.5, color: colors.muted, marginTop: 4 }}>
                  {r.winners.length > 1 ? `Empate con ${r.votes} votos cada una` : r.winners.length ? `${r.votes} ${r.votes === 1 ? "voto" : "votos"}` : ""}
                  {votesByCategory[r.key] ? ` · ${votesByCategory[r.key]} en total` : ""}
                </div>
              </div>
            ))}
          </div>
        </ReportSection>
      )}

      <ReportSection title="Obras">
        {teams.length === 0 ? (
          <p style={{ margin: 0, fontSize: 13, color: colors.muted }}>Nadie entró a esta sesión.</p>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(230px, 1fr))", gap: 14 }}>
            {teams.map((t) => {
              const stat = statOf(t);
              const won = badges.get(t.id);
              return (
                <div key={t.id} className="avoid-break" style={{ borderRadius: 12, overflow: "hidden", background: "#F6F9FA" }}>
                  {gallery.photos.includes(t.id) ? (
                    // Ruta privada que revisa el alcance del admin: next/image no aporta aquí.
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={`/api/bricks/photo/${t.id}`} alt={`Obra del ${t.name}`} style={{ display: "block", width: "100%", aspectRatio: "4 / 3", objectFit: "cover", background: "#16222A" }} />
                  ) : (
                    <div style={{ aspectRatio: "4 / 3", display: "grid", placeItems: "center", background: "#16222A", color: "#9DB4BF", fontSize: 12.5 }}>
                      {t.bricks.length === 0 ? "Sin piezas" : "Sin foto"}
                    </div>
                  )}
                  <div style={{ padding: "10px 12px 12px", display: "flex", flexDirection: "column", gap: 4 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span aria-hidden="true" style={{ width: 10, height: 10, borderRadius: 3, background: t.color }} />
                      <span style={{ ...calSans, fontSize: 15, color: colors.ink }}>{t.name}</span>
                      {gallery.hidden.includes(t.id) && (
                        <span style={{ marginLeft: "auto", fontSize: 10.5, fontWeight: 700, padding: "2px 8px", borderRadius: 999, background: "#fff", color: colors.inkSoft }}>Privada</span>
                      )}
                    </div>
                    {won && <span style={{ fontSize: 12, fontWeight: 700, color: p.strong }}>★ {won.join(" · ")}</span>}
                    <span style={{ fontSize: 12, color: colors.inkSoft, lineHeight: 1.45 }}>
                      {t.members.map((m) => `${m.nickname} (${m.placed})`).join(" · ") || "Sin personas"}
                    </span>
                    <span style={{ fontSize: 11.5, color: colors.muted }}>
                      {t.bricks.length === 1 ? "1 pieza" : `${t.bricks.length} piezas`}
                      {stat ? ` · ${stat}` : ""}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
        <p style={{ margin: "12px 0 0", fontSize: 11.5, color: colors.muted }}>
          Entre paréntesis, las piezas que puso cada persona. Las obras privadas no salen en el mural: su equipo prefirió no mostrarlas.
        </p>
      </ReportSection>

      <p style={{ margin: 0, fontSize: 11, color: colors.muted }}>
        {session.ablyMessages.toLocaleString("es-CO")} mensajes de tiempo real (estimado).
      </p>
    </ReportFrame>
  );
}
