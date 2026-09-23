// Vencimiento de los códigos de actividad. Puro para poder probarlo.
//
// El admin elige un día con <input type="date"> y se guarda "YYYY-MM-DD". new Date()
// lo lee como medianoche UTC, que en Colombia es las 7 pm del día ANTERIOR: un código
// "vence el 22" dejaba de funcionar el 21 por la tarde. Lo esperado es que sirva todo
// ese día, así que un día sin hora vence al terminar el día en hora de Colombia.

/** Colombia no tiene horario de verano: el offset es fijo. */
const COLOMBIA_OFFSET = "-05:00";
const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

export const isDateOnly = (value: string) => DATE_ONLY.test(value);

/** Instante (epoch ms) a partir del cual el código ya no sirve. NaN si la fecha no es válida. */
export function expiryInstant(expiresAt: string): number {
  return isDateOnly(expiresAt)
    ? Date.parse(`${expiresAt}T23:59:59.999${COLOMBIA_OFFSET}`)
    : Date.parse(expiresAt);
}

export function isExpired(expiresAt: string | null, now: number = Date.now()): boolean {
  if (!expiresAt) return false;
  return expiryInstant(expiresAt) < now;
}

/** "22 sep 2026": el día que eligió el admin, sin correrlo por la zona horaria del servidor. */
export function formatExpiryDate(expiresAt: string): string {
  const date = isDateOnly(expiresAt) ? new Date(`${expiresAt}T12:00:00${COLOMBIA_OFFSET}`) : new Date(expiresAt);
  if (Number.isNaN(date.getTime())) return expiresAt;
  return date.toLocaleDateString("es-CO", { timeZone: "America/Bogota", day: "2-digit", month: "short", year: "numeric" });
}
