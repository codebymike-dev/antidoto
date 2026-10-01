// Piezas compartidas por las tarjetas de la biblioteca y de la página de cada actividad.
import { colors } from "@/lib/theme";
import { card } from "@/lib/styles";

/** Tipos de actividad que viven en la biblioteca. Cada tarjeta lleva la etiqueta del suyo. */
export const ACTIVITY_TYPES = {
  escenas: { label: "Escena interactiva", dot: colors.accentLight },
  juegos: { label: "Juego en vivo", dot: "#FF5A4E" },
} as const;
export type ActivityType = keyof typeof ACTIVITY_TYPES;

/** Etiqueta del tipo de actividad, sobre la miniatura de la tarjeta. */
export function TypeChip({ type }: { type: ActivityType }) {
  const t = ACTIVITY_TYPES[type];
  return (
    <span style={{ ...thumbChip, left: 10 }}>
      <span aria-hidden style={{ width: 8, height: 8, borderRadius: 999, background: t.dot, boxShadow: `0 0 0 3px ${t.dot}33` }} />
      {t.label}
    </span>
  );
}

/** Dato corto en la esquina inferior de la miniatura (p. ej. "5 estaciones"). */
export function ThumbNote({ children }: { children: React.ReactNode }) {
  return <span style={{ ...thumbChip, right: 10, top: "auto", bottom: 10 }}>{children}</span>;
}

export const libraryGrid = { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 18 };

export const cardShell = { ...card, padding: 0, overflow: "hidden", display: "flex", flexDirection: "column" as const };

export const cardBody = { padding: 18, display: "flex", flexDirection: "column" as const, gap: 10, flex: 1 };

export const cardDescription = { fontSize: 13, color: colors.muted, margin: 0, lineHeight: 1.5 };

export const cardStats = { display: "flex", gap: 14, flexWrap: "wrap" as const, fontSize: 12.5, color: colors.muted };

export const cardFooter = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  flexWrap: "wrap" as const,
  marginTop: "auto",
  paddingTop: 12,
  borderTop: `1px solid ${colors.accentTint}`,
};

export const textLink = {
  display: "inline-flex",
  alignItems: "center",
  gap: 4,
  fontSize: 13,
  fontWeight: 700,
  color: colors.accent,
};

export const statLink = { display: "inline-flex", alignItems: "center", gap: 2, fontWeight: 600, color: colors.accent };

export const tagChip = {
  alignSelf: "flex-start" as const,
  fontSize: 10.5,
  fontWeight: 700,
  color: colors.accentDark,
  letterSpacing: 0.5,
  background: colors.accentTint,
  padding: "4px 10px",
  borderRadius: 999,
};

const thumbChip = {
  position: "absolute" as const,
  top: 10,
  display: "inline-flex",
  alignItems: "center",
  gap: 8,
  padding: "5px 10px",
  borderRadius: 8,
  background: "rgba(15,24,29,0.85)",
  color: "#fff",
  fontSize: 12,
  fontWeight: 600,
};
