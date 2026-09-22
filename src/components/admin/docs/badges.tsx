import type { CSSProperties } from "react";
import { colors } from "@/lib/theme";
import type { Estado, Prioridad } from "@/data/documentacion";
import type { Historia } from "@/data/iteraciones";

const pill: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  padding: "3px 10px",
  borderRadius: 999,
  fontSize: 11.5,
  fontWeight: 600,
  whiteSpace: "nowrap",
};

export const ESTADO_UI: Record<Estado, { label: string; bg: string; color: string }> = {
  implementado: { label: "Implementado", bg: "#E3F4EC", color: "#2E7D5B" },
  parcial: { label: "Parcial", bg: "#FFF3D6", color: "#A66B00" },
  planeado: { label: "Planeado", bg: "#EEF2F4", color: colors.muted },
};

const PRIORIDAD_UI: Record<Prioridad, { label: string; dot: string }> = {
  alta: { label: "Prioridad alta", dot: colors.danger },
  media: { label: "Prioridad media", dot: "#C98A1B" },
  baja: { label: "Prioridad baja", dot: colors.mutedLight },
};

const TIPO_UI: Record<Historia["tipo"], { label: string; bg: string; color: string }> = {
  historia: { label: "Historia", bg: colors.accentTint, color: colors.accentDark },
  bug: { label: "Bug", bg: "#FCE4E1", color: colors.dangerDark },
  tarea: { label: "Tarea", bg: "#EEF2F4", color: colors.inkSoft },
  spike: { label: "Spike", bg: "#ECEAFB", color: "#5B4FC4" },
};

const VALOR_DOT: Record<Historia["valor"], string> = {
  alto: colors.danger,
  medio: "#C98A1B",
  bajo: colors.mutedLight,
};

export function EstadoBadge({ estado }: { estado: Estado }) {
  const ui = ESTADO_UI[estado];
  return <span style={{ ...pill, background: ui.bg, color: ui.color }}>{ui.label}</span>;
}

export function PrioridadBadge({ prioridad }: { prioridad: Prioridad }) {
  const ui = PRIORIDAD_UI[prioridad];
  return (
    <span style={{ ...pill, background: "#F4F7F8", color: colors.inkSoft }}>
      <span aria-hidden style={{ width: 7, height: 7, borderRadius: 999, background: ui.dot }} />
      {ui.label}
    </span>
  );
}

export function TipoBadge({ tipo }: { tipo: Historia["tipo"] }) {
  const ui = TIPO_UI[tipo];
  return <span style={{ ...pill, background: ui.bg, color: ui.color }}>{ui.label}</span>;
}

/** Punto de color del valor de negocio, junto al id de la historia. */
export function ValorDot({ valor }: { valor: Historia["valor"] }) {
  return (
    <span
      title={`Valor ${valor}`}
      aria-label={`Valor ${valor}`}
      style={{ display: "inline-block", width: 8, height: 8, borderRadius: 999, background: VALOR_DOT[valor], flexShrink: 0 }}
    />
  );
}

/** Chip de un id de requisito o historia, en monoespaciada. */
export function IdChip({ id, href }: { id: string; href?: string }) {
  const style: CSSProperties = {
    fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
    fontSize: 11.5,
    fontWeight: 600,
    color: colors.accentDark,
    background: colors.accentTint,
    padding: "2px 7px",
    borderRadius: 6,
    whiteSpace: "nowrap",
  };
  return href ? (
    <a href={href} style={style}>
      {id}
    </a>
  ) : (
    <span style={style}>{id}</span>
  );
}

/** Enlace al requisito en su página, sea funcional o no funcional. */
export function requisitoHref(id: string): string {
  const pagina = id.startsWith("RNF") ? "requerimientos-no-funcionales" : "requerimientos-funcionales";
  return `/admin/docs/${pagina}#${id}`;
}
