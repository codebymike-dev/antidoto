// Estación 3 de la Ruta del café: la trilladora. Fabio, operario, recibe el pergamino,
// arruma sacos de 70 kg y trabaja junto a la máquina con todas las malas prácticas. Tres
// momentos quietos (recibir, trillar, destrabar) y al final la versión correcta. La
// bodega se dibuja como una sala de Habbo.

import { PixelBuffer, hex } from "../pixel/buffer.ts";
import { STAND, type Look, type Pose, type Rig, type Point } from "../pixel/avatar.ts";
import { Timeline, act, actorPose, poseTo, wait, walkTo, type Actor, type Step } from "../pixel/actor.ts";
import * as finca from "./finca-art.ts";
import * as art from "./trilladora-art.ts";
import { RAMIRO } from "./finca.ts";
import { Camera, drawAvatarLayers, drawDissolve, drawRipples, drawSparkle, drawWarning, nearestZone, type Framing } from "./common.ts";
import type { Moment, PlayScene, SceneEvents, Zone } from "./types.ts";

const FABIO: Look = {
  shirt: hex("#4f7ea8"),
  shirtDark: hex("#3b6187"),
  shirtLine: hex("#2a4766"),
  pants: hex("#3d4f66"),
  pantsDark: hex("#2e3c4f"),
  skin: hex("#b98459"),
  skinDark: hex("#99683f"),
  hat: hex("#2b5f8a"),
  hatDark: hex("#1d4466"),
  band: hex("#f2c230"),
  hair: hex("#231915"),
  shoes: "botas",
  headwear: "gorra",
};

const DRIVER: Look = {
  shirt: hex("#e67a2e"),
  shirtDark: hex("#c25f1b"),
  shirtLine: hex("#f2c230"),
  pants: hex("#44587f"),
  pantsDark: hex("#33435f"),
  skin: hex("#8a5a3a"),
  skinDark: hex("#6e4529"),
  hat: hex("#f2b632"),
  hatDark: hex("#c98a14"),
  band: hex("#6b4a08"),
  hair: hex("#1c1410"),
  shoes: "botas",
  headwear: "gorra",
  earmuffs: true,
};

// --- Posturas ------------------------------------------------------------------

const pose = (p: Partial<Pose>): Pose => ({ ...STAND, ...p });

/** Encorvado bajo un saco de 70 kg al hombro. */
const SHOULDER = pose({ lean: 26, thighN: 10, shinN: 12, thighF: -8, shinF: -2, armN: 160, foreN: 222, armF: 150, foreF: 214, headTilt: 18, headPush: 1 });
const SHOULDER_WALK = pose({ lean: 22, armN: 160, foreN: 222, armF: 150, foreF: 214, headTilt: 16, headPush: 1 });
/** Estira la mano hacia la correa. */
const REACH = pose({ lean: 10, armN: 74, foreN: 84, armF: 8, foreF: 18, headTilt: 6 });
/** Doblado, con el brazo metido en la salida atascada. */
const JAM = pose({ lean: 50, thighN: 18, shinN: 8, thighF: -8, shinF: -4, armN: 58, foreN: 66, armF: 30, foreF: 44, headTilt: 10 });
const PUSH = pose({ lean: 14, armN: 56, foreN: 72, armF: 50, foreF: 66 });
const AT_PANEL = pose({ armN: 118, foreN: 126, armF: -4, foreF: 6, headTilt: -8 });
const WAVE = pose({ armN: 140, foreN: 168, armF: -6, foreF: 4 });
const SEATED = pose({ lean: -6, thighN: 86, shinN: -2, thighF: 82, shinF: 6, armN: 30, foreN: 80, armF: 36, foreF: 84 });

// --- Lugares (baldosas) ------------------------------------------------------------

type Spot = { i: number; j: number };
const DOOR_IN: Spot = { i: 0.5, j: 5.4 };
const M1: Spot = { i: 1.0, j: 5.15 };
const M2: Spot = { i: 5.25, j: 2.3 };
const M3: Spot = { i: 3.55, j: 2.4 };
const PANEL_SPOT: Spot = { i: 7.25, j: 1.35 };
const WAIT_LINE: Spot = { i: 6.3, j: 4.2 };
const RAMIRO_SPOT: Spot = { i: 0.55, j: 6.0 };
/** El montacargas pasa por el carril del medio. */
const LIFT_J = 4.95;
const LIFT_M1 = { i: 2.05, j: 3.85 };

/** Plano abierto de la bodega, o de cerca sobre la máquina al trillar y destrabar. */
const WIDE: Framing = { zoom: 1, cx: 200, cy: 125 };
const CLOSE: Framing = { zoom: 2, cx: 262, cy: 110 };

type Carry = "hombro" | "carretilla" | null;

interface Dust {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  max: number;
  r: number;
}

export class TrilladoraScene implements PlayScene {
  readonly width = art.W;
  readonly height = art.H;

  private room = new PixelBuffer(art.W, art.H);
  private camera = new Camera(new PixelBuffer(art.W, art.H), WIDE);
  private roomGood = new PixelBuffer(art.W, art.H);

  private timeline = new Timeline();
  private fabio: Actor = { x: 0, y: 0, facing: -1, pose: SHOULDER, expr: "esfuerzo", walking: false, walkPhase: 0, carrying: true };
  private fabioLook: Look = { ...FABIO };
  private carry: Carry = "hombro";
  private driver: Actor = { x: 0, y: 0, facing: -1, pose: SEATED, expr: "normal", walking: false, walkPhase: 0, carrying: false };
  private ramiro: Actor = { x: 0, y: 0, facing: 1, pose: WAVE, expr: "feliz", walking: false, walkPhase: 0, carrying: false };
  private showRamiro = false;

  /** Versión correcta: franjas, arrume sobre estiba, guarda, protección personal. */
  private good = false;
  private running = false;
  private jammed = false;
  private panelOn = false;
  private locked = false;

  private lift = { i: LIFT_M1.i, j: LIFT_M1.j, forks: 18, moving: false };
  /** Patrulla del montacargas por el carril (nulo: quieto). */
  private liftPatrol: { from: number; to: number; dir: 1 | -1; pause: number } | null = null;
  private liftTarget: number | null = null;

  private rigF: Rig | null = null;
  private time = 0;
  private dust: Dust[] = [];
  private nextDust = 0;
  private dissolve: { t: number; apply: () => void; applied: boolean } | null = null;
  private ripples: { x: number; y: number; t: number }[] = [];
  private sackAt: Point = { x: 0, y: 0 };

  moment: Moment = 1;
  found = new Set<string>();
  hint: string | null = null;
  mode: "juego" | "intro" | "final" = "juego";

  private events: SceneEvents;

  constructor(events: SceneEvents = {}) {
    this.events = events;
    art.drawRoom(this.room);
    this.roomGood.data.set(this.room.data);
    art.drawFloorLines(this.roomGood);
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
    this.fabioLook = { ...FABIO, earmuffs: good, mask: good };
    this.jammed = false;
    this.locked = false;
    this.showRamiro = false;
    this.liftTarget = null;
    Object.assign(this.fabio, { walking: false, walkPhase: 0 });
  }

  private applyMoment(m: Moment) {
    this.moment = m;
    this.prepare(false);
    const f = this.fabio;
    this.camera.set(m === 1 ? WIDE : CLOSE, true);
    if (m === 1) {
      this.running = false;
      this.panelOn = false;
      this.carry = "hombro";
      this.place(f, M1);
      Object.assign(f, { pose: SHOULDER, expr: "esfuerzo", facing: -1, carrying: true });
      this.lift = { i: LIFT_M1.i, j: LIFT_M1.j, forks: 18, moving: true };
      this.liftPatrol = null;
    } else {
      this.running = true;
      this.panelOn = true;
      this.carry = null;
      this.lift = { i: 4.4, j: LIFT_J, forks: 4, moving: true };
      this.liftPatrol = { from: 1.1, to: 5.0, dir: -1, pause: 0 };
      if (m === 2) {
        this.place(f, M2);
        Object.assign(f, { pose: REACH, expr: "normal", facing: 1, carrying: false });
      } else {
        this.jammed = true;
        this.place(f, M3);
        Object.assign(f, { pose: JAM, expr: "esfuerzo", facing: 1, carrying: false });
      }
    }
  }

  setMoment(m: Moment): boolean {
    if (this.mode !== "juego" || this.dissolve || this.timeline.busy) return false;
    if (m === this.moment) return true;
    this.timeline.clear();
    if (m === this.moment + 1) {
      this.moment = m;
      if (m === 2) this.pushToMachine(false);
      else this.pushJam(false);
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

  private walk(s: Spot, speed = 34): Step {
    const p = art.P(s.i, s.j);
    return walkTo(this.fabio, p.x, p.y, speed);
  }

  // --- Tramos -------------------------------------------------------------------------

  /** Deja el saco en el arrume y va a la trilladora, que arranca (del momento 1 al 2). */
  private pushToMachine(story: boolean) {
    const f = this.fabio;
    this.timeline.push(
      act(() => {
        this.carry = null;
        f.carrying = false;
      }),
      poseTo(f, STAND, 0.3, "normal"),
      act(() => {
        this.liftPatrol = { from: 1.1, to: 5.0, dir: 1, pause: 0.4 };
        this.lift.j = LIFT_J;
      }),
      this.walk({ i: 4.2, j: 2.9 }, story ? 34 : 44),
      this.walk(M2, story ? 34 : 44),
      act(() => {
        f.facing = 1;
        this.running = true;
        this.panelOn = true;
        this.camera.set(CLOSE);
      }),
      poseTo(f, REACH, 0.4, "normal"),
    );
  }

  /** La salida se atasca y Fabio mete la mano con la máquina prendida (del 2 al 3). */
  private pushJam(story: boolean) {
    const f = this.fabio;
    this.timeline.push(
      act(() => (this.jammed = true)),
      poseTo(f, STAND, 0.25),
      this.walk(M3, story ? 30 : 40),
      act(() => (f.facing = 1)),
      poseTo(f, JAM, 0.5, "esfuerzo"),
    );
  }

  playIntro(onDone: () => void) {
    this.mode = "intro";
    this.timeline.clear();
    this.applyMoment(1);
    const f = this.fabio;
    this.place(f, DOOR_IN);
    Object.assign(f, { pose: SHOULDER_WALK, expr: "esfuerzo", facing: 1 });
    this.showRamiro = true;
    this.place(this.ramiro, RAMIRO_SPOT);
    this.lift = { i: 5.4, j: LIFT_M1.j, forks: 18, moving: false };
    this.timeline.push(
      this.say("¡Llegó el pergamino de don Ramiro!"),
      wait(1.4),
      this.say("Estos sacos de 70 kilos los subo yo solo."),
      act(() => (this.liftTarget = LIFT_M1.i)),
      this.walk(M1, 22),
      act(() => (f.facing = -1)),
      poseTo(f, SHOULDER, 0.3),
      this.say("¡Uy! Casi me coge el montacargas."),
      wait(2),
      act(() => (this.showRamiro = false)),
    );
    this.pushToMachine(true);
    this.timeline.push(
      this.say("Con este ruido ya ni oigo... ¡y qué polvero!"),
      wait(2.2),
      this.say("La correa está floja: la acomodo con la mano."),
      wait(2),
    );
    this.pushJam(true);
    this.timeline.push(
      this.say("¡Se trabó la salida! La destrabo así, sin apagar."),
      wait(2.4),
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
    const f = this.fabio;
    this.startDissolve(() => {
      this.mode = "final";
      this.applyMoment(1);
      this.good = true;
      this.fabioLook = { ...FABIO, earmuffs: true, mask: true };
      this.running = false;
      this.panelOn = false;
      this.carry = "carretilla";
      this.place(f, DOOR_IN);
      Object.assign(f, { pose: PUSH, expr: "normal", facing: 1, carrying: true });
      this.lift = { i: 5.2, j: LIFT_J, forks: 4, moving: false };
      this.liftPatrol = null;
      this.timeline.push(
        this.say("1. Los sacos de 70 kg van en carretilla, nunca al hombro."),
        this.walk({ i: 2.9, j: 3.9 }, 26),
        wait(0.6),
        this.say("2. El arrume va derecho, sobre estiba y con esquineros."),
        wait(1.8),
        act(() => {
          this.carry = null;
          f.carrying = false;
        }),
        poseTo(f, STAND, 0.3),
        this.walk({ i: 4.6, j: 3.9 }, 34),
        this.walk(WAIT_LINE, 34),
        act(() => {
          f.facing = -1;
          this.liftTarget = 1.4;
        }),
        this.say("3. El montacargas va por su carril; yo, por la franja peatonal."),
        wait(3),
        this.walk({ i: 5.3, j: 2.6 }, 34),
        act(() => {
          f.facing = 1;
          this.running = true;
          this.panelOn = true;
          this.camera.set(CLOSE);
        }),
        this.say("4. Tapaoídos y tapabocas mientras la máquina esté prendida."),
        wait(2),
        this.say("5. La correa tiene su guarda: la mano, lejos."),
        wait(1.8),
        act(() => (this.jammed = true)),
        this.walk(PANEL_SPOT, 34),
        act(() => (f.facing = 1)),
        poseTo(f, AT_PANEL, 0.4),
        act(() => {
          this.running = false;
          this.panelOn = false;
          this.locked = true;
        }),
        this.say("6. ¿Se trabó? Apago, pongo candado y tarjeta, verifico... y ahí sí destrabo."),
        wait(2.4),
        poseTo(f, STAND, 0.3),
        this.walk(M3, 34),
        act(() => (f.facing = 1)),
        poseTo(f, JAM, 0.4),
        act(() => (this.jammed = false)),
        wait(0.6),
        act(() => this.camera.set(WIDE)),
        poseTo(f, WAVE, 0.4, "feliz"),
        this.say("¡Café verde listo pa' la tostión!"),
        wait(1.4),
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
    this.moveLift(dt);
    this.camera.update(dt);

    // Polvo de la trilla: mucho sin extracción, poco en la versión correcta.
    if (this.running && this.time > this.nextDust) {
      this.nextDust = this.time + (this.good ? 0.35 : 0.07);
      const top = art.P(4.5 + (Math.random() - 0.5) * 1.6, 0.8, art.MACHINE.h + 24);
      const mouth = art.P(art.SPOUT.i, art.MACHINE.j1 + 0.6, art.SPOUT.z - 4);
      const from = Math.random() < 0.65 ? top : mouth;
      this.dust.push({
        x: from.x + (Math.random() - 0.5) * 6,
        y: from.y - Math.random() * 4,
        vx: (Math.random() - 0.4) * 14,
        vy: -9 - Math.random() * 9,
        life: 2.2,
        max: 2.2,
        r: 2.5 + Math.random() * 2.5,
      });
    }
    for (const d of this.dust) {
      d.x += d.vx * dt;
      d.y += d.vy * dt;
      d.vy += 2 * dt;
      d.vx *= 1 - dt * 0.6;
      d.life -= dt;
    }
    this.dust = this.dust.filter((d) => d.life > 0);
    for (const r of this.ripples) r.t += dt / 0.4;
    this.ripples = this.ripples.filter((r) => r.t < 1);
  }

  private moveLift(dt: number) {
    const l = this.lift;
    const speed = 0.9;
    if (this.liftTarget !== null) {
      const d = this.liftTarget - l.i;
      l.moving = Math.abs(d) > 0.02;
      l.i += Math.sign(d) * Math.min(Math.abs(d), speed * dt);
      if (!l.moving) this.liftTarget = null;
      return;
    }
    const p = this.liftPatrol;
    if (!p) {
      // Quieto pero encendido: tiembla un poco.
      l.moving = this.mode === "juego" && this.moment === 1;
      return;
    }
    if (p.pause > 0) {
      p.pause -= dt;
      l.moving = false;
      return;
    }
    l.moving = true;
    l.i += p.dir * speed * 0.7 * dt;
    if (l.i <= p.from || l.i >= p.to) {
      l.i = Math.max(p.from, Math.min(p.to, l.i));
      p.dir = p.dir === 1 ? -1 : 1;
      p.pause = 1.2;
    }
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
    out.data.set((this.good ? this.roomGood : this.room).data);
    const wobble = !this.good && this.moment === 1 ? this.time * 2.2 : 0;
    art.drawPanel(out, this.panelOn, this.locked);
    art.drawArrume(out, this.good, wobble);
    art.drawMachine(out, { running: this.running, t: this.time, guard: this.good, jammed: this.jammed });

    // Lo que está en el piso, de atrás hacia adelante (por i + j).
    type Drawable = { depth: number; draw: () => void };
    const items: Drawable[] = [];
    const fs = this.spotOf(this.fabio);
    items.push({ depth: fs.i + fs.j, draw: () => this.drawFabio(out) });
    items.push({
      depth: this.lift.i + this.lift.j + art.LIFT.width,
      draw: () =>
        art.drawLift(out, { ...this.lift, t: this.time }, (seat) => {
          const d = this.driver;
          d.x = seat.x;
          d.y = seat.y + 16;
          drawAvatarLayers(out, SEATED, DRIVER, d, {});
        }),
    });
    if (this.showRamiro) {
      const rs = this.spotOf(this.ramiro);
      items.push({
        depth: rs.i + rs.j,
        draw: () => {
          out.shadow(this.ramiro.x, this.ramiro.y, 10, 3, finca.C.shadow, 0.3);
          drawAvatarLayers(out, WAVE, { ...RAMIRO, shoes: "botas" }, this.ramiro, {});
        },
      });
    }
    items.sort((a, b) => a.depth - b.depth);
    for (const it of items) it.draw();

    if (this.running) art.drawNoise(out, this.time, !this.good);
    this.drawEffects(out);
  }

  /** Baldosa aproximada donde está un actor (para ordenar el dibujo). */
  private spotOf(a: Actor): Spot {
    const u = (a.x - art.X0) / 20;
    const v = (a.y - art.Y0) / 10;
    return { i: (u + v) / 2, j: (v - u) / 2 };
  }

  private drawFabio(out: PixelBuffer) {
    const f = this.fabio;
    out.shadow(f.x + f.facing * 3, f.y, 11, 3, finca.C.shadow, 0.32);
    if (this.carry === "carretilla") art.drawHandTruck(out, f.x, f.y, f.facing);
    this.rigF = drawAvatarLayers(out, actorPose(f), this.fabioLook, f, {
      held: (rig) => {
        if (this.carry === "hombro") {
          // Atravesado sobre el hombro y la nuca, el costal de 70 kg.
          const c = { x: rig.neck.x - rig.facingUpper * 3, y: rig.neck.y - 5 };
          this.sackAt = c;
          finca.drawSack(out, c.x, c.y + 9, 1.55, true);
        }
      },
    });
  }

  private drawEffects(out: PixelBuffer) {
    for (const d of this.dust) {
      const k = d.life / d.max;
      const r = d.r * (1.8 - k * 0.8);
      for (let y = -r; y <= r; y++) {
        for (let x = -r; x <= r; x++) {
          if (x * x + y * y <= r * r && (Math.floor(d.x + x) + Math.floor(d.y + y)) % 2 === 0) out.blend(d.x + x, d.y + y, art.C.dust, Math.min(0.85, 1.1 * k));
        }
      }
    }
    // Chispas de esfuerzo sobre el saco al hombro.
    if (this.carry === "hombro" && this.rigF && Math.floor(this.time * 3) % 2 === 0) {
      const h = this.rigF.head;
      out.px(h.x - 8, h.y - 10, hex("#8fd3f5"));
      out.px(h.x - 9, h.y - 8, hex("#8fd3f5"));
    }
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
    const rig = this.rigF;

    at("arrume", art.P(1.5, 1.9, art.arrumeTop(this.good) * 0.55), 18);
    const lf = this.lift;
    if (m !== 3) at("montacargas", art.P(lf.i + 0.6, lf.j + 0.6, 26), 16);
    if (rig && m === 1) {
      at("saco", this.sackAt, 9, 4);
      at("espalda", rig.lumbar, 7);
    }
    if (rig && m !== 1) {
      const fu = rig.facingUpper;
      at("orejas", { x: rig.head.x - fu * 2, y: rig.head.y + 1 }, 5);
      at("cara", { x: rig.head.x + fu * 5, y: rig.head.y + 3 }, 5);
      at("correa", art.beltCenter(), 9);
    }
    if (rig && m === 2) {
      at("mano", rig.handN, 5);
      at("polvo", art.P(4.5, 0.8, art.MACHINE.h + 30), 11);
    }
    if (rig && m === 3) {
      at("brazo", { x: (rig.elbowN.x + rig.handN.x) / 2, y: (rig.elbowN.y + rig.handN.y) / 2 }, 6);
      at("salida", art.P(art.SPOUT.i, art.MACHINE.j1 + 0.25, art.SPOUT.z), 6);
    }
    at("tablero", art.panelCenter(), 8);
    at("puerta", art.P(0, (art.DOOR.j0 + art.DOOR.j1) / 2, 30), 16);
    at("extintor", art.P(2.1, 0.02, 26), 6);
    at("ventana", art.P(0, 2, 60), 9);
    if (m === 1) at("trilladora", art.P(4.5, 1.5, 34), 14);
    // Solo lo que queda dentro del encuadre.
    return zones.filter((z) => z.x > 2 && z.x < art.W - 2 && z.y > 2 && z.y < art.H - 2);
  }

  hitTest(x: number, y: number, tolerance = 2): Zone | null {
    return nearestZone(this.zones(), x, y, tolerance);
  }

  speaker(): Point {
    const p = this.rigF ? { x: this.rigF.head.x, y: this.rigF.head.y - 12 } : { x: this.fabio.x, y: this.fabio.y - 60 };
    return this.camera.toScreen(p);
  }
}
