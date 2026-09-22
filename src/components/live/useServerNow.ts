"use client";

import { useEffect, useState } from "react";

/**
 * Hora del servidor que avanza sola (Date.now() + desfase). null hasta montar: depende
 * del reloj del dispositivo y no debe salir del render del servidor.
 */
export function useServerNow(offsetMs: number, intervalMs = 200): number | null {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now === null ? null : now + offsetMs;
}
