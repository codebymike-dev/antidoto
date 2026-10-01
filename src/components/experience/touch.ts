// Qué tan lejos de una zona de la escena todavía cuenta como tocarla con el dedo.

/** Radio mínimo de toque con el dedo, en px de pantalla (44 de diámetro). */
export const TOUCH_RADIUS_PX = 22;

/** Radio de la zona más pequeña de las escenas, en px de la escena. */
export const SMALLEST_ZONE_R = 5;

/** Tolerancia que ya había con el dedo, en px de la escena. Nunca se baja de aquí. */
export const BASE_TOLERANCE = 11;

/**
 * Tolerancia de toque en px de la escena para que hasta la zona más chica llegue a 44 px
 * de diámetro en pantalla. `scale` son px de pantalla por px de la escena: en un celular
 * ronda 0,9 y en una pantalla grande pasa de 2, donde no hace falta más que la base.
 */
export function touchTolerance(scale: number): number {
  return Math.max(BASE_TOLERANCE, TOUCH_RADIUS_PX / Math.max(scale, 0.1) - SMALLEST_ZONE_R);
}
