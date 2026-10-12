// La "ciudad" del proyector: todas las bases de los equipos en un mismo escenario 3D, cada una con
// un marco de su color. Un solo contexto WebGL para todas (abrir uno por equipo agota el
// navegador). Fuera de React, como el constructor: la pantalla solo llama métodos.

import * as THREE from "three";
import { apply, type Op } from "@/lib/bricks/ops";
import { PLATE_H } from "@/lib/bricks/units";
import { BrickWorld, type Brick } from "@/lib/bricks/world";
import type { Tier } from "../material";
import { Stage } from "../stage";
import { WorldView } from "../builder/view";

const GAP = 6;

interface Plot {
  world: BrickWorld;
  view: WorldView;
  frame: THREE.Mesh;
  origin: THREE.Vector3;
}

export class CityView {
  readonly stage: Stage;
  private plots = new Map<number, Plot>();
  private base: number;
  private focused: number | null = null;
  /** Girar despacio solo cuando hay algo que mirar (en el lobby el panel tapa la escena). */
  private spin = false;

  constructor(canvas: HTMLCanvasElement, tier: Tier, base: number) {
    this.stage = new Stage(canvas, tier);
    this.base = base;
  }

  /** Pone o reemplaza la obra completa de un equipo (al entrar o tras un desfase). */
  setTeam(teamId: number, color: string, bricks: Brick[]) {
    let plot = this.plots.get(teamId);
    if (!plot) {
      const world = new BrickWorld(this.base);
      const view = new WorldView(this.stage, world);
      // Marco del color del equipo bajo la base: se reconoce de lejos cuál es cuál.
      const frame = new THREE.Mesh(
        new THREE.BoxGeometry(this.base + 0.8, 0.3, this.base + 0.8),
        new THREE.MeshStandardMaterial({ color, roughness: 0.6 }),
      );
      frame.receiveShadow = true;
      plot = { world, view, frame, origin: new THREE.Vector3() };
      this.plots.set(teamId, plot);
      this.stage.scene.add(view.group, frame);
      this.layout();
    }
    for (const id of [...plot.world.bricks.keys()]) plot.world.remove(id);
    for (const b of bricks) if (!plot.world.collides(b)) plot.world.add(b);
    plot.view.sync(plot.world.floating());
    this.stage.invalidateShadows();
  }

  /** Aplica un lote ya ordenado; false si no cuadra y hay que pedir la foto. */
  applyOps(teamId: number, ops: Op[]): boolean {
    const plot = this.plots.get(teamId);
    if (!plot) return false;
    for (const op of ops) if (!apply(plot.world, op)) return false;
    plot.view.sync(plot.world.floating());
    for (const op of ops) if (op.t === "add") plot.view.animateDrop(op.brick.id);
    this.stage.invalidateShadows();
    return true;
  }

  bricksOf(teamId: number): Brick[] {
    return [...(this.plots.get(teamId)?.world.bricks.values() ?? [])];
  }

  /** Reparte las bases en una cuadrícula casi cuadrada, en el orden en que se crearon. */
  private layout() {
    const ids = [...this.plots.keys()];
    const cols = Math.ceil(Math.sqrt(ids.length));
    const step = this.base + GAP;
    ids.forEach((id, n) => {
      const plot = this.plots.get(id)!;
      plot.origin.set((n % cols) * step, 0, Math.floor(n / cols) * step);
      plot.view.group.position.copy(plot.origin);
      plot.frame.position.set(plot.origin.x + this.base / 2, -0.62, plot.origin.z + this.base / 2);
    });
    const rows = Math.ceil(ids.length / cols);
    const span = Math.max(cols, rows) * step;
    const center = new THREE.Vector3(((cols - 1) * step + this.base) / 2, 1, ((rows - 1) * step + this.base) / 2);
    this.stage.setBounds(center, span);
    if (this.focused === null) this.showAll();
  }

  /** Vista de todas las obras, de tres cuartos, girando despacio. */
  showAll() {
    this.focused = null;
    const ids = [...this.plots.keys()];
    if (ids.length === 0) return;
    const cols = Math.ceil(Math.sqrt(ids.length));
    const rows = Math.ceil(ids.length / cols);
    const step = this.base + GAP;
    const center = new THREE.Vector3(((cols - 1) * step + this.base) / 2, 1, ((rows - 1) * step + this.base) / 2);
    this.stage.controls.target.copy(center);
    this.stage.camera.position.copy(center).add(new THREE.Vector3(0.7, 0.75, 0.9));
    this.stage.frame(center, Math.max(cols, rows) * step * 0.9);
    this.stage.setAutoRotate(this.spin);
    this.stage.controls.autoRotateSpeed = 0.5;
  }

  setSpin(on: boolean) {
    this.spin = on;
    if (this.focused === null) this.stage.setAutoRotate(on);
  }

  /** Recorrido: la cámara se acerca a un equipo y gira a su alrededor. */
  focus(teamId: number) {
    const plot = this.plots.get(teamId);
    if (!plot) return;
    this.focused = teamId;
    let top = 1;
    for (const b of plot.world.bricks.values()) top = Math.max(top, b.y);
    const center = plot.origin.clone().add(new THREE.Vector3(this.base / 2, Math.min((top * PLATE_H) / 2, 8), this.base / 2));
    this.stage.camera.position.copy(center).add(new THREE.Vector3(0.6, 0.5, 0.8));
    this.stage.frame(center, this.base + 2);
    this.stage.setAutoRotate(true);
    this.stage.controls.autoRotateSpeed = 1.6;
  }

  /**
   * Foto de la obra de un equipo, sola y sin el marco de color: en la galería las obras van sin
   * nombre. Misma escena, otra cámara por un instante; después todo vuelve a donde estaba.
   */
  photo(teamId: number): string | null {
    const plot = this.plots.get(teamId);
    if (!plot || plot.world.bricks.size === 0) return null;
    const cam = this.stage.camera.position.clone();
    const target = this.stage.controls.target.clone();
    let top = 1;
    for (const b of plot.world.bricks.values()) top = Math.max(top, b.y);
    const center = plot.origin.clone().add(new THREE.Vector3(this.base / 2, (top * PLATE_H) / 3, this.base / 2));
    this.stage.controls.target.copy(center);
    this.stage.camera.position.copy(center).add(new THREE.Vector3(0.6, 0.55, 0.8));
    this.stage.frame(center, Math.max(this.base, top * PLATE_H) + 1);
    this.stage.invalidateShadows();
    const hide: THREE.Object3D[] = [];
    for (const [id, p] of this.plots) {
      hide.push(p.frame);
      if (id !== teamId) hide.push(p.view.group);
    }
    const url = this.stage.capture(hide);
    this.stage.camera.position.copy(cam);
    this.stage.controls.target.copy(target);
    this.stage.controls.update();
    this.stage.invalidateShadows();
    return url;
  }

  resize(width: number, height: number) {
    this.stage.resize(width, height);
  }

  dispose() {
    for (const plot of this.plots.values()) {
      plot.view.dispose();
      plot.frame.geometry.dispose();
      (plot.frame.material as THREE.Material).dispose();
    }
    this.plots.clear();
    this.stage.dispose();
  }
}
