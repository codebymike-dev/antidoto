// Registro de escenas: qué clase dibuja cada escena del catálogo y con qué contenido.

import type { ExperienceDef } from "@/lib/experiences/types";
import { FincaScene } from "./finca";
import { FINCA_MAP } from "./finca-map";
import { TransporteScene } from "./transporte";
import { TRANSPORTE_MAP } from "./transporte-map";
import type { PlayScene, SceneEvents, SceneMap } from "./types";

export type SceneKey = ExperienceDef["scene"];

export function createScene(key: SceneKey, events: SceneEvents = {}): PlayScene {
  return key === "transporte" ? new TransporteScene(events) : new FincaScene(events);
}

export const SCENE_MAPS: Record<SceneKey, SceneMap> = {
  finca: FINCA_MAP,
  transporte: TRANSPORTE_MAP,
};
