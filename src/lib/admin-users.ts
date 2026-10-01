import { randomInt } from "node:crypto";

// Reglas de los usuarios del portal. Sin "server-only" ni base de datos para poder
// probarlas con node --test; las acciones viven en user-actions.ts.

export const PASSWORD_MIN = 10;
export const PASSWORD_MAX = 200;

/** El login compara en minúsculas y sin espacios: el alta guarda el usuario igual. */
export function normalizeUsername(raw: string): string {
  return raw.trim().toLowerCase();
}

/** Mensaje de error para mostrar, o null si el usuario sirve. Recibe el valor ya normalizado. */
export function usernameError(username: string): string | null {
  if (username.length < 3) return "El usuario debe tener al menos 3 caracteres.";
  if (username.length > 60) return "El usuario puede tener hasta 60 caracteres.";
  // Un correo también sirve como usuario: es lo que más fácil recuerda la gente.
  if (!/^[a-z0-9][a-z0-9._@-]*$/.test(username)) {
    return "Usa solo letras sin tilde, números, punto, guion, guion bajo o @, sin espacios.";
  }
  return null;
}

export function passwordError(password: string): string | null {
  if (password.length < PASSWORD_MIN) return `La contraseña debe tener al menos ${PASSWORD_MIN} caracteres.`;
  if (password.length > PASSWORD_MAX) return `La contraseña puede tener hasta ${PASSWORD_MAX} caracteres.`;
  return null;
}

// Sin 0/O/o, 1/l/I: la contraseña inicial se dicta o se copia de un chat.
const PASSWORD_ALPHABET = "abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";

/**
 * Contraseña inicial en tres bloques de 4 (p. ej. "Kp7m-X9qr-2fHt"): unos 69 bits,
 * fácil de copiar y más larga que el mínimo. randomInt no tiene sesgo de módulo.
 */
export function generatePassword(): string {
  const block = () => Array.from({ length: 4 }, () => PASSWORD_ALPHABET[randomInt(PASSWORD_ALPHABET.length)]).join("");
  return `${block()}-${block()}-${block()}`;
}
