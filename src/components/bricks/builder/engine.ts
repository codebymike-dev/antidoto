// Controlador del constructor (fase 3 de docs/plan-construccion-3d.md). Une el escenario 3D, el
// mundo, el historial, la vista y el sonido, e interpreta los gestos según la investigación
// (sección 3.4): el dedo que empieza sobre el fantasma mueve la pieza, el que empieza en el vacío
// gira la cámara, y un toque corto nunca coloca por accidente lejos del fantasma.
//
// React solo lee `getSnapshot()` (useSyncExternalStore) y llama métodos: nada de three en hooks.

import * as THREE from "three";
import { History, type Op } from "@/lib/bricks/ops";
import { BRICK_COLORS } from "@/lib/bricks/palette";
import { part } from "@/lib/bricks/parts";
import { proposePlacement, type PlaceProblem, type Proposal } from "@/lib/bricks/place";
import { castRay, type Hit } from "@/lib/bricks/ray";
import { PLATE_H } from "@/lib/bricks/units";
import { BrickWorld, footprint, type Brick, type Rot } from "@/lib/bricks/world";
import type { Tier } from "../material";
import { brickSound, haptic } from "../sound";
import { Stage } from "../stage";
import { renderThumbs } from "./thumbs";
import { Ghost, SelectionOutline, WorldView } from "./view";

export interface Hand {
  part: number;
  color: number;
  rot: Rot;
}

export interface BuilderSnapshot {
  hand: Hand | null;
  /** Se está moviendo una pieza que ya estaba puesta. */
  moving: boolean;
  selection: Brick | null;
  ghost: { ok: boolean; problem?: PlaceProblem } | null;
  canUndo: boolean;
  canRedo: boolean;
  count: number;
  floating: number;
  /** Texto para la región aria-live (lectores de pantalla). */
  announce: string;
  /** Contadores para el primer minuto guiado. */
  placed: number;
  orbits: number;
  undos: number;
  notice: Notice | null;
  /** Miniaturas de la bandeja en el color activo (data URL por pieza). */
  thumbs: Map<number, string>;
  color: number;
}

/** El fantasma va por encima de la yema para que el dedo no lo tape (investigación, 3.2). */
const TOUCH_OFFSET = 56;
/** Por debajo de esto un gesto es un toque; por encima, arrastre (touch slop de Android). */
const SLOP = 9;
const LONG_PRESS = 450;

let seq = 0;
const newId = () => `p${Date.now().toString(36)}${(seq++).toString(36)}`;

function describe(b: { part: number; color: number; x: number; y: number; z: number }) {
  return `${part(b.part).name} ${BRICK_COLORS[b.color].name}, fila ${b.z + 1}, columna ${b.x + 1}, nivel ${Math.floor(b.y / 3) + 1}`;
}

interface Gesture {
  id: number;
  type: string;
  x0: number;
  y0: number;
  dragged: boolean;
  /** Este gesto mueve el fantasma (y no la cámara). */
  ghost: boolean;
  longPress?: ReturnType<typeof setTimeout>;
}

export interface Notice {
  id: number;
  text: string;
  /** Se ofrece "Deshacer" en el aviso (al eliminar, por ejemplo). */
  undo: boolean;
}

export class BuilderEngine {
  readonly world: BrickWorld;
  private mounted: { stage: Stage; view: WorldView; ghost: Ghost; outline: SelectionOutline } | null = null;
  private history: History;
  private notice: Notice | null = null;
  private noticeSeq = 0;
  private trayParts: number[] = [];
  private thumbsCache = new Map<number, Map<number, string>>();
  /** Color activo; arranca en Girasol, que contrasta con la pieza inicial y con la base. */
  private thumbColor = BRICK_COLORS.findIndex((c) => c.name === "Girasol");
  private hand: Hand | null = null;
  private movingId: string | null = null;
  private selectionId: string | null = null;
  private proposal: Proposal | null = null;
  private floating = new Set<string>();
  private snap: BuilderSnapshot;
  private listeners = new Set<() => void>();
  private gesture: Gesture | null = null;
  private trayDrag: { part: number; pointerId: number; type: string } | null = null;
  private lastPointer: { x: number; y: number; type: string } | null = null;
  private counters = { placed: 0, orbits: 0, undos: 0 };
  private announce = "";
  private framed = false;
  private cleanup: (() => void)[] = [];

  /** Existe antes del lienzo: React lo crea una vez y lo lee con useSyncExternalStore. */
  constructor(base: number, initial: Brick[] = []) {
    this.world = new BrickWorld(base);
    for (const b of initial) this.world.add(b);
    this.history = new History(this.world);
    this.floating = this.world.floating();
    this.snap = this.buildSnapshot();
  }

  private get stage(): Stage {
    return this.mounted!.stage;
  }

  private get view(): WorldView {
    return this.mounted!.view;
  }

  private get ghost(): Ghost {
    return this.mounted!.ghost;
  }

  private get outline(): SelectionOutline {
    return this.mounted!.outline;
  }

  /** Conecta el lienzo. Se puede desmontar y volver a montar (modo estricto, cambio de nivel). */
  mount(canvas: HTMLCanvasElement, tier: Tier) {
    if (this.mounted) this.unmount();
    const stage = new Stage(canvas, tier);
    const view = new WorldView(stage, this.world);
    const ghost = new Ghost();
    const outline = new SelectionOutline();
    this.mounted = { stage, view, ghost, outline };
    this.framed = false;
    stage.scene.add(view.group, ghost.group, outline.group);
    view.sync(this.floating);
    const base = this.world.base;
    const center = new THREE.Vector3(base / 2, 1, base / 2);
    // Vista de tres cuartos desde arriba; el encuadre fija la distancia al conocer el tamaño.
    stage.camera.position.set(center.x + 0.6, center.y + 0.62, center.z + 0.72);
    stage.setBounds(center, base);
    stage.controls.addEventListener("start", () => {
      this.counters.orbits++;
      this.emit();
    });
    this.thumbsCache.clear();

    // Los gestos se escuchan en el contenedor, en fase de captura: así deciden antes que la cámara
    // orbital si el dedo mueve la pieza o gira la vista.
    const surface = canvas.parentElement ?? canvas;
    const on = <K extends keyof HTMLElementEventMap>(el: HTMLElement | Window, ev: K, fn: (e: HTMLElementEventMap[K]) => void, capture = false) => {
      el.addEventListener(ev, fn as EventListener, capture);
      this.cleanup.push(() => el.removeEventListener(ev, fn as EventListener, capture));
    };
    on(surface, "pointerdown", this.onDown, true);
    on(surface, "pointermove", this.onMove, true);
    on(surface, "pointerup", this.onUp, true);
    on(surface, "pointercancel", this.onCancel, true);
    on(surface, "pointerleave", () => {
      if (!this.gesture && !this.trayDrag && this.lastPointer?.type === "mouse") this.updateGhost(null);
    });
    on(canvas, "contextmenu", (e) => e.preventDefault());
    on(window, "pointermove", this.onTrayMove);
    on(window, "pointerup", this.onTrayUp);
    this.refreshThumbs();
    this.emit();
  }

  unmount() {
    this.cleanup.forEach((fn) => fn());
    this.cleanup = [];
    clearTimeout(this.gesture?.longPress);
    this.gesture = null;
    this.trayDrag = null;
    this.proposal = null;
    if (!this.mounted) return;
    const { stage, view, ghost, outline } = this.mounted;
    view.dispose();
    ghost.dispose();
    outline.dispose();
    stage.dispose();
    this.mounted = null;
  }

  // ---- Estado para React ----

  subscribe = (fn: () => void) => {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  };

  getSnapshot = () => this.snap;

  private buildSnapshot(): BuilderSnapshot {
    return {
      hand: this.hand,
      moving: this.movingId !== null,
      selection: this.selectionId ? (this.world.bricks.get(this.selectionId) ?? null) : null,
      ghost: this.proposal ? { ok: this.proposal.ok, problem: this.proposal.problem } : null,
      canUndo: this.history.canUndo,
      canRedo: this.history.canRedo,
      count: this.world.bricks.size,
      floating: this.floating.size,
      announce: this.announce,
      ...this.counters,
      notice: this.notice,
      thumbs: this.thumbsCache.get(this.thumbColor) ?? new Map(),
      color: this.thumbColor,
    };
  }

  private emit() {
    this.snap = this.buildSnapshot();
    this.listeners.forEach((fn) => fn());
  }

  // ---- Acciones ----

  /** Toma una pieza de la bandeja. Si no hay dedo encima del lienzo, el fantasma va al centro. */
  setHand(partId: number, color: number) {
    this.setThumbColor(color);
    this.cancelMove();
    this.select(null);
    const rot = this.hand?.rot ?? 0;
    this.hand = { part: partId, color, rot };
    brickSound().play("pick");
    this.refreshGhostAtCenterIfNeeded();
    this.emit();
  }

  clearHand() {
    this.cancelMove();
    this.hand = null;
    this.updateGhost(null);
    this.emit();
  }

  /** Cambia el color de la pieza en mano o pinta la seleccionada. */
  setColor(color: number) {
    this.setThumbColor(color);
    if (this.selectionId && !this.hand) {
      const b = this.world.bricks.get(this.selectionId);
      if (b && b.color !== color) this.run({ t: "paint", id: b.id, from: b.color, to: color }, `Pieza pintada de ${BRICK_COLORS[color].name}`);
      return;
    }
    if (this.hand) {
      this.hand = { ...this.hand, color };
      this.redrawGhost();
    }
    this.emit();
  }

  /** Piezas que muestra la bandeja: sus miniaturas se dibujan en el color activo. */
  setTrayParts(ids: number[]) {
    this.trayParts = ids;
    this.thumbsCache.clear();
    this.refreshThumbs();
    this.emit();
  }

  private setThumbColor(color: number) {
    if (color === this.thumbColor) return;
    this.thumbColor = color;
    this.refreshThumbs();
  }

  private refreshThumbs() {
    if (!this.mounted || !this.trayParts.length || this.thumbsCache.has(this.thumbColor)) return;
    this.thumbsCache.set(this.thumbColor, renderThumbs(this.stage.renderer, this.stage.scene.environment, this.trayParts, this.thumbColor, 112));
    this.stage.request();
  }

  rotate(dir: 1 | -1 = 1) {
    if (this.hand) {
      this.hand = { ...this.hand, rot: (((this.hand.rot + dir) % 4) + 4) % 4 as Rot };
      brickSound().play("rotate");
      this.refreshGhostAtLast();
      this.emit();
      return;
    }
    const b = this.selectionId ? this.world.bricks.get(this.selectionId) : undefined;
    if (!b) return;
    const turned = { ...b, rot: (((b.rot + dir) % 4) + 4) % 4 as Rot };
    if (this.history.do({ t: "batch", ops: [{ t: "remove", brick: b }, { t: "add", brick: turned }] })) {
      brickSound().play("rotate");
      this.afterChange("Pieza girada");
    } else {
      brickSound().play("invalid");
      this.say("No cabe girada ahí");
    }
  }

  /** Coloca la pieza en mano donde está el fantasma. */
  place(): boolean {
    const pr = this.proposal;
    const h = this.hand;
    if (!pr || !h) return false;
    if (!pr.ok) {
      brickSound().play("invalid");
      this.say(pr.problem === "ocupado" ? "Ahí ya hay una pieza" : "Ahí no encaja: necesita apoyarse en algo");
      return false;
    }
    const prev = this.movingId ? this.world.bricks.get(this.movingId) : undefined;
    const brick: Brick = { id: prev?.id ?? newId(), part: h.part, color: h.color, x: pr.x, y: pr.y, z: pr.z, rot: h.rot };
    const op: Op = prev ? { t: "batch", ops: [{ t: "remove", brick: prev }, { t: "add", brick }] } : { t: "add", brick };
    if (!this.history.do(op)) {
      brickSound().play("invalid");
      return false;
    }
    if (prev) {
      this.movingId = null;
      this.view.setHidden([]);
      this.hand = null;
      this.updateGhost(null);
    }
    this.counters.placed++;
    if (!this.mounted) return true;
    const { w, d } = footprint(part(h.part), h.rot);
    brickSound().play("place", brick.y, w * d);
    haptic(10);
    this.afterChange(`Pieza ${prev ? "movida" : "colocada"}: ${describe(brick)}`);
    this.view.animateDrop(brick.id);
    // El fantasma se recalcula: la pieza recién puesta ocupa su lugar.
    this.refreshGhostAtLast();
    return true;
  }

  deleteSelection() {
    const b = this.selectionId ? this.world.bricks.get(this.selectionId) : undefined;
    if (!b) return;
    this.select(null);
    this.run({ t: "remove", brick: b }, `Pieza eliminada: ${part(b.part).name}`, true);
    brickSound().play("remove");
  }

  duplicateSelection() {
    const b = this.selectionId ? this.world.bricks.get(this.selectionId) : undefined;
    if (!b) return;
    this.select(null);
    this.hand = { part: b.part, color: b.color, rot: b.rot };
    brickSound().play("pick");
    this.refreshGhostAtCenterIfNeeded();
    this.emit();
  }

  /** Levanta la pieza seleccionada para moverla. Sigue en el mundo hasta soltarla. */
  moveSelection() {
    const b = this.selectionId ? this.world.bricks.get(this.selectionId) : undefined;
    if (!b) return;
    this.select(null);
    this.movingId = b.id;
    this.hand = { part: b.part, color: b.color, rot: b.rot };
    this.view.setHidden([b.id]);
    brickSound().play("pick");
    haptic(15);
    this.refreshGhostAtLast();
    this.emit();
  }

  /** Esc o la x: suelta lo que haya en mano y deselecciona. */
  cancel() {
    if (this.hand) this.clearHand();
    else this.select(null);
  }

  private cancelMove() {
    if (!this.movingId) return;
    this.movingId = null;
    this.view.setHidden([]);
  }

  undo() {
    if (this.history.undo()) {
      this.counters.undos++;
      brickSound().play("undo");
      this.select(null);
      this.afterChange("Deshecho", false, true);
    } else if (this.history.canUndo === false) {
      this.emit();
    } else {
      brickSound().play("invalid");
      this.say("Eso ya no se puede deshacer");
    }
  }

  redo() {
    if (this.history.redo()) {
      brickSound().play("place");
      this.afterChange("Rehecho");
    }
  }

  frameAll() {
    if (!this.mounted) return;
    let minX = Infinity, minZ = Infinity, maxX = -Infinity, maxZ = -Infinity, maxY = 0;
    for (const b of this.world.bricks.values()) {
      const p = part(b.part);
      const { w, d } = footprint(p, b.rot);
      minX = Math.min(minX, b.x);
      minZ = Math.min(minZ, b.z);
      maxX = Math.max(maxX, b.x + w);
      maxZ = Math.max(maxZ, b.z + d);
      maxY = Math.max(maxY, (b.y + p.h) * PLATE_H);
    }
    const base = this.world.base;
    if (!isFinite(minX)) {
      minX = minZ = 0;
      maxX = maxZ = base;
    }
    const span = Math.max(maxX - minX, maxZ - minZ, maxY, 6) + 2;
    this.stage.frame(new THREE.Vector3((minX + maxX) / 2, maxY / 3, (minZ + maxZ) / 2), span);
  }

  /** Foto de la obra sin el fantasma ni la selección. */
  photo(): string | null {
    if (!this.mounted) return null;
    return this.stage.capture([this.ghost.group, this.outline.group]);
  }

  private run(op: Op, message: string, undo = false) {
    if (this.history.do(op)) this.afterChange(message, undo);
  }

  private afterChange(message: string, undo = false, visible = false) {
    const before = this.floating.size;
    this.floating = this.world.floating();
    if (this.mounted) this.view.sync(this.floating);
    if (this.selectionId && !this.world.bricks.has(this.selectionId)) this.select(null);
    const grew = this.floating.size > before;
    const loose = grew ? ` · ${this.floating.size} ${this.floating.size === 1 ? "pieza quedó suelta" : "piezas quedaron sueltas"}` : "";
    this.say(message + loose, { undo, visible: visible || undo || grew });
  }

  /**
   * Todo se anuncia al lector de pantalla; el aviso visual solo cuando importa (algo que no
   * cabe, piezas sueltas, eliminar con "Deshacer"), para no tapar la obra en cada pieza.
   */
  private say(text: string, opts: { undo?: boolean; visible?: boolean } = {}) {
    this.announce = text;
    if (opts.visible ?? true) this.notice = { id: ++this.noticeSeq, text, undo: opts.undo ?? false };
    this.emit();
  }

  private select(id: string | null) {
    this.selectionId = id;
    const b = id ? this.world.bricks.get(id) : undefined;
    if (this.mounted) {
      if (b) this.outline.show(b);
      else this.outline.hide();
      this.stage.request();
    }
    this.emit();
  }

  // ---- Fantasma ----

  private rayFrom(clientX: number, clientY: number): Hit | null {
    if (!this.mounted) return null;
    const ray = new THREE.Raycaster();
    ray.setFromCamera(this.stage.ndc(clientX, clientY), this.stage.camera);
    const o = ray.ray.origin;
    const d = ray.ray.direction;
    return castRay(this.world, [o.x, o.y, o.z], [d.x, d.y, d.z]);
  }

  private anchor(): [number, number] {
    if (!this.hand) return [0, 0];
    const { w, d } = footprint(part(this.hand.part), this.hand.rot);
    return [Math.floor((w - 1) / 2), Math.floor((d - 1) / 2)];
  }

  /** Recalcula el fantasma para un punto de la pantalla (o lo esconde con null). */
  private updateGhost(pt: { x: number; y: number } | null) {
    if (!this.mounted) return;
    const prevOk = this.proposal?.ok;
    const hadGhost = this.proposal !== null;
    if (!pt || !this.hand) {
      this.proposal = null;
      this.ghost.hide();
    } else {
      const hit = this.rayFrom(pt.x, pt.y);
      this.proposal = hit ? proposePlacement(this.world, hit, this.hand.part, this.hand.rot, this.anchor(), this.movingId ?? undefined) : null;
      this.redrawGhost();
    }
    this.stage.request();
    if (hadGhost !== (this.proposal !== null) || prevOk !== this.proposal?.ok) this.emit();
  }

  private redrawGhost() {
    if (!this.mounted) return;
    if (this.proposal && this.hand) this.ghost.show(this.proposal, this.hand.color, this.proposal.ok);
    else this.ghost.hide();
    this.stage.request();
  }

  private refreshGhostAtLast() {
    if (!this.hand) return this.updateGhost(null);
    if (this.lastPointer && this.lastPointer.type === "mouse") return this.updateGhost(this.lastPointer);
    // En táctil el fantasma se queda en su celda: se recalcula desde arriba de esa columna.
    if (this.proposal) return this.updateGhostAtColumn(this.proposal.x + this.anchor()[0], this.proposal.z + this.anchor()[1]);
    this.refreshGhostAtCenterIfNeeded();
  }

  private refreshGhostAtCenterIfNeeded() {
    if (!this.mounted) return;
    const r = this.stage.renderer.domElement.getBoundingClientRect();
    if (this.lastPointer?.type === "mouse" && this.proposal) return this.updateGhost(this.lastPointer);
    this.updateGhost({ x: r.left + r.width / 2, y: r.top + r.height / 2 });
  }

  /** Para el teclado: el fantasma sobre una columna (x, z), apilado donde corresponda. */
  private updateGhostAtColumn(x: number, z: number) {
    if (!this.hand || !this.mounted) return;
    const hit = castRay(this.world, [x + 0.5, 400, z + 0.5], [0, -1, 0]) ?? { cell: [x, -1, z] as [number, number, number], normal: [0, 1, 0] as [number, number, number], t: 0 };
    this.proposal = proposePlacement(this.world, hit, this.hand.part, this.hand.rot, this.anchor(), this.movingId ?? undefined);
    this.redrawGhost();
    this.emit();
  }

  private nearGhost(x: number, y: number): boolean {
    if (!this.mounted || !this.ghost.visible) return false;
    const r = this.stage.renderer.domElement.getBoundingClientRect();
    const s = this.stage.toScreen(this.ghost.topCenter());
    return Math.hypot(x - r.left - s.x, y - r.top - s.y) < 56;
  }

  /** Dónde poner el fantasma ante un punto del dedo: desplazado hacia arriba en táctil. */
  private aim(e: PointerEvent): { x: number; y: number } {
    return e.pointerType === "mouse" ? { x: e.clientX, y: e.clientY } : { x: e.clientX, y: e.clientY - TOUCH_OFFSET };
  }

  // ---- Gestos sobre el lienzo ----

  private onDown = (e: PointerEvent) => {
    brickSound().unlock();
    if (this.gesture || this.trayDrag) return;
    if (e.pointerType === "mouse" && e.button !== 0) return;
    const g: Gesture = { id: e.pointerId, type: e.pointerType, x0: e.clientX, y0: e.clientY, dragged: false, ghost: false };
    this.lastPointer = { x: e.clientX, y: e.clientY, type: e.pointerType };
    if (this.hand && e.pointerType !== "mouse" && this.nearGhost(e.clientX, e.clientY)) {
      // Dedo sobre el fantasma: arrastra la pieza, la cámara no se mueve.
      g.ghost = true;
      this.stage.controls.enabled = false;
    } else if (!this.hand && e.pointerType !== "mouse") {
      // Mantener sobre una pieza la levanta para moverla.
      const hit = this.rayFrom(e.clientX, e.clientY);
      if (hit?.brickId) {
        const id = hit.brickId;
        g.longPress = setTimeout(() => {
          if (!this.gesture || this.gesture.dragged) return;
          this.selectionId = id;
          this.moveSelection();
          this.gesture.ghost = true;
          this.stage.controls.enabled = false;
        }, LONG_PRESS);
      }
    }
    this.gesture = g;
  };

  private onMove = (e: PointerEvent) => {
    this.lastPointer = { x: e.clientX, y: e.clientY, type: e.pointerType };
    const g = this.gesture;
    if (g && g.id === e.pointerId) {
      if (!g.dragged && Math.hypot(e.clientX - g.x0, e.clientY - g.y0) > SLOP) {
        g.dragged = true;
        clearTimeout(g.longPress);
      }
      if (g.ghost) this.updateGhost(this.aim(e));
      return;
    }
    // Ratón sin botones: el fantasma sigue al cursor.
    if (!g && !this.trayDrag && e.pointerType === "mouse" && this.hand) this.updateGhost({ x: e.clientX, y: e.clientY });
  };

  private onUp = (e: PointerEvent) => {
    const g = this.gesture;
    if (!g || g.id !== e.pointerId) return;
    clearTimeout(g.longPress);
    this.gesture = null;
    this.stage.controls.enabled = true;
    if (g.ghost) {
      // Soltar el fantasma arrastrado coloca, si cabe.
      if (g.dragged || this.movingId) this.place();
      return;
    }
    if (g.dragged) return; // fue un giro de cámara
    if (this.hand) {
      if (e.pointerType === "mouse") this.place();
      else if (this.nearGhost(e.clientX, e.clientY)) this.place();
      else this.updateGhost({ x: e.clientX, y: e.clientY });
      return;
    }
    const hit = this.rayFrom(e.clientX, e.clientY);
    if (hit?.brickId && hit.brickId !== this.selectionId) brickSound().play("pick");
    this.select(hit?.brickId ?? null);
  };

  private onCancel = (e: PointerEvent) => {
    if (this.gesture?.id !== e.pointerId) return;
    clearTimeout(this.gesture.longPress);
    this.gesture = null;
    this.stage.controls.enabled = true;
  };

  // ---- Arrastrar desde la bandeja ----

  /** La bandeja (HTML) empieza un arrastre: la pieza va a la mano y el fantasma sigue al dedo. */
  beginTrayDrag(partId: number, color: number, e: PointerEvent) {
    brickSound().unlock();
    this.setHand(partId, color);
    this.trayDrag = { part: partId, pointerId: e.pointerId, type: e.pointerType };
  }

  private overCanvas(x: number, y: number) {
    if (!this.mounted) return false;
    const r = this.stage.renderer.domElement.getBoundingClientRect();
    return x >= r.left && x <= r.right && y >= r.top && y <= r.bottom;
  }

  private onTrayMove = (e: PointerEvent) => {
    const t = this.trayDrag;
    if (!t || t.pointerId !== e.pointerId) return;
    const pt = this.aim(e);
    this.updateGhost(this.overCanvas(e.clientX, e.clientY) && !this.overTray(e) ? pt : null);
  };

  private onTrayUp = (e: PointerEvent) => {
    const t = this.trayDrag;
    if (!t || t.pointerId !== e.pointerId) return;
    this.trayDrag = null;
    if (this.proposal && this.overCanvas(e.clientX, e.clientY) && !this.overTray(e)) this.place();
    else this.refreshGhostAtCenterIfNeeded();
  };

  /** Soltar encima de la bandeja (o de cualquier control) no coloca. */
  private overTray(e: PointerEvent) {
    const el = document.elementFromPoint(e.clientX, e.clientY);
    return !!el?.closest("[data-builder-ui]");
  }

  // ---- Teclado ----

  /** Atajos de escritorio (investigación, 3.5). Devuelve true si la tecla se usó. */
  handleKey(e: KeyboardEvent): boolean {
    const mod = e.ctrlKey || e.metaKey;
    if (mod && e.code === "KeyZ") {
      if (e.shiftKey) this.redo();
      else this.undo();
      return true;
    }
    if (mod && e.code === "KeyY") {
      this.redo();
      return true;
    }
    if (mod && e.code === "KeyD") {
      this.duplicateSelection();
      return true;
    }
    if (mod) return false;
    switch (e.code) {
      case "KeyR":
        this.rotate(e.shiftKey ? -1 : 1);
        return true;
      case "Delete":
      case "Backspace":
        this.deleteSelection();
        return true;
      case "Escape":
        this.cancel();
        return true;
      case "KeyF":
      case "Home":
        this.frameAll();
        return true;
      case "Enter":
      case "Space":
        if (this.hand) {
          this.place();
          return true;
        }
        return false;
      case "ArrowUp":
      case "ArrowDown":
      case "ArrowLeft":
      case "ArrowRight": {
        if (!this.hand) return false;
        const [ax, az] = this.anchor();
        const base = this.proposal ? [this.proposal.x + ax, this.proposal.z + az] : [Math.floor(this.world.base / 2), Math.floor(this.world.base / 2)];
        const dx = e.code === "ArrowLeft" ? -1 : e.code === "ArrowRight" ? 1 : 0;
        const dz = e.code === "ArrowUp" ? -1 : e.code === "ArrowDown" ? 1 : 0;
        this.updateGhostAtColumn(base[0] + dx, base[1] + dz);
        return true;
      }
    }
    return false;
  }

  // ---- Resto ----

  resize(width: number, height: number) {
    if (!this.mounted || width === 0 || height === 0) return;
    this.stage.resize(width, height);
    // El primer encuadre espera a conocer el tamaño real del lienzo.
    if (!this.framed) {
      this.framed = true;
      const b = this.world.base;
      this.stage.frame(new THREE.Vector3(b / 2, 1, b / 2), b * 0.85);
    }
  }

  dispose() {
    this.unmount();
  }
}
