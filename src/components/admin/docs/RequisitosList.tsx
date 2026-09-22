import type { CSSProperties } from "react";
import { colors, calSans } from "@/lib/theme";
import { card } from "@/lib/styles";
import { contarPorEstado, type Modulo, type Requisito } from "@/data/documentacion";
import { EstadoBadge, ESTADO_UI, IdChip, PrioridadBadge, requisitoHref } from "./badges";

const detalleLabel: CSSProperties = {
  fontSize: 11,
  fontWeight: 700,
  color: colors.muted,
  textTransform: "uppercase",
  letterSpacing: 0.6,
};

function Detalle({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: "grid", gap: 3 }}>
      <span style={detalleLabel}>{label}</span>
      <span style={{ fontSize: 13, color: colors.inkSoft, lineHeight: 1.5, overflowWrap: "anywhere" }}>{children}</span>
    </div>
  );
}

function RequisitoCard({ r }: { r: Requisito }) {
  return (
    <article id={r.id} style={{ ...card, padding: 20, display: "grid", gap: 12, scrollMarginTop: 24 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        <IdChip id={r.id} />
        <h3 style={{ margin: 0, fontSize: 15.5, fontWeight: 700, color: colors.ink, flex: "1 1 240px" }}>{r.titulo}</h3>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          <PrioridadBadge prioridad={r.prioridad} />
          <EstadoBadge estado={r.estado} />
        </div>
      </div>
      <p style={{ margin: 0, fontSize: 14, color: colors.ink, lineHeight: 1.55 }}>{r.descripcion}</p>
      {(r.origen || r.verificacion || r.notas || r.relacionados) && (
        <div style={{ display: "grid", gap: 10, paddingTop: 12, borderTop: `1px solid ${colors.border}` }}>
          {r.origen && (
            <Detalle label="Origen">
              <code style={{ fontSize: 12.5 }}>{r.origen}</code>
            </Detalle>
          )}
          {r.verificacion && <Detalle label="Verificación">{r.verificacion}</Detalle>}
          {r.notas && <Detalle label="Notas">{r.notas}</Detalle>}
          {r.relacionados && (
            <Detalle label="Relacionados">
              <span style={{ display: "inline-flex", gap: 6, flexWrap: "wrap" }}>
                {r.relacionados.map((id) => (
                  <IdChip key={id} id={id} href={requisitoHref(id)} />
                ))}
              </span>
            </Detalle>
          )}
        </div>
      )}
    </article>
  );
}

export default function RequisitosList({
  titulo,
  subtitulo,
  modulos,
}: {
  titulo: string;
  subtitulo: string;
  modulos: Modulo[];
}) {
  const total = modulos.reduce((n, m) => n + m.items.length, 0);
  const cuenta = contarPorEstado(modulos);

  return (
    <div>
      <h1 style={{ ...calSans, fontSize: 28, margin: "0 0 4px 0", color: colors.ink }}>{titulo}</h1>
      <p style={{ fontSize: 14, color: colors.muted, margin: "0 0 18px 0", maxWidth: 720 }}>{subtitulo}</p>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 20 }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: colors.ink, marginRight: 6, alignSelf: "center" }}>
          {total} requisitos en {modulos.length} módulos
        </span>
        {(Object.keys(cuenta) as (keyof typeof cuenta)[]).map((e) => (
          <span
            key={e}
            style={{ fontSize: 12, fontWeight: 600, padding: "4px 10px", borderRadius: 999, background: ESTADO_UI[e].bg, color: ESTADO_UI[e].color }}
          >
            {cuenta[e]} {ESTADO_UI[e].label.toLowerCase()}
          </span>
        ))}
      </div>

      <nav aria-label="Módulos" style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 28 }}>
        {modulos.map((m) => (
          <a
            key={m.id}
            href={`#${m.id}`}
            style={{ fontSize: 12.5, fontWeight: 600, color: colors.accentDark, padding: "6px 12px", borderRadius: 9, background: "#fff", boxShadow: colors.cardShadowSmall }}
          >
            {m.nombre} · {m.items.length}
          </a>
        ))}
      </nav>

      <div style={{ display: "grid", gap: 32 }}>
        {modulos.map((m) => (
          <section key={m.id} id={m.id} style={{ scrollMarginTop: 24 }}>
            <h2 style={{ ...calSans, fontSize: 20, margin: "0 0 14px 0", color: colors.ink }}>{m.nombre}</h2>
            <div style={{ display: "grid", gap: 12 }}>
              {m.items.map((r) => (
                <RequisitoCard key={r.id} r={r} />
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
