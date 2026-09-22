import type { Metadata } from "next";
import { requireSuper } from "@/lib/admin-guard";
import { colors, calSans } from "@/lib/theme";
import { card } from "@/lib/styles";
import { COLUMNAS, PARES, todasLasHistorias } from "@/data/iteraciones";
import { IdChip, requisitoHref, TipoBadge, ValorDot } from "@/components/admin/docs/badges";

export const metadata: Metadata = { title: "Historias de usuario" };

// Las historias viven una sola vez, dentro del kanban (src/data/iteraciones.ts).
// Esta página las agrupa por actor, que se extrae del propio "Como X, ...".
function actorDe(titulo: string): string {
  const m = titulo.match(/^Como\s+([^,]+),/i);
  return m ? m[1].trim() : "Sin actor";
}

export default async function HistoriasPage() {
  await requireSuper();

  const historias = todasLasHistorias();
  const grupos = new Map<string, typeof historias>();
  for (const h of historias) {
    const actor = actorDe(h.titulo);
    grupos.set(actor, [...(grupos.get(actor) ?? []), h]);
  }
  const columna = (id: string) => COLUMNAS.find((c) => c.id === id)!;

  return (
    <div>
      <h1 style={{ ...calSans, fontSize: 28, margin: "0 0 4px 0", color: colors.ink }}>Historias de usuario</h1>
      <p style={{ fontSize: 14, color: colors.muted, margin: "0 0 18px 0", maxWidth: 720, lineHeight: 1.55 }}>
        {historias.length} historias en formato XP (&quot;Como X, quiero Y para Z&quot;), agrupadas por actor. Cada una
        enlaza los requisitos que implementa y su Definition of Done; el punto de color marca el valor de negocio.
      </p>

      <nav aria-label="Actores" style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 28 }}>
        {[...grupos].map(([actor, hs]) => (
          <a
            key={actor}
            href={`#actor-${actor.replace(/\s+/g, "-")}`}
            style={{ fontSize: 12.5, fontWeight: 600, color: colors.accentDark, padding: "6px 12px", borderRadius: 9, background: "#fff", boxShadow: colors.cardShadowSmall }}
          >
            {actor} · {hs.length}
          </a>
        ))}
      </nav>

      <div style={{ display: "grid", gap: 32 }}>
        {[...grupos].map(([actor, hs]) => (
          <section key={actor} id={`actor-${actor.replace(/\s+/g, "-")}`} style={{ scrollMarginTop: 24 }}>
            <h2 style={{ ...calSans, fontSize: 20, margin: "0 0 14px 0", color: colors.ink, textTransform: "capitalize" }}>{actor}</h2>
            <div style={{ display: "grid", gap: 12 }}>
              {hs.map((h) => {
                const col = columna(h.col);
                const hechos = h.dod.filter((c) => c.estado === "pass").length;
                return (
                  <article key={h.id} id={h.id} style={{ ...card, padding: 20, display: "grid", gap: 12, scrollMarginTop: 24 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                      <ValorDot valor={h.valor} />
                      <IdChip id={h.id} />
                      <TipoBadge tipo={h.tipo} />
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 600, color: colors.inkSoft }}>
                        <span aria-hidden style={{ width: 8, height: 8, borderRadius: 2, background: col.color }} />
                        {col.nombre}
                      </span>
                      <span style={{ fontSize: 12, color: colors.muted, marginLeft: "auto" }}>
                        {h.iteracion.nombre} · {PARES[h.par].nombre}
                      </span>
                    </div>
                    <h3 style={{ margin: 0, fontSize: 15, fontWeight: 600, color: colors.ink, lineHeight: 1.5 }}>{h.titulo}</h3>
                    <div style={{ display: "grid", gap: 6 }}>
                      <span style={{ fontSize: 11, fontWeight: 700, color: colors.muted, textTransform: "uppercase", letterSpacing: 0.6 }}>
                        Definition of Done · {hechos}/{h.dod.length}
                      </span>
                      <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "grid", gap: 5 }}>
                        {h.dod.map((c) => (
                          <li key={c.texto} style={{ display: "flex", gap: 8, fontSize: 13, color: colors.inkSoft, lineHeight: 1.5 }}>
                            <span aria-label={c.estado === "pass" ? "Cumplido" : "Pendiente"} style={{ color: c.estado === "pass" ? "#2E7D5B" : colors.mutedLight, fontWeight: 700 }}>
                              {c.estado === "pass" ? "✓" : "○"}
                            </span>
                            {c.texto}
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
                      <span style={{ fontSize: 11, fontWeight: 700, color: colors.muted, textTransform: "uppercase", letterSpacing: 0.6, marginRight: 4 }}>
                        Requisitos
                      </span>
                      {h.requisitos.map((id) => (
                        <IdChip key={id} id={id} href={requisitoHref(id)} />
                      ))}
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
