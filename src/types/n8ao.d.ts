// n8ao no publica tipos. Solo lo que usa el banco de pruebas de ladrillos.
declare module "n8ao" {
  import type { Camera, Scene } from "three";
  import { Pass } from "postprocessing";

  export class N8AOPostPass extends Pass {
    constructor(scene: Scene, camera: Camera, width?: number, height?: number);
    configuration: {
      aoRadius: number;
      distanceFalloff: number;
      intensity: number;
      halfRes: boolean;
      aoSamples: number;
      denoiseRadius: number;
      gammaCorrection: boolean;
      screenSpaceRadius: boolean;
    };
    setQualityMode(mode: "Performance" | "Low" | "Medium" | "High" | "Ultra"): void;
  }
}
