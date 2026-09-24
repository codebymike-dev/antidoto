// Registro de escenas: qué clase dibuja cada escena del catálogo y con qué contenido.

import type { ExperienceDef } from "@/lib/experiences/types";
import { FincaScene } from "./finca";
import { FINCA_MAP } from "./finca-map";
import { TransporteScene } from "./transporte";
import { TrilladoraScene } from "./trilladora";
import { TRILLADORA_MAP } from "./trilladora-map";
import { TostionScene } from "./tostion";
import { TOSTION_MAP } from "./tostion-map";
import { TiendaScene } from "./tienda";
import { TIENDA_MAP } from "./tienda-map";
import { TRANSPORTE_MAP } from "./transporte-map";
import type { PlayScene, SceneEvents, SceneMap } from "./types";

export type SceneKey = ExperienceDef["scene"];

export function createScene(key: SceneKey, events: SceneEvents = {}): PlayScene {
  if (key === "transporte") return new TransporteScene(events);
  if (key === "trilladora") return new TrilladoraScene(events);
  if (key === "tostion") return new TostionScene(events);
  if (key === "tienda") return new TiendaScene(events);
  return new FincaScene(events);
}

export const SCENE_MAPS: Record<SceneKey, SceneMap> = {
  finca: FINCA_MAP,
  transporte: TRANSPORTE_MAP,
  trilladora: TRILLADORA_MAP,
  tostion: TOSTION_MAP,
  tienda: TIENDA_MAP,
};
