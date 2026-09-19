import type { LiveRound } from "./types";

/** Guion de la sesión en vivo. Es contenido fijo del producto, no dato de BD. */
export const LIVE_ROUNDS: LiveRound[] = [
  {
    prompt: "¿Cómo te sientes en este momento?",
    options: [
      { label: "Con energía", pct: 48 },
      { label: "Neutral", pct: 35 },
      { label: "Cansado/a", pct: 17 },
    ],
  },
  {
    prompt: "Elige la herramienta de bienestar que más te llama hoy",
    options: [
      { label: "Respiración guiada", pct: 52 },
      { label: "Pausa activa", pct: 30 },
      { label: "Gratitud", pct: 18 },
    ],
  },
  {
    prompt: "¿Qué obstáculo sientes más presente?",
    options: [
      { label: "Falta de tiempo", pct: 44 },
      { label: "Estrés acumulado", pct: 39 },
      { label: "Desmotivación", pct: 17 },
    ],
  },
  {
    prompt: "Selecciona el momento del día donde más lo necesitas",
    options: [
      { label: "Mañana", pct: 29 },
      { label: "Media jornada", pct: 46 },
      { label: "Fin del día", pct: 25 },
    ],
  },
  {
    prompt: "¿Qué tan lista/o te sientes para continuar?",
    options: [
      { label: "Muy lista/o", pct: 57 },
      { label: "Algo lista/o", pct: 33 },
      { label: "Necesito una pausa más", pct: 10 },
    ],
  },
];

export const ESTADO_STYLES: Record<string, { label: string; bg: string; color: string }> = {
  activo: { label: "Activo", bg: "#E0F7EA", color: "#1F8A4C" },
  pausado: { label: "Pausado", bg: "#FFF3D6", color: "#A66B00" },
  vencido: { label: "Vencido", bg: "#FCE4E1", color: "#C0392B" },
};

export const GAME_MODE: "autoritmo" | "sincronizado" = "autoritmo";
