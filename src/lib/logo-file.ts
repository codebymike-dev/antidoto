// Validación del archivo de logo. El editor ya lo recorta y comprime en el navegador, pero
// el servidor no se fía: identifica el formato por sus bytes, no por el nombre ni por el
// tipo que declare el navegador. Módulo puro para poder probarlo.

/** Tope del archivo ya procesado. El editor acepta originales de hasta LOGO_MAX_INPUT_BYTES. */
export const LOGO_MAX_BYTES = 200 * 1024;
export const LOGO_MAX_INPUT_BYTES = 8 * 1024 * 1024;

export type LogoMime = "image/png" | "image/jpeg" | "image/webp" | "image/svg+xml";

const startsWith = (bytes: Uint8Array, sig: number[], offset = 0) => sig.every((b, i) => bytes[offset + i] === b);

/** Formato real del archivo por su firma, o null si no es un logo admitido. */
export function sniffLogo(bytes: Uint8Array): LogoMime | null {
  if (startsWith(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return "image/png";
  if (startsWith(bytes, [0xff, 0xd8, 0xff])) return "image/jpeg";
  // "RIFF" + tamaño + "WEBP"
  if (startsWith(bytes, [0x52, 0x49, 0x46, 0x46]) && startsWith(bytes, [0x57, 0x45, 0x42, 0x50], 8)) return "image/webp";
  const head = new TextDecoder().decode(bytes.subarray(0, 1024)).replace(/^﻿/, "").trimStart();
  const prolog = /^(<\?xml[^>]*\?>\s*)?(<!--[\s\S]*?-->\s*)*(<!DOCTYPE[^>]*>\s*)?(<!--[\s\S]*?-->\s*)*<svg[\s>]/i;
  return prolog.test(head) ? "image/svg+xml" : null;
}

/**
 * Un SVG puede llevar código. Como <img> no lo ejecuta y la ruta del logo sale con CSP, esto
 * es una segunda barrera: se rechaza cualquier SVG con scripts, manejadores de eventos,
 * contenido HTML embebido o referencias externas, que un logo nunca necesita.
 */
export function unsafeSvg(text: string): boolean {
  return /<script|<foreignObject|<iframe|<embed|<object|\son[a-z]+\s*=|javascript:|<!ENTITY|(?:href|src)\s*=\s*["']\s*(?:https?:|\/\/)/i.test(text);
}

export type LogoCheck = { ok: true; mime: LogoMime } | { ok: false; error: string };

export function checkLogo(bytes: Uint8Array): LogoCheck {
  if (bytes.length === 0) return { ok: false, error: "El archivo del logo está vacío." };
  if (bytes.length > LOGO_MAX_BYTES) return { ok: false, error: "El logo pesa más de 200 KB. Prueba con una versión más liviana." };
  const mime = sniffLogo(bytes);
  if (!mime) return { ok: false, error: "Formato no admitido. Usa PNG, JPG, WebP o SVG." };
  if (mime === "image/svg+xml" && unsafeSvg(new TextDecoder().decode(bytes))) {
    return { ok: false, error: "Este SVG trae código o enlaces externos. Expórtalo de nuevo como SVG simple o como PNG." };
  }
  return { ok: true, mime };
}

/** URL pública del logo. La versión cambia con el archivo, así que se puede cachear para siempre. */
export const logoUrl = (companyId: number, version: string) => `/marca/${companyId}/logo?v=${version}`;
