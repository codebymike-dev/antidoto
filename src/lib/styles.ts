import type { CSSProperties } from "react";
import { colors } from "./theme";

export const fieldLabel: CSSProperties = {
  fontSize: 12,
  fontWeight: 600,
  color: colors.accentDark,
  textTransform: "uppercase",
  letterSpacing: 0.6,
};

export const fieldInput: CSSProperties = {
  height: 48,
  borderRadius: 12,
  border: `1.5px solid ${colors.border}`,
  padding: "0 14px",
  fontSize: 15,
  outline: "none",
  color: colors.ink,
  width: "100%",
};

export const primaryButton: CSSProperties = {
  height: 52,
  borderRadius: 12,
  border: "none",
  background: colors.buttonGradient,
  color: "#ffffff",
  fontWeight: 600,
  fontSize: 15.5,
  cursor: "pointer",
  marginTop: 6,
  boxShadow: colors.buttonShadow,
};

export const secondaryButton: CSSProperties = {
  height: 44,
  padding: "0 16px",
  borderRadius: 11,
  border: `1.5px solid ${colors.accentLight}`,
  background: "#fff",
  color: colors.accent,
  fontWeight: 600,
  fontSize: 13,
  cursor: "pointer",
  whiteSpace: "nowrap",
};

export const filledButton: CSSProperties = {
  height: 44,
  padding: "0 20px",
  borderRadius: 11,
  border: "none",
  background: colors.buttonGradient,
  color: "#fff",
  fontWeight: 600,
  fontSize: 14,
  cursor: "pointer",
  whiteSpace: "nowrap",
};

export const card: CSSProperties = {
  background: "#fff",
  borderRadius: 18,
  padding: 22,
  boxShadow: colors.cardShadowSmall,
};

export const cardAccent: CSSProperties = {
  ...card,
  borderTop: `4px solid ${colors.accentLight}`,
};
