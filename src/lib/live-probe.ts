// Fase 0 (prueba técnica de tiempo real). Se borra cuando exista el módulo en vivo.

export const PROBE_CHANNEL = "prueba";

export interface ProbePing {
  /** serverAt firmado: el servidor lo verifica sin guardar estado. */
  id: string;
  n: number;
  serverAt: number;
}

export interface ProbeAnswer {
  pingN: number;
  nickname: string;
  /** Medido solo con el reloj del servidor: recepción de la respuesta − publicación del ping. */
  responseMs: number;
}
