// Motor del banco de pruebas, en three.js puro y fuera de React (React solo pinta el panel).
// Renderiza por demanda: un constructor pasa casi todo el tiempo quieto, así que solo se
// dibuja cuando la cámara se mueve o cambia el modelo. La luz y el modelo son estáticos durante
// la órbita, así que el mapa de sombras se calcula una sola vez por modelo.

import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { EffectComposer, EffectPass, RenderPass, SMAAEffect, ToneMappingEffect, ToneMappingMode } from "postprocessing";
import { N8AOPostPass } from "n8ao";
import { labModel } from "@/lib/bricks/lab-model";
import type { Tier } from "../material";
import { buildModel, type BuiltModel } from "./build-model";

export interface TierConfig {
  dpr: number;
  shadowMap: number;
  post: boolean;
  ao: "no" | "reposo" | "siempre";
  aoHalfRes: boolean;
}

export const TIERS: Record<Tier, TierConfig> = {
  bajo: { dpr: 1, shadowMap: 1024, post: false, ao: "no", aoHalfRes: true },
  medio: { dpr: 1.5, shadowMap: 2048, post: true, ao: "reposo", aoHalfRes: true },
  alto: { dpr: 2, shadowMap: 2048, post: true, ao: "reposo", aoHalfRes: false },
  ultra: { dpr: 3, shadowMap: 4096, post: true, ao: "siempre", aoHalfRes: false },
};

export interface LabStats {
  /** Marcas de tiempo de los cuadros de los últimos 2 s. */
  frames: number[];
  calls: number;
  triangles: number;
  firstFrame: number | null;
  buildMs: number;
  studs: number;
  gpu: string;
  dpr: number;
}

function gradientBackground(): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = c.height = 512;
  const g = c.getContext("2d")!;
  const grad = g.createRadialGradient(256, 220, 20, 256, 256, 380);
  grad.addColorStop(0, "#2A3B46");
  grad.addColorStop(1, "#16222A");
  g.fillStyle = grad;
  g.fillRect(0, 0, 512, 512);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export class LabEngine {
  readonly stats: LabStats = { frames: [], calls: 0, triangles: 0, firstFrame: null, buildMs: 0, studs: 0, gpu: "", dpr: 1 };
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera = new THREE.PerspectiveCamera(35, 1, 0.5, 2000);
  private controls: OrbitControls;
  private key = new THREE.DirectionalLight(0xffffff, 2.2);
  private rim = new THREE.DirectionalLight("#3BC8F3", 0.45);
  private composer: EffectComposer | null = null;
  private ao: N8AOPostPass | null = null;
  private built: BuiltModel | null = null;
  private disposables: { dispose(): void }[] = [];
  private raf = 0;
  private orbit = false;
  private moving = false;
  private settle: ReturnType<typeof setTimeout> | undefined;

  constructor(
    private canvas: HTMLCanvasElement,
    private tier: Tier,
  ) {
    const cfg = TIERS[tier];
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: !cfg.post, powerPreference: "high-performance", stencil: false });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, cfg.dpr));
    this.renderer.info.autoReset = false;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    this.renderer.shadowMap.autoUpdate = false;
    this.renderer.toneMapping = cfg.post ? THREE.NoToneMapping : THREE.NeutralToneMapping;

    const gl = this.renderer.getContext();
    const ext = gl.getExtension("WEBGL_debug_renderer_info");
    this.stats.gpu = ext ? String(gl.getParameter(ext.UNMASKED_RENDERER_WEBGL)) : "desconocida";
    this.stats.dpr = this.renderer.getPixelRatio();

    // Entorno de estudio procedural (pesa 0 KB) y fondo en degradado de valor medio: ni negro ni
    // blanco, para que no desaparezcan Noche ni Blanco Nube.
    const pmrem = new THREE.PMREMGenerator(this.renderer);
    const env = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    pmrem.dispose();
    const bg = gradientBackground();
    this.scene.environment = env;
    this.scene.environmentIntensity = 0.9;
    this.scene.background = bg;
    this.disposables.push(env, bg);

    this.key.castShadow = true;
    this.key.shadow.mapSize.set(cfg.shadowMap, cfg.shadowMap);
    this.key.shadow.bias = -0.0004;
    this.key.shadow.normalBias = 0.03;
    this.key.shadow.radius = 3;
    this.scene.add(this.key, this.key.target, this.rim);

    this.controls = new OrbitControls(this.camera, canvas);
    this.controls.enableDamping = true;
    this.controls.minPolarAngle = 0.17;
    this.controls.maxPolarAngle = 1.45;
    this.controls.minDistance = 6;
    this.controls.autoRotateSpeed = 1.4;
    this.controls.addEventListener("change", this.request);
    this.controls.addEventListener("start", () => {
      clearTimeout(this.settle);
      this.moving = true;
    });
    this.controls.addEventListener("end", () => {
      this.settle = setTimeout(() => {
        this.moving = false;
        this.request();
      }, 250);
    });

    // Postproceso: oclusión ambiental (N8AO), SMAA y tone mapping Neutral, que no deforma los
    // azules de marca como ACES o AgX.
    if (cfg.post) {
      this.composer = new EffectComposer(this.renderer, { frameBufferType: THREE.HalfFloatType });
      this.composer.addPass(new RenderPass(this.scene, this.camera));
      if (cfg.ao !== "no") {
        this.ao = new N8AOPostPass(this.scene, this.camera, 1, 1);
        this.ao.configuration.aoRadius = 1.2;
        this.ao.configuration.distanceFalloff = 0.4;
        this.ao.configuration.intensity = 2.5;
        this.ao.configuration.halfRes = cfg.aoHalfRes;
        this.ao.setQualityMode(tier === "medio" ? "Performance" : "High");
        this.composer.addPass(this.ao);
      }
      this.composer.addPass(new EffectPass(this.camera, new SMAAEffect(), new ToneMappingEffect({ mode: ToneMappingMode.NEUTRAL })));
    }
  }

  setModel(count: number, reframe: boolean) {
    const model = labModel(count);
    const t0 = performance.now();
    const next = buildModel(model, this.tier);
    this.stats.buildMs = performance.now() - t0;
    this.stats.studs = next.studs;
    if (this.built) {
      this.scene.remove(this.built.group);
      this.built.dispose();
    }
    this.built = next;
    this.scene.add(next.group);

    const span = model.base;
    const c = span / 2;
    const half = span * 0.75;
    this.key.position.set(c + span * 0.45, span * 0.9, c + span * 0.3);
    this.key.target.position.set(c, 0, c);
    Object.assign(this.key.shadow.camera, { left: -half, right: half, top: half, bottom: -half, near: 1, far: span * 3 });
    this.key.shadow.camera.updateProjectionMatrix();
    this.rim.position.set(c - span * 0.6, span * 0.4, c - span * 0.7);
    this.renderer.shadowMap.needsUpdate = true;

    this.controls.maxDistance = span * 2.2;
    this.controls.target.set(c, 2, c);
    if (reframe) {
      // Distancia para que la ciudad quepa a lo ancho: en un celular vertical el campo
      // horizontal es mucho más angosto que el vertical.
      const vHalf = THREE.MathUtils.degToRad(this.camera.fov / 2);
      const hHalf = Math.atan(Math.tan(vHalf) * this.camera.aspect);
      const dist = (span * 0.62) / Math.tan(Math.min(vHalf, hHalf));
      const dir = new THREE.Vector3(0.6, 0.55, 0.72).normalize();
      this.camera.position.set(c, 2, c).addScaledVector(dir, dist);
    }
    this.controls.update();
    this.request();
  }

  setOrbit(on: boolean) {
    this.orbit = on;
    this.controls.autoRotate = on;
    this.request();
  }

  resize(width: number, height: number) {
    this.renderer.setSize(width, height, false);
    this.composer?.setSize(width, height, false);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.request();
  }

  dispose() {
    cancelAnimationFrame(this.raf);
    clearTimeout(this.settle);
    this.controls.dispose();
    this.built?.dispose();
    this.composer?.dispose();
    this.disposables.forEach((d) => d.dispose());
    this.renderer.dispose();
  }

  private request = () => {
    if (!this.raf) this.raf = requestAnimationFrame(this.frame);
  };

  private frame = () => {
    this.raf = 0;
    // Con amortiguación, la cámara sigue moviéndose un rato después de soltar el dedo.
    const changed = this.controls.update();
    // El cuadro que recalcula las sombras dibuja la escena dos veces: no cuenta para las cifras.
    const shadowFrame = this.renderer.shadowMap.needsUpdate;
    this.renderer.info.reset();
    if (this.composer) {
      if (this.ao) this.ao.enabled = TIERS[this.tier].ao === "siempre" || !(this.moving || this.orbit);
      this.composer.render();
    } else {
      this.renderer.render(this.scene, this.camera);
    }
    const s = this.stats;
    if (!shadowFrame) {
      s.calls = this.renderer.info.render.calls;
      s.triangles = this.renderer.info.render.triangles;
    }
    const now = performance.now();
    if (s.firstFrame === null) s.firstFrame = now;
    s.frames.push(now);
    while (s.frames.length && now - s.frames[0] > 2000) s.frames.shift();
    if (this.orbit || changed || shadowFrame) this.request();
  };
}
