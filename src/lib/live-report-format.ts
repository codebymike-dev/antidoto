// Formato de los reportes en vivo. Puro para poder probarlo.

/** Fechas de SQLite ("YYYY-MM-DD HH:MM:SS", UTC) en hora de Colombia: el servidor corre en UTC. */
export function formatDateTime(value: string | null): string {
  if (!value) return "Sin registro";
  const date = new Date(value.replace(" ", "T") + (value.endsWith("Z") ? "" : "Z"));
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("es-CO", {
    timeZone: "America/Bogota",
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function durationMinutes(start: string | null, end: string | null): number | null {
  if (!start || !end) return null;
  const ms = Date.parse(end.replace(" ", "T") + "Z") - Date.parse(start.replace(" ", "T") + "Z");
  return Number.isFinite(ms) && ms >= 0 ? Math.max(1, Math.round(ms / 60000)) : null;
}

/**
 * Celda CSV según RFC 4180, y neutraliza fórmulas: apodos y palabras los escriben los
 * jugadores, y un "=HYPERLINK(...)" se ejecutaría al abrir el archivo en Excel.
 */
export function csvCell(value: string | number | null): string {
  let text = value === null ? "" : String(value);
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

/**
 * Estado legible de una partida para el historial. Un desafío (con `closesAt`) cierra
 * solo al llegar la fecha, aunque la fila siga abierta hasta que alguien la actualice.
 */
export function matchStatusLabel(status: string, startedAt: string | null, closesAt: string | null = null, now = Date.now()): string {
  if (closesAt !== null) {
    const closed = status === "finished" || Date.parse(closesAt.replace(" ", "T") + "Z") <= now;
    return closed ? "Desafío cerrado" : `Desafío abierto hasta ${formatDateTime(closesAt)}`;
  }
  if (status === "finished") return startedAt ? "Terminada" : "Cerrada sin jugar";
  if (status === "lobby") return "En sala de espera";
  return "En curso";
}

export const formatSeconds = (ms: number | null) => (ms === null ? "–" : `${(ms / 1000).toFixed(1)} s`);
