// Estación 5 de la Ruta del café: la tienda, donde el café llega a la taza. Sara, barista,
// abre la tienda, prepara bebidas y atiende la hora pico con todas las malas prácticas.
// Tres momentos quietos (abrir, preparar, atender) y al final la versión correcta, que
// cierra la ruta. La tienda es la misma sala de Habbo de la trilladora.

import { PixelBuffer, hex } from "../pixel/buffer.ts";
import { STAND, type Look, type Pose, type Rig, type Point } from "../pixel/avatar.ts";
import { Timeline, act, actorPose, poseTo, wait, walkTo, type Actor, type Step } from "../pixel/actor.ts";
import * as finca from "./finca-art.ts";
import * as art from "./tienda-art.ts";
import { Camera, drawAvatarLayers, drawDissolve, drawRipples, drawSparkle, drawWarning, nearestZone, type Framing } from "./common.ts";
import type { Moment, PlayScene, SceneEvents, Zone } from "./types.ts";

const SARA: Look = {
  shirt: hex("#2f5d50"),
  shirtDark: hex("#23473d"),
  shirtLine: hex("#1a352d"),
  pants: hex("#2b2b30"),
  pantsDark: hex("#1f1f24"),
  skin: hex("#8a5a3a"),
  skinDark: hex("#6c4329"),
  hat: hex("#2f5d50"),
  hatDark: hex("#1a120d"),
  band: hex("#f2c230"),
  hair: hex("#1a120d"),
  shoes: "chanclas",
  headwear: "ninguno",
  hairStyle: "recogido",
  mustache: false,
};

const COWORKER: Look = {
  ...SARA,
  shirt: hex("#2f5d50"),
  skin: hex("#d1a47c"),
  skinDark: hex("#b08560"),
  hair: hex("#6b3f22"),
  hairStyle: "corto",
  mustache: true,
  shoes: "botas",
};

/** Clientes de la fila: el primero es el que grita. */
const CUSTOMERS: Look[] = [
  { ...SARA, shirt: hex("#c8423a"), shirtDark: hex("#9c3027"), shirtLine: hex("#6e1f18"), pants: hex("#44587f"), pantsDark: hex("#33435f"), skin: hex("#c98d5f"), skinDark: hex("#a8714a"), hair: hex("#2b2320"), hairStyle: "corto", mustache: true, shoes: "botas", headwear: "gorra", hat: hex("#3b4046"), hatDark: hex("#23272b"), band: hex("#c8423a") },
  { ...SARA, shirt: hex("#e8b72e"), shirtDark: hex("#c2931b"), shirtLine: hex("#8f6a10"), pants: hex("#5d4a3a"), pantsDark: hex("#46372b"), skin: hex("#f0c9a2"), skinDark: hex("#d3a67d"), hair: hex("#a8622e"), hairStyle: "suelto", shoes: "botas" },
  { ...SARA, shirt: hex("#4f7ea8"), shirtDark: hex("#3b6187"), shirtLine: hex("#2a4766"), pants: hex("#2b2b30"), pantsDark: hex("#1f1f24"), skin: hex("#6c4329"), skinDark: hex("#533220"), hair: hex("#140e0a"), hairStyle: "corto", mustache: false, shoes: "botas" },
  { ...SARA, shirt: hex("#8a5aa8"), shirtDark: hex("#6b4287"), shirtLine: hex("#4a2d5e"), pants: hex("#3d4f66"), pantsDark: hex("#2e3c4f"), skin: hex("#b98459"), skinDark: hex("#99683f"), hair: hex("#2a1a12"), hairStyle: "recogido", shoes: "botas" },
];

// --- Posturas ------------------------------------------------------------------

const pose = (p: Partial<Pose>): Pose => ({ ...STAND, ...p });

/** Trapeando, con las dos manos en el palo. */
const MOP = pose({ lean: 16, armN: 44, foreN: 62, armF: 34, foreF: 54, headTilt: 12 });
/** La mano bajo el chorro de vapor de la lanceta. */
const STEAM_HAND = pose({ lean: 12, armN: 70, foreN: 60, armF: 20, foreF: 40, headTilt: 10 });
/** Purga la lanceta con la mano lejos, sosteniendo la jarra abajo. */
const STEAM_GOOD = pose({ lean: 4, armN: 28, foreN: 70, armF: 10, foreF: 30 });
/** Estirada hacia el estante alto. */
const REACH = pose({ armN: 162, foreN: 176, armF: 150, foreF: 168, headTilt: -14 });
const ANGRY = pose({ armN: 150, foreN: 170, armF: -6, foreF: 4, headTilt: -4 });
const WAVE = pose({ armN: 140, foreN: 168, armF: -6, foreF: 4 });
const AT_REGISTER = pose({ armN: 40, foreN: 80, armF: 30, foreF: 70 });

// --- Lugares (baldosas) ------------------------------------------------------------

type Spot = { i: number; j: number };
const M1: Spot = { i: 4.9, j: 4.25 };
const M2: Spot = { i: 5.9, j: 1.95 };
const CHAIR: Spot = { i: 6.05, j: 1.15 };
const ROUND_A: Spot = { i: 7.25, j: 3.4 };
const ROUND_B: Spot = { i: 7.25, j: 1.5 };
const REGISTER: Spot = { i: 1.55, j: 1.6 };
const QUEUE: Spot[] = [
  { i: 1.55, j: 3.55 },
  { i: 1.75, j: 4.35 },
  { i: 1.5, j: 5.1 },
  { i: 1.25, j: 5.85 },
];
const SIGN: Spot = { i: 3.4, j: 4.3 };
const BUCKET: Spot = { i: 5.9, j: 5.0 };

const WIDE: Framing = { zoom: 1, cx: 200, cy: 125 };
const CLOSE_BAR: Framing = { zoom: 2, cx: 248, cy: 120 };

export class TiendaScene implements PlayScene {
  readonly width = art.W;
  readonly height = art.H;

  private room = new PixelBuffer(art.W, art.H);
  private camera = new Camera(new PixelBuffer(art.W, art.H), WIDE);

  private timeline = new Timeline();
  private sara: Actor = { x: 0, y: 0, facing: -1, pose: MOP, expr: "normal", walking: false, walkPhase: 0, carrying: false };
  private coworker: Actor = { x: 0, y: 0, facing: 1, pose: AT_REGISTER, expr: "feliz", walking: false, walkPhase: 0, carrying: false };
  private customers: Actor[] = QUEUE.map(() => ({ x: 0, y: 0, facing: 1, pose: STAND, expr: "normal", walking: false, walkPhase: 0, carrying: false }));
  private look: Look = { ...SARA };

  private good = false;
  private mopping = false;
  private steam = false;
  private queue = false;
  /** Sara parada en el butaco (o en la escalera, en la versión correcta). */
  private raised = false;

  private rig: Rig | null = null;
  private rigAngry: Rig | null = null;
  private time = 0;
  private dissolve: { t: number; apply: () => void; applied: boolean } | null = null;
  private ripples: { x: number; y: number; t: number }[] = [];
  private sweat: { x: number; y: number; vy: number; life: number }[] = [];
  private nextSweat = 0;

  moment: Moment = 1;
  found = new Set<string>();
  hint: string | null = null;
  mode: "juego" | "intro" | "final" = "juego";

  private events: SceneEvents;

  constructor(events: SceneEvents = {}) {
    this.events = events;
    art.drawRoom(this.room);
    this.applyMoment(1);
  }

  // --- Estado de cada momento ------------------------------------------------------

  private place(a: Actor, s: Spot) {
    const p = art.P(s.i, s.j);
    a.x = p.x;
    a.y = p.y;
  }

  private prepare(good: boolean) {
    this.good = good;
    this.look = { ...SARA, shoes: good ? "botas" : "chanclas" };
    this.mopping = false;
    this.steam = false;
    this.queue = false;
    this.raised = false;
    Object.assign(this.sara, { walking: false, walkPhase: 0 });
    QUEUE.forEach((s, k) => {
      this.place(this.customers[k], s);
      Object.assign(this.customers[k], { facing: 1, pose: STAND, expr: "normal" });
    });
    this.place(this.coworker, REGISTER);
  }

  private applyMoment(m: Moment) {
    this.moment = m;
    this.prepare(false);
    const s = this.sara;
    if (m === 1) {
      this.mopping = true;
      this.place(s, M1);
      Object.assign(s, { pose: MOP, expr: "normal", facing: -1 });
      this.camera.set(WIDE, true);
    } else if (m === 2) {
      this.steam = true;
      this.place(s, M2);
      Object.assign(s, { pose: STEAM_HAND, expr: "esfuerzo", facing: -1 });
      this.camera.set(CLOSE_BAR, true);
    } else {
      this.queue = true;
      this.raised = true;
      this.placeOnChair();
      Object.assign(s, { pose: REACH, expr: "esfuerzo", facing: 1 });
      this.angry();
      this.camera.set(WIDE, true);
    }
  }

  private angry() {
    const c = this.customers[0];
    Object.assign(c, { pose: ANGRY, expr: "esfuerzo" });
  }

  /** Pone a Sara encima del butaco (o de la escalera). */
  private placeOnChair() {
    const top = this.good ? 38 : 37;
    const p = art.P(CHAIR.i + 0.25, CHAIR.j + 0.3, top);
    this.sara.x = p.x;
    this.sara.y = p.y;
  }

  setMoment(m: Moment): boolean {
    if (this.mode !== "juego" || this.dissolve || this.timeline.busy) return false;
    if (m === this.moment) return true;
    this.timeline.clear();
    if (m === this.moment + 1) {
      this.moment = m;
      if (m === 2) this.pushToBar(false);
      else this.pushRush(false);
    } else {
      this.startDissolve(() => this.applyMoment(m));
    }
    return true;
  }

  setFound(zoneIds: Iterable<string>) {
    this.found = new Set(zoneIds);
  }

  setHint(zoneId: string | null) {
    this.hint = zoneId;
  }

  skipIntro(onDone: () => void) {
    if (this.mode !== "intro") return;
    this.timeline.clear();
    this.startDissolve(() => {
      this.mode = "juego";
      this.applyMoment(1);
      onDone();
    });
  }

  reset() {
    this.timeline.clear();
    this.mode = "juego";
    this.hint = null;
    this.found = new Set();
    this.startDissolve(() => this.applyMoment(1));
  }

  private startDissolve(apply: () => void) {
    this.dissolve = { t: 0, apply, applied: false };
  }

  get busy() {
    return this.mode !== "juego" || this.timeline.busy || this.dissolve !== null;
  }

  private say(text: string): Step {
    return act(() => this.events.say?.(text));
  }

  private walk(s: Spot, speed = 40): Step {
    const p = art.P(s.i, s.j);
    return walkTo(this.sara, p.x, p.y, speed);
  }

  // --- Tramos -------------------------------------------------------------------------

  /** Deja el trapero, rodea la barra y purga la lanceta (del momento 1 al 2). */
  private pushToBar(story: boolean) {
    const s = this.sara;
    const speed = story ? 40 : 60;
    this.timeline.push(
      act(() => (this.mopping = false)),
      poseTo(s, STAND, 0.25),
      this.walk(ROUND_A, speed),
      this.walk(ROUND_B, speed),
      this.walk(M2, speed),
      act(() => {
        s.facing = -1;
        this.steam = true;
        this.camera.set(CLOSE_BAR);
      }),
      poseTo(s, this.good ? STEAM_GOOD : STEAM_HAND, 0.4, this.good ? "normal" : "esfuerzo"),
    );
  }

  /** Llega la fila; Sara se sube al butaco por vasos (del 2 al 3). */
  private pushRush(story: boolean) {
    const s = this.sara;
    this.timeline.push(
      act(() => {
        this.steam = false;
        this.queue = true;
        if (!this.good) this.angry();
        this.camera.set(WIDE);
      }),
      poseTo(s, STAND, 0.25, "normal"),
      this.walk({ i: CHAIR.i + 0.25, j: CHAIR.j + 0.9 }, story ? 40 : 60),
      act(() => {
        this.raised = true;
        this.placeOnChair();
        s.facing = 1;
      }),
      poseTo(s, REACH, 0.4, "esfuerzo"),
    );
  }

  playIntro(onDone: () => void) {
    this.mode = "intro";
    this.timeline.clear();
    this.applyMoment(1);
    this.timeline.push(
      this.say("¡Buenos días! Trapeo rapidito antes de abrir."),
      wait(2),
      this.say("La regleta junto al lavaplatos... ya la seco después."),
      wait(2),
    );
    this.pushToBar(true);
    this.timeline.push(
      this.say("¡Uy, este vapor quema! Pero así se purga más rápido."),
      wait(2.2),
      this.say("El cuchillo lo dejo en el lavaplatos y luego lo lavo."),
      wait(2),
    );
    this.pushRush(true);
    this.timeline.push(
      this.say("¡Hora pico y yo sola! Se acabaron los vasos: me subo al butaco."),
      wait(2.6),
      act(() => {
        this.startDissolve(() => {
          this.mode = "juego";
          this.applyMoment(1);
          onDone();
        });
      }),
    );
  }

  playGoodPractice(onDone: () => void) {
    this.timeline.clear();
    this.hint = null;
    const s = this.sara;
    this.startDissolve(() => {
      this.mode = "final";
      this.applyMoment(1);
      this.prepare(true);
      this.mopping = true;
      this.place(s, M1);
      Object.assign(s, { pose: MOP, expr: "feliz", facing: -1 });
      this.timeline.push(
        this.say("1. Zapatos cerrados y antideslizantes, y el aviso de piso mojado."),
        wait(2.2),
        this.say("2. La regleta va en la pared, lejos del agua."),
        wait(2),
      );
      this.pushToBar(true);
      this.timeline.push(
        this.say("3. Purgo la lanceta hacia la bandeja, con la mano lejos del vapor."),
        wait(2.2),
        this.say("4. El cuchillo se lava de una y se guarda en su sitio."),
        wait(2),
      );
      this.pushRush(true);
      this.timeline.push(
        this.say("5. Para lo alto, la escalera de tijera, no el butaco."),
        wait(2),
        this.say("6. En hora pico somos dos, y cada quien toma su pausa."),
        wait(2.2),
        act(() => {
          this.raised = false;
          this.place(s, { i: CHAIR.i + 0.6, j: CHAIR.j + 0.8 });
        }),
        poseTo(s, WAVE, 0.4, "feliz"),
        this.say("¡Y el café llega a la taza! Fin de la Ruta del café."),
        wait(1.6),
        act(onDone),
      );
    });
  }

  // --- Tiempo ---------------------------------------------------------------------

  update(dt: number) {
    dt = Math.min(dt, 0.1);
    this.time += dt;
    if (this.dissolve) {
      this.dissolve.t += dt / 0.5;
      if (this.dissolve.t >= 0.5 && !this.dissolve.applied) {
        this.dissolve.applied = true;
        this.timeline.clear();
        this.dissolve.apply();
      }
      if (this.dissolve.t >= 1) this.dissolve = null;
    } else {
      this.timeline.update(dt);
    }
    this.camera.update(dt);
    // Gotas de sudor: el afán de la hora pico.
    if (this.queue && !this.good && this.rig && this.time > this.nextSweat) {
      this.nextSweat = this.time + 0.6;
      const h = this.rig.head;
      this.sweat.push({ x: h.x + (Math.random() - 0.5) * 10, y: h.y - 4, vy: 10, life: 0.8 });
    }
    for (const d of this.sweat) {
      d.y += d.vy * dt;
      d.vy += 30 * dt;
      d.life -= dt;
    }
    this.sweat = this.sweat.filter((d) => d.life > 0);
    for (const r of this.ripples) r.t += dt / 0.4;
    this.ripples = this.ripples.filter((r) => r.t < 1);
  }

  ripple(x: number, y: number) {
    this.ripples.push({ x, y, t: 0 });
  }

  // --- Dibujo ---------------------------------------------------------------------

  render(screen: PixelBuffer) {
    const out = this.camera.canvas(screen);
    this.renderWorld(out);
    this.camera.present(screen);
    this.drawOverlay(screen);
    if (this.dissolve) drawDissolve(screen, this.dissolve.t);
  }

  private renderWorld(out: PixelBuffer) {
    out.data.set(this.room.data);
    if (!this.good || this.moment === 1) art.drawWetFloor(out, this.time);
    art.drawShelf(out, this.queue ? 1 : 4);
    art.drawBackCounter(out, { stripWet: !this.good, knife: !this.good, t: this.time });

    // Detrás de la barra: el butaco o la escalera, Sara y el compañero.
    const behind = this.spotOf(this.sara).j < art.BAR.j0 + 0.2;
    if (this.queue) {
      if (this.good) art.drawLadder(out, CHAIR.i, CHAIR.j);
      else art.drawChair(out, CHAIR.i, CHAIR.j);
    }
    if (this.good && this.queue) drawAvatarLayers(out, AT_REGISTER, COWORKER, this.coworker, {});
    if (behind) this.drawSara(out);
    art.drawBar(out, { t: this.time, steam: this.steam });

    // Del lado de los clientes, de atrás hacia adelante.
    type Drawable = { depth: number; draw: () => void };
    const items: Drawable[] = [];
    if (!behind) items.push({ depth: this.depthOf(this.sara), draw: () => this.drawSara(out) });
    if (this.mopping) items.push({ depth: BUCKET.i + BUCKET.j, draw: () => art.drawBucket(out, BUCKET.i, BUCKET.j) });
    if (this.good && (this.mopping || this.moment === 1)) items.push({ depth: SIGN.i + SIGN.j, draw: () => art.drawWetSign(out, SIGN.i, SIGN.j) });
    if (this.queue) {
      this.customers.forEach((c, k) => {
        items.push({
          depth: QUEUE[k].i + QUEUE[k].j,
          draw: () => {
            out.shadow(c.x, c.y, 10, 3, finca.C.shadow, 0.3);
            const rig = drawAvatarLayers(out, c.pose, CUSTOMERS[k], c, {});
            if (k === 0) {
              this.rigAngry = rig;
              if (!this.good) art.drawAngry(out, rig.head.x + 6, rig.head.y - 16, this.time);
            }
          },
        });
      });
    }
    items.sort((a, b) => a.depth - b.depth);
    for (const it of items) it.draw();

    for (const d of this.sweat) {
      out.px(d.x, d.y, hex("#8fd3f5"));
      out.px(d.x, d.y + 1, hex("#c9ecfb"));
    }
  }

  private spotOf(a: Actor): Spot {
    const o = art.P(0, 0);
    const u = (a.x - o.x) / 20;
    const v = (a.y - o.y) / 10;
    return { i: (u + v) / 2, j: (v - u) / 2 };
  }

  private depthOf(a: Actor) {
    const s = this.spotOf(a);
    return s.i + s.j;
  }

  private drawSara(out: PixelBuffer) {
    const s = this.sara;
    if (!this.raised) out.shadow(s.x + s.facing * 3, s.y, 11, 3, finca.C.shadow, 0.32);
    this.rig = drawAvatarLayers(out, actorPose(s), this.look, s, {
      front: (rig) => {
        if (this.mopping) {
          const floor = { x: rig.handN.x - rig.facingUpper * 14, y: s.y + 2 };
          art.drawMop(out, rig.handN, floor);
        }
        if (this.steam && this.good) {
          // Jarra de leche agarrada por el mango, abajo.
          const h = rig.handN;
          out.rect(h.x - 3, h.y - 1, 6, 7, hex("#2a1e17"));
          out.rect(h.x - 2, h.y, 4, 5, hex("#d9dde0"));
        }
      },
    });
  }

  /** Encima de la cámara: señales de riesgo, la pista y el toque. */
  private drawOverlay(out: PixelBuffer) {
    if (this.mode === "juego" && !this.busy) {
      const zones = this.zones();
      for (const id of this.found) {
        const z = zones.find((zz) => zz.id === id);
        if (z) drawWarning(out, z.x, z.y - 3 + (Math.floor(this.time * 2) % 2));
      }
      if (this.hint) {
        const z = zones.find((zz) => zz.id === this.hint);
        if (z) drawSparkle(out, z.x, z.y, this.time);
      }
    }
    drawRipples(out, this.ripples);
  }

  // --- Zonas tocables -----------------------------------------------------------

  zones(): Zone[] {
    const zones: Zone[] = [];
    const m = this.moment;
    const zoom = this.camera.zoom;
    const at = (id: string, p: Point, r: number, dy = 0) => {
      const q = this.camera.toScreen({ x: p.x, y: p.y + dy });
      zones.push({ id, x: q.x, y: q.y, r: r * zoom });
    };
    const rig = this.rig;
    const torso = rig ? { x: (rig.hip.x + rig.neck.x) / 2, y: (rig.hip.y + rig.neck.y) / 2 } : null;

    if (m === 1) {
      if (rig) at("pies", { x: (rig.footN.x + rig.footF.x) / 2, y: (rig.footN.y + rig.footF.y) / 2 }, 7, -1);
      at("charco", art.wetCenter(), 14);
      at("regleta", art.stripPoint(true), 7);
      if (torso) at("sara", torso, 7);
      at("balde", art.P(BUCKET.i, BUCKET.j, 6), 7);
    }
    if (m === 2) {
      if (rig) at("mano", rig.handN, 5);
      at("lanceta", art.wandTip(), 5, 2);
      at("lavaplatos", art.sinkCenter(), 9);
      at("regleta", art.stripPoint(true), 6);
    }
    if (m === 3) {
      at("silla", art.P(CHAIR.i + 0.25, CHAIR.j + 0.25, 30), 8);
      if (torso) at("sara", torso, 8);
      const mid = art.P(1.55, 4.7, 30);
      at("fila", mid, 14);
      if (this.rigAngry) at("cliente", this.rigAngry.head, 7);
      at("charco", art.wetCenter(), 14);
    }
    at("maquina", art.P((art.ESPRESSO.i0 + art.ESPRESSO.i1) / 2, art.ESPRESSO.j1, art.BAR.h + 12), 9);
    at("vitrina", art.P(2.95, art.BAR.j1, art.BAR.h + 8), 9);
    at("caja", art.P(1.5, 2.5, art.BAR.h + 8), 6);
    at("tablero", art.P(2.2, 0.03, 61), 10);
    at("estante", art.P((art.SHELF.i0 + art.SHELF.i1) / 2, 0.05, art.SHELF.z + 6), 9);
    at("puerta", art.P(0, 5.1, 30), 14);
    at("extintor", art.P(7.6, 0.02, 26), 6);
    // Solo lo que queda dentro del encuadre.
    return zones.filter((z) => z.x > 2 && z.x < art.W - 2 && z.y > 2 && z.y < art.H - 2);
  }

  hitTest(x: number, y: number, tolerance = 2): Zone | null {
    return nearestZone(this.zones(), x, y, tolerance);
  }

  speaker(): Point {
    const p = this.rig ? { x: this.rig.head.x, y: this.rig.head.y - 12 } : { x: this.sara.x, y: this.sara.y - 60 };
    return this.camera.toScreen(p);
  }
}
