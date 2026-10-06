// Motor del banco de pruebas: el escenario compartido más una ciudad de prueba de 500 a 3.000
// ladrillos. React solo pinta el panel de métricas.

import * as THREE from "three";
import { labModel } from "@/lib/bricks/lab-model";
import type { Tier } from "../material";
import { Stage, type FrameStats } from "../stage";
import { buildModel, type BuiltModel } from "./build-model";

export { TIERS } from "../stage";

export interface LabStats extends FrameStats {
  buildMs: number;
  studs: number;
}

export class LabEngine {
  private stage: Stage;
  private built: BuiltModel | null = null;
  private tier: Tier;
  private extra = { buildMs: 0, studs: 0 };

  constructor(canvas: HTMLCanvasElement, tier: Tier) {
    this.tier = tier;
    this.stage = new Stage(canvas, tier);
  }

  get stats(): LabStats {
    return { ...this.stage.stats, ...this.extra };
  }

  setModel(count: number, reframe: boolean) {
    const model = labModel(count);
    const t0 = performance.now();
    const next = buildModel(model, this.tier);
    this.extra = { buildMs: performance.now() - t0, studs: next.studs };
    if (this.built) {
      this.stage.scene.remove(this.built.group);
      this.built.dispose();
    }
    this.built = next;
    this.stage.scene.add(next.group);

    const center = new THREE.Vector3(model.base / 2, 2, model.base / 2);
    this.stage.setBounds(center, model.base);
    if (reframe) this.stage.frame(center, model.base);
    this.stage.request();
  }

  setOrbit(on: boolean) {
    this.stage.setAutoRotate(on);
  }

  resize(width: number, height: number) {
    this.stage.resize(width, height);
  }

  dispose() {
    this.built?.dispose();
    this.stage.dispose();
  }
}
