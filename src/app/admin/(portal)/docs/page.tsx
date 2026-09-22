import type { Metadata } from "next";
import Link from "next/link";
import { requireSuper } from "@/lib/admin-guard";
import { colors, calSans } from "@/lib/theme";
import { card } from "@/lib/styles";
import { ArrowRightIcon } from "@/components/icons";
import {
  contarPorEstado,
  REQUISITOS_FUNCIONALES,
  REQUISITOS_NO_FUNCIONALES,
  TODOS_LOS_REQUISITOS,
} from "@/data/documentacion";
import { COLUMNAS, ITERACIONES, todasLasHistorias } from "@/data/iteraciones";
import { ESTADO_UI } from "@/components/admin/docs/badges";

export const metadata: Metadata = { title: "Documentación" };

function total(modulos: { items: unknown[] }[]) {
  return modulos.reduce((n, m) => n + m.items.length, 0);
}

export default async function DocsPage() {
  await requireSuper();

  const historias = todasLasHistorias();
  const aceptadas = historias.filter((h) => h.col === "aceptada").length;
  const commits = ITERACIONES.reduce((n, it) => n + (it.commits ?? 0), 0);
  const cubiertos = new Set(historias.flatMap((h) => h.requisitos));
  const sinHistoria = TODOS_LOS_REQUISITOS.filter((r) => !cubiertos.has(r.id));

  const secciones = [
    {
      href: "/admin/docs/requerimientos-funcionales",
      titulo: "Requerimientos funcionales",
      cifra: total(REQUISITOS_FUNCIONALES),
      detalle: `${REQUISITOS_FUNCIONALES.length} módulos`,
      cuenta: contarPorEstado(REQUISITOS_FUNCIONALES),
    },
    {
      href: "/admin/docs/requerimientos-no-funcionales",
      titulo: "Requerimientos no funcionales",
      cifra: total(REQUISITOS_NO_FUNCIONALES),
      detalle: "Categorías ISO/IEC 25010",
      cuenta: contarPorEstado(REQUISITOS_NO_FUNCIONALES),
    },
    {
      href: "/admin/docs/historias-de-usuario",
      titulo: "Historias de usuario",
      cifra: historias.length,
      detalle: `${aceptadas} aceptadas · formato XP con DoD`,
      cuenta: null,
    },
    {
      href: "/admin/docs/kanban",
      titulo: "Kanban",
      cifra: ITERACIONES.length,
      detalle: `iteraciones · ${commits} commits reales`,
      cuenta: null,
    },
  ];

  return (
    <div>
      <h1 style={{ ...calSans, fontSize: 28, margin: "0 0 4px 0", color: colors.ink }}>Documentación</h1>
      <p style={{ fontSize: 14, color: colors.muted, margin: "0 0 24px 0", maxWidth: 720, lineHeight: 1.55 }}>
        Trazabilidad del proyecto desde los requisitos hasta su estado en el tablero. Todo vive como datos tipados en{" "}
        <code>src/data/documentacion.ts</code> y <code>src/data/iteraciones.ts</code>, y un test comprueba que cada
        referencia cruzada existe. Solo la ve el superadmin.
      </p>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 16, marginBottom: 28 }}>
        {secciones.map((s) => (
          <Link
            key={s.href}
            href={s.href}
            className="mission-card-link"
            style={{ ...card, display: "flex", flexDirection: "column", gap: 10, color: colors.ink }}
          >
            <span style={{ fontSize: 13, fontWeight: 600, color: colors.muted }}>{s.titulo}</span>
            <span style={{ ...calSans, fontSize: 34, lineHeight: 1, color: colors.accentDark }}>{s.cifra}</span>
            <span style={{ fontSize: 12.5, color: colors.inkSoft }}>{s.detalle}</span>
            {s.cuenta && (
              <span style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {(Object.keys(s.cuenta) as (keyof typeof s.cuenta)[]).map((e) => (
                  <span
                    key={e}
                    style={{ fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 999, background: ESTADO_UI[e].bg, color: ESTADO_UI[e].color }}
                  >
                    {s.cuenta![e]} {ESTADO_UI[e].label.toLowerCase()}
                  </span>
                ))}
              </span>
            )}
            <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 600, color: colors.accent, marginTop: "auto" }}>
              Abrir <ArrowRightIcon />
            </span>
          </Link>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 16 }}>
        <section style={card}>
          <h2 style={{ ...calSans, fontSize: 18, margin: "0 0 12px 0", color: colors.ink }}>Historias por columna</h2>
          <div style={{ display: "grid", gap: 8 }}>
            {COLUMNAS.map((c) => {
              const n = historias.filter((h) => h.col === c.id).length;
              return (
                <div key={c.id} style={{ display: "grid", gridTemplateColumns: "130px 1fr 28px", alignItems: "center", gap: 10 }}>
                  <span style={{ fontSize: 13, color: colors.inkSoft }}>{c.nombre}</span>
                  <span style={{ height: 8, borderRadius: 999, background: "#EEF2F4", overflow: "hidden" }}>
                    <span style={{ display: "block", height: "100%", width: `${(n / historias.length) * 100}%`, background: c.color, borderRadius: 999 }} />
                  </span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: colors.ink, textAlign: "right" }}>{n}</span>
                </div>
              );
            })}
          </div>
        </section>

        <section style={card}>
          <h2 style={{ ...calSans, fontSize: 18, margin: "0 0 4px 0", color: colors.ink }}>Cobertura de requisitos</h2>
          <p style={{ fontSize: 13, color: colors.muted, margin: "0 0 12px 0" }}>
            {TODOS_LOS_REQUISITOS.length - sinHistoria.length} de {TODOS_LOS_REQUISITOS.length} requisitos tienen al menos
            una historia que los implementa.
          </p>
          {sinHistoria.length > 0 && (
            <>
              <span style={{ fontSize: 11, fontWeight: 700, color: colors.muted, textTransform: "uppercase", letterSpacing: 0.6 }}>
                Sin historia
              </span>
              <ul style={{ margin: "6px 0 0 0", padding: 0, listStyle: "none", display: "grid", gap: 4 }}>
                {sinHistoria.map((r) => (
                  <li key={r.id} style={{ fontSize: 13, color: colors.inkSoft }}>
                    <strong style={{ color: colors.accentDark }}>{r.id}</strong> {r.titulo}
                  </li>
                ))}
              </ul>
            </>
          )}
        </section>
      </div>
    </div>
  );
}
