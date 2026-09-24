// Contrato común de las escenas de la Ruta del café. Cada estación dibuja su escena con
// el mismo motor pixel y la divide en tres momentos quietos; el jugador solo habla con
// esta interfaz, así una estación nueva no toca ExperiencePlayer.

import type { PixelBuffer } from "../pixel/buffer.ts";
import type { Point } from "../pixel/avatar.ts";

export type Moment = 1 | 2 | 3;

export interface Zone {
  id: string;
  x: number;
  y: number;
  r: number;
}

export interface SceneEvents {
  say?: (text: string) => void;
}

export interface PlayScene {
  readonly width: number;
  readonly height: number;
  moment: Moment;
  /** Hay una animación en curso: no se puede tocar ni cambiar de momento. */
  readonly busy: boolean;
  setMoment(m: Moment): boolean;
  setFound(zoneIds: Iterable<string>): void;
  setHint(zoneId: string | null): void;
  playIntro(onDone: () => void): void;
  skipIntro(onDone: () => void): void;
  playGoodPractice(onDone: () => void): void;
  reset(): void;
  update(dt: number): void;
  render(out: PixelBuffer): void;
  ripple(x: number, y: number): void;
  zones(): Zone[];
  hitTest(x: number, y: number, tolerance?: number): Zone | null;
  /** Dónde poner la burbuja de chat del que habla. */
  speaker(): Point;
}

/** El contenido de una escena: qué riesgo hay en cada zona y qué se dice en las demás. */
export interface SceneMap {
  moments: { id: Moment; label: string; hint: string }[];
  /** Zona de la escena → riesgo, por momento. Una zona sin riesgo cae en `ok`. */
  riskZones: Record<Moment, Record<string, string>>;
  /** Zonas donde todo está bien. */
  ok: Record<string, string>;
  /** Nombre de cada zona para el menú de zonas (teclado y pantallas pequeñas). */
  zoneLabels: Record<string, string>;
  /** Lo que se dice al tocar donde no hay nada. */
  miss: string;
  /** Primera ayuda al empezar a buscar. */
  start: string;
  /** Descripción de la escena para lectores de pantalla. */
  place: string;
  /** Cabecita del que habla en las burbujas de chat (un icono de PixelIcon). */
  speaker: "ramiro" | "fabio" | "luz" | "sara";
}

/** Riesgos que se pueden encontrar en un momento. */
export function risksInMoment(map: SceneMap, m: Moment): Set<string> {
  return new Set(Object.values(map.riskZones[m]));
}
