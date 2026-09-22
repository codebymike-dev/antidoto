import type { CSSProperties } from "react";

// Tokens de las pantallas de juego (proyector y celular): fondo casi negro de marca,
// texto blanco y superficies translúcidas. Los colores de respuesta viven en AnswerShape.
export const game = {
  bg: "#0F181D",
  surface: "rgba(255,255,255,0.06)",
  surfaceStrong: "rgba(255,255,255,0.12)",
  border: "rgba(255,255,255,0.14)",
  text: "#FFFFFF",
  muted: "#9FB8C2",
  accent: "#3BC8F3",
  danger: "#F2545B",
};

export const calSans = { fontFamily: "'Cal Sans', sans-serif" } as const;

export const liveButton: CSSProperties = {
  height: 48,
  padding: "0 22px",
  borderRadius: 12,
  border: "none",
  background: "linear-gradient(135deg,#3BC8F3,#1C99CA)",
  color: "#fff",
  fontWeight: 700,
  fontSize: 15,
  cursor: "pointer",
  whiteSpace: "nowrap",
};

export const liveGhostButton: CSSProperties = {
  ...liveButton,
  background: game.surfaceStrong,
  border: `1px solid ${game.border}`,
};

export const formatPin = (pin: string) => `${pin.slice(0, 3)} ${pin.slice(3)}`;
