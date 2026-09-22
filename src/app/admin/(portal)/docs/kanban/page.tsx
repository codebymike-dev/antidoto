import type { Metadata } from "next";
import Link from "next/link";
import { requireSuper } from "@/lib/admin-guard";
import { colors, calSans } from "@/lib/theme";
import { card, tabButton, tabButtonActive } from "@/lib/styles";
import { COLUMNAS, commitsUrl, ITERACIONES, PARES, todasLasHistorias } from "@/data/iteraciones";
import { IdChip, TipoBadge, ValorDot } from "@/components/admin/docs/badges";

export const metadata: Metadata = { title: "Kanban" };

export default async function KanbanPage({ searchParams }: { searchParams: Promise<{ it?: string }> }) {
  await requireSuper();

  const { it } = await searchParams;
  const iteracion = ITERACIONES.find((i) => i.id === it) ?? null;
  const historias = todasLasHistorias().filter((h) => !iteracion || h.iteracion.id === iteracion.id);

  return (
    <div>
      <h1 style={{ ...calSans, fontSize: 28, margin: "0 0 4px 0", color: colors.ink }}>Kanban</h1>
      <p style={{ fontSize: 14, color: colors.muted, margin: "0 0 18px 0", maxWidth: 760, lineHeight: 1.55 }}>
        Tablero XP reconstruido del historial real de git. Las iteraciones ya hechas enlazan a sus commits; las
        pendientes salen del plan del módulo en vivo y de los huecos encontrados al documentar.
      </p>

      <nav aria-label="Filtrar por iteración" style={{ display: "flex", gap: 4, flexWrap: "wrap", marginBottom: 20 }}>
        <Link href="/admin/docs/kanban" className={!iteracion ? "btn-tab-active" : "btn-tab"} style={!iteracion ? tabButtonActive : tabButton}>
          Todas
        </Link>
        {ITERACIONES.map((i) => {
          const on = iteracion?.id === i.id;
          return (
            <Link
              key={i.id}
              href={`/admin/docs/kanban?it=${i.id}`}
              className={on ? "btn-tab-active" : "btn-tab"}
              style={on ? tabButtonActive : tabButton}
            >
              {i.nombre}
            </Link>
          );
        })}
      </nav>

      {iteracion && (
        <div style={{ ...card, marginBottom: 20, display: "grid", gap: 6 }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: colors.muted }}>
            {iteracion.fase} · {iteracion.rango}
            {iteracion.commits ? ` · ${iteracion.commits} commits` : ""}
          </span>
          <p style={{ margin: 0, fontSize: 14, color: colors.ink, lineHeight: 1.55 }}>{iteracion.resumen}</p>
        </div>
      )}

      <div style={{ overflowX: "auto", paddingBottom: 8, marginBottom: 36 }}>
        <div style={{ display: "grid", gridTemplateColumns: `repeat(${COLUMNAS.length}, minmax(230px, 1fr))`, gap: 12, minWidth: COLUMNAS.length * 242 }}>
          {COLUMNAS.map((c) => {
            const enColumna = historias.filter((h) => h.col === c.id);
            return (
              <section key={c.id} aria-label={c.nombre} style={{ background: "#EEF3F5", borderRadius: 16, padding: 12, display: "flex", flexDirection: "column", gap: 10 }}>
                <h2 style={{ display: "flex", alignItems: "center", gap: 8, margin: "2px 4px 4px", fontSize: 13, fontWeight: 700, color: colors.ink }}>
                  <span aria-hidden style={{ width: 9, height: 9, borderRadius: 999, background: c.color }} />
                  {c.nombre}
                  <span style={{ marginLeft: "auto", fontSize: 12, fontWeight: 600, color: colors.muted }}>{enColumna.length}</span>
                </h2>
                {enColumna.length === 0 && (
                  <p style={{ margin: "6px 4px", fontSize: 12.5, color: colors.mutedLight }}>Sin historias.</p>
                )}
                {enColumna.map((h) => {
                  const hechos = h.dod.filter((d) => d.estado === "pass").length;
                  return (
                    <Link
                      key={h.id}
                      href={`/admin/docs/historias-de-usuario#${h.id}`}
                      className="mission-card-link"
                      style={{ background: "#fff", borderRadius: 12, padding: 12, display: "grid", gap: 8, boxShadow: "0 2px 8px rgba(12,92,125,0.06)", color: colors.ink }}
                    >
                      <span style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                        <ValorDot valor={h.valor} />
                        <IdChip id={h.id} />
                        <TipoBadge tipo={h.tipo} />
                      </span>
                      <span style={{ fontSize: 13, lineHeight: 1.45 }}>{h.titulo}</span>
                      <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ flex: 1, height: 5, borderRadius: 999, background: "#EEF2F4", overflow: "hidden" }}>
                          <span style={{ display: "block", height: "100%", width: `${(hechos / h.dod.length) * 100}%`, background: c.color }} />
                        </span>
                        <span style={{ fontSize: 11, fontWeight: 600, color: colors.muted }}>
                          DoD {hechos}/{h.dod.length}
                        </span>
                        <span
                          title={`${PARES[h.par].nombre} · ${PARES[h.par].rol}`}
                          style={{ width: 22, height: 22, borderRadius: 999, background: PARES[h.par].color, color: "#fff", fontSize: 9.5, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center" }}
                        >
                          {h.par}
                        </span>
                      </span>
                    </Link>
                  );
                })}
              </section>
            );
          })}
        </div>
      </div>

      <h2 style={{ ...calSans, fontSize: 20, margin: "0 0 14px 0", color: colors.ink }}>Iteraciones</h2>
      <ol style={{ margin: 0, padding: 0, listStyle: "none", display: "grid", gap: 12 }}>
        {ITERACIONES.map((i, n) => {
          const aceptadas = i.historias.filter((h) => h.col === "aceptada").length;
          return (
            <li key={i.id} style={{ ...card, padding: 18, display: "grid", gridTemplateColumns: "36px 1fr", gap: 14 }}>
              <span
                style={{ width: 32, height: 32, borderRadius: 999, background: aceptadas === i.historias.length ? colors.buttonGradient : colors.accentTint, color: aceptadas === i.historias.length ? "#fff" : colors.accentDark, fontSize: 13, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center" }}
              >
                {n + 1}
              </span>
              <div style={{ display: "grid", gap: 6, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "baseline", gap: 10, flexWrap: "wrap" }}>
                  <Link href={`/admin/docs/kanban?it=${i.id}`} style={{ fontSize: 15, fontWeight: 700, color: colors.ink }}>
                    {i.nombre}
                  </Link>
                  <span style={{ fontSize: 12, color: colors.muted }}>
                    {i.fase} · {i.rango} · {aceptadas}/{i.historias.length} aceptadas
                  </span>
                  {i.ghSince && i.ghUntil && (
                    <a
                      href={commitsUrl(i.ghSince, i.ghUntil)}
                      target="_blank"
                      rel="noreferrer"
                      style={{ fontSize: 12, fontWeight: 600, color: colors.accent, marginLeft: "auto" }}
                    >
                      {i.commits} commits ↗
                    </a>
                  )}
                </div>
                <p style={{ margin: 0, fontSize: 13.5, color: colors.inkSoft, lineHeight: 1.55 }}>{i.resumen}</p>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
