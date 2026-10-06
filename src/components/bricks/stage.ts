// El escenario 3D compartido por el banco de pruebas y el constructor: render, luz de estudio,
// cámara orbital, postproceso y dibujo por demanda. En three puro y fuera de React (el lint del
// React Compiler no deja mutar objetos de three desde hooks).
//
// Por demanda: un constructor pasa casi todo el tiempo quieto, así que solo se dibuja cuando la
// cámara se mueve, cambia el modelo o hay una animación. La luz no se mueve, así que el mapa de
// sombras solo se recalcula cuando cambian las piezas (`invalidateShadows`).

import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { EffectComposer, EffectPass, RenderPass, SMAAEffect, ToneMappingEffect, ToneMappingMode } from "postprocessing";
import { N8AOPostPass } from "n8ao";
import type { Tier } from "./material";

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

export interface FrameStats {
  /** Marcas de tiempo de los cuadros de los últimos 2 s. */
  frames: number[];
  calls: number;
  triangles: number;
  firstFrame: number | null;
  gpu: string;
  dpr: number;
}

/** Algo que se anima: devuelve true mientras necesite más cuadros. */
export type FrameHook = (now: number) => boolean;

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

export class Stage {
  readonly stats: FrameStats = { frames: [], calls: 0, triangles: 0, firstFrame: null, gpu: "", dpr: 1 };
  readonly renderer: THREE.WebGLRenderer;
  readonly scene = new THREE.Scene();
  readonly camera = new THREE.PerspectiveCamera(35, 1, 0.5, 2000);
  readonly controls: OrbitControls;
  readonly tier: Tier;
  /** La cámara se está moviendo por el usuario (la oclusión ambiental se apaga mientras tanto). */
  moving = false;
  private key = new THREE.DirectionalLight(0xffffff, 2.2);
  private rim = new THREE.DirectionalLight("#3BC8F3", 0.45);
  private composer: EffectComposer | null = null;
  private ao: N8AOPostPass | null = null;
  private hooks = new Set<FrameHook>();
  private disposables: { dispose(): void }[] = [];
  private raf = 0;
  private settle: ReturnType<typeof setTimeout> | undefined;

  constructor(canvas: HTMLCanvasElement, tier: Tier) {
    this.tier = tier;
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
    this.controls.enableDamping = !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    this.controls.minPolarAngle = 0.17;
    this.controls.maxPolarAngle = 1.45;
    this.controls.minDistance = 4;
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

  /** Ajusta luz, sombras y límites de la cámara a una zona de `span` studs centrada en `center`. */
  setBounds(center: THREE.Vector3, span: number) {
    const half = span * 0.75;
    this.key.position.set(center.x + span * 0.45, span * 0.9 + 4, center.z + span * 0.3);
    this.key.target.position.set(center.x, 0, center.z);
    Object.assign(this.key.shadow.camera, { left: -half, right: half, top: half, bottom: -half, near: 0.5, far: span * 3 + 10 });
    this.key.shadow.camera.updateProjectionMatrix();
    this.rim.position.set(center.x - span * 0.6, span * 0.4 + 2, center.z - span * 0.7);
    this.controls.maxDistance = span * 2.2 + 10;
    this.controls.target.copy(center);
    this.invalidateShadows();
  }

  /** Encuadra una zona de `span` studs: en un celular vertical el campo horizontal es el angosto. */
  frame(center: THREE.Vector3, span: number) {
    const vHalf = THREE.MathUtils.degToRad(this.camera.fov / 2);
    const hHalf = Math.atan(Math.tan(vHalf) * this.camera.aspect);
    const dist = (span * 0.62) / Math.tan(Math.min(vHalf, hHalf));
    const dir = this.camera.position.clone().sub(this.controls.target);
    if (dir.lengthSq() < 1e-6) dir.set(0.6, 0.55, 0.72);
    this.controls.target.copy(center);
    this.camera.position.copy(center).addScaledVector(dir.normalize(), dist);
    this.controls.update();
    this.request();
  }

  setAutoRotate(on: boolean) {
    this.controls.autoRotate = on;
    this.request();
  }

  invalidateShadows() {
    this.renderer.shadowMap.needsUpdate = true;
    this.request();
  }

  addHook(hook: FrameHook) {
    this.hooks.add(hook);
    this.request();
  }

  resize(width: number, height: number) {
    this.renderer.setSize(width, height, false);
    this.composer?.setSize(width, height, false);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.request();
  }

  /** Coordenadas normalizadas (-1 a 1) de un punto de la pantalla, para lanzar rayos. */
  ndc(clientX: number, clientY: number): THREE.Vector2 {
    const r = this.renderer.domElement.getBoundingClientRect();
    return new THREE.Vector2(((clientX - r.left) / r.width) * 2 - 1, -((clientY - r.top) / r.height) * 2 + 1);
  }

  /** Punto de la pantalla (px relativos al canvas) de un punto del mundo. */
  toScreen(p: THREE.Vector3): { x: number; y: number } {
    const v = p.clone().project(this.camera);
    const r = this.renderer.domElement.getBoundingClientRect();
    return { x: ((v.x + 1) / 2) * r.width, y: ((1 - v.y) / 2) * r.height };
  }

  /**
   * Imagen PNG del cuadro actual. Se dibuja y se lee en el mismo instante, así no hace falta
   * `preserveDrawingBuffer`, que cuesta rendimiento todo el tiempo (investigación, 7.7).
   */
  capture(hide: THREE.Object3D[] = []): string {
    const prev = hide.map((o) => o.visible);
    hide.forEach((o) => (o.visible = false));
    if (this.ao) this.ao.enabled = true;
    if (this.composer) this.composer.render();
    else this.renderer.render(this.scene, this.camera);
    const url = this.renderer.domElement.toDataURL("image/png");
    hide.forEach((o, i) => (o.visible = prev[i]));
    this.request();
    return url;
  }

  dispose() {
    cancelAnimationFrame(this.raf);
    clearTimeout(this.settle);
    this.controls.dispose();
    this.composer?.dispose();
    this.disposables.forEach((d) => d.dispose());
    this.renderer.dispose();
  }

  request = () => {
    if (!this.raf) this.raf = requestAnimationFrame(this.render);
  };

  private render = () => {
    this.raf = 0;
    const now = performance.now();
    // Con amortiguación, la cámara sigue moviéndose un rato después de soltar el dedo.
    let again = this.controls.update() || this.controls.autoRotate;
    for (const hook of this.hooks)
      if (hook(now)) again = true;
      else this.hooks.delete(hook);
    // El cuadro que recalcula las sombras dibuja la escena dos veces: no cuenta para las cifras.
    const shadowFrame = this.renderer.shadowMap.needsUpdate;
    this.renderer.info.reset();
    if (this.composer) {
      if (this.ao) this.ao.enabled = TIERS[this.tier].ao === "siempre" || !(this.moving || this.controls.autoRotate);
      this.composer.render();
    } else {
      this.renderer.render(this.scene, this.camera);
    }
    const s = this.stats;
    if (!shadowFrame) {
      s.calls = this.renderer.info.render.calls;
      s.triangles = this.renderer.info.render.triangles;
    }
    if (s.firstFrame === null) s.firstFrame = now;
    s.frames.push(now);
    while (s.frames.length && now - s.frames[0] > 2000) s.frames.shift();
    if (again || shadowFrame) this.request();
  };
}
