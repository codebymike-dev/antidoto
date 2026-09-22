// Lo que el celular del jugador muestra de sí mismo, calculado desde la foto de estado.
// Puro para probarlo sin navegador. Textos según docs/investigacion-ux-kahoot.md (6.x).

import type { LeaderboardEntry } from "./live-engine";
import type { PlayerSnapshot } from "./live-protocol";

export type Outcome = "correct" | "incorrect" | "noAnswer" | "participated";

export interface Standing {
  rank: number;
  score: number;
  streak: number;
  lastPoints: number;
  /** El jugador justo arriba: convierte el ranking en un duelo alcanzable. */
  rival: { nickname: string; gap: number } | null;
  total: number;
}

/** Resultado de la pregunta revelada para este jugador. null si no hay reveal. */
export function outcomeOf(s: Pick<PlayerSnapshot, "reveal" | "question" | "myAnswer">): Outcome | null {
  if (!s.reveal || !s.question) return null;
  const scored = s.question.type === "quiz" || s.question.type === "vf";
  if (!s.myAnswer) return "noAnswer";
  if (!scored) return "participated";
  return s.myAnswer.optionIndex !== null && s.reveal.correct.includes(s.myAnswer.optionIndex) ? "correct" : "incorrect";
}

export function standingOf(entries: LeaderboardEntry[], nickname: string): Standing | null {
  const i = entries.findIndex((e) => e.nickname === nickname);
  if (i === -1) return null;
  const me = entries[i];
  // El rival es el primero de arriba con más puntos (con empate no hay a quién alcanzar).
  let rival: Standing["rival"] = null;
  for (let j = i - 1; j >= 0; j--) {
    if (entries[j].score > me.score) {
      rival = { nickname: entries[j].nickname, gap: entries[j].score - me.score };
      break;
    }
  }
  return { rank: me.rank, score: me.score, streak: me.streak, lastPoints: me.lastPoints, rival, total: entries.length };
}

/** Frase de posición: "¡Estás en el podio!" o "A 120 puntos de Ana". */
export function standingLine(st: Standing): string {
  if (st.rank <= 3) return "¡Estás en el podio!";
  if (!st.rival) return `Vas en ${st.rank}º lugar`;
  return `A ${st.rival.gap} puntos de ${st.rival.nickname}`;
}

// --- Textos con variedad (efecto desgaste: no repetir siempre lo mismo) ---------------

const ENCOURAGEMENT = [
  "¡Buen intento!",
  "Nadie dijo que sería fácil 😉",
  "Todavía no termina",
  "Aún puedes dar vuelta el marcador",
  "Creemos en ti",
  "Todos tenemos días malos ⛈",
  "Lo mejor está por venir",
];

const HEADLINES: { upTo: number; lines: string[] }[] = [
  { upTo: 1, lines: ["¡Primer lugar!", "¡Leyenda!", "¡Imbatible!", "¡Qué nivel!", "¡Campeón del día!"] },
  { upTo: 2, lines: ["¡Impresionante!", "¡Magistral!", "¡De lujo!", "¡Increíble!"] },
  { upTo: 3, lines: ["¡Excelente!", "¡Bien jugado!", "¡Lo lograste!", "¿Suerte o puro talento?"] },
  { upTo: 5, lines: ["¡Gran partida!", "¡Chócala!", "¡Estrella en ascenso!", "¡Muy bien!"] },
  { upTo: 10, lines: ["¡El podio está cerca!", "¡Casi en el podio!", "¡Sigue así!"] },
  { upTo: Infinity, lines: ["La próxima es tuya", "¡Nunca te rindas!", "Roma no se construyó en un día"] },
];

/**
 * Elige una variante estable para la misma semilla: no cambia al volver a pintar ni
 * al reconectar, pero cada jugador y cada pregunta ven textos distintos.
 */
export function pick(options: string[], seed: string): string {
  let h = 0;
  for (const ch of seed) h = (h * 31 + ch.charCodeAt(0)) | 0;
  return options[Math.abs(h) % options.length];
}

export const encouragement = (seed: string) => pick(ENCOURAGEMENT, seed);

export const finalHeadline = (rank: number, seed: string) =>
  pick(HEADLINES.find((h) => rank <= h.upTo)!.lines, seed);
