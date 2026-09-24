// Estación 2 de la Ruta del café: Ramiro lleva el café pergamino en su yipao desde la
// finca hasta la cooperativa, con todas las malas prácticas. Tres momentos quietos
// (salir, manejar, descargar) y al final la versión correcta. Mientras maneja, la vía
// corre por debajo y el yipao se queda en su sitio: así se puede tocar con calma.

import { PixelBuffer, hex, mix, type Color } from "../pixel/buffer.ts";
import { STAND, poseRig, type Look, type Pose, type Rig, type Point } from "../pixel/avatar.ts";
import { Timeline, act, actorPose, poseTo, wait, walkTo, type Actor, type Step } from "../pixel/actor.ts";
import * as finca from "./finca-art.ts";
import * as art from "./transporte-art.ts";
import { RAMIRO } from "./finca.ts";
import { drawAvatarLayers, drawDissolve, drawRipples, drawSparkle, drawWarning, nearestZone } from "./common.ts";
import type { Moment, PlayScene, SceneEvents, Zone } from "./types.ts";

const TONO: Look = {
  shirt: hex("#e8b72e"),
  shirtDark: hex("#c2931b"),
  shirtLine: hex("#8f6a10"),
  pants: hex("#5d4a3a"),
  pantsDark: hex("#46372b"),
  skin: hex("#a8704a"),
  skinDark: hex("#8a5a3a"),
  hat: hex("#d8c48a"),
  hatDark: hex("#b19e64"),
  band: hex("#7a2b1c"),
  hair: hex("#2a1d16"),
  shoes: "botas",
};

// --- Posturas ------------------------------------------------------------------

const pose = (p: Partial<Pose>): Pose => ({ ...STAND, ...p });

/** Sentado al volante con las dos manos en el timón. */
const DRIVE = pose({ lean: -6, thighN: 86, shinN: -2, thighF: 82, shinF: 6, armN: 12, foreN: 82, armF: 18, foreF: 86 });
/**
 * La mano de este lado en el timón y la del otro con el celular en la oreja (se asoma
 * detrás de la cabeza): así la cara, con el sueño, queda a la vista.
 */
const DRIVE_PHONE = pose({ ...DRIVE, armF: 150, foreF: 250, headTilt: 4 });
/** Toño sentado encima de los bultos, agarrado de la carga. */
const ON_LOAD = pose({ lean: 6, thighN: 80, shinN: 36, thighF: 72, shinF: 26, armN: 20, foreN: 46, armF: 30, foreF: 60 });
/** Toño en la silla del copiloto. */
const PASSENGER = pose({ lean: -6, thighN: 86, shinN: -2, thighF: 82, shinF: 6, armN: 16, foreN: 60, armF: 10, foreF: 50 });
const WAVE = pose({ armN: 140, foreN: 168, armF: -6, foreF: 4 });
const POINT = pose({ armN: 96, foreN: 104, armF: -6, foreF: 4, headTilt: 6 });
/** Revisa la llanta en cuclillas, con la espalda recta (lo que se aprendió en la finca). */
const CHECK = pose({ lean: 22, thighN: 80, shinN: -14, thighF: 62, shinF: -28, armN: 40, foreN: 70, armF: 30, foreF: 60, headTilt: 20 });

// --- Lugares (i, j del mundo en pantalla; el yipao está quieto en pantalla) -----------

const CAR_I = 8;
const CAR_J = 100;
const BESIDE = { i: 62, j: 198 };
const ENTER = { i: 64, j: 96 };
const CAB = { i: 54, j: 146 };
const AROUND = { i: 58, j: 204 };
const DOOR = { i: 0, j: 240 };
/** Dónde se ve la finca cuando la vía está en 0. */
const FARM_HOUSE = { i: -38, j: 150 };
const FARM_GATE = { i: -3, j0: 196, j1: 290 };
/** La cooperativa, relativa al punto donde para el yipao. */
const COOP = { i: -40, j: 155 };

// --- Viaje -------------------------------------------------------------------------

/** Velocidad de la vía mientras se maneja (unidades del mundo por segundo). */
const CRUISE = 150;
/** Distancia de frenado hasta la cooperativa: lo bastante larga para que entre desde fuera. */
const BRAKE_DIST = 320;
/** Ventana donde se repite la vía en el momento 2 (la finca y la cooperativa quedan lejos). */
const LOOP_FROM = 420;
const PARK_AT = 1600;

const BUSHES: [number, number, number, number][] = [
  [-16, 20, 1, 0.9],
  [-30, 62, 2, 1],
  [-14, 108, 3, 0.85],
  [-42, 150, 4, 0.95],
  [-22, 192, 5, 1],
  [-12, 244, 6, 0.85],
  [-36, 282, 8, 1],
  [-18, 332, 9, 0.9],
  [-46, 372, 10, 0.9],
  [-26, 420, 12, 1],
  [-14, 470, 13, 0.9],
  [-40, 500, 14, 0.85],
];
const PLANTAINS: [number, number][] = [
  [-30, 236],
  [-44, 456],
];
const SIGN_AT = 300;
const DELINEATORS = [30, 160, 290, 420];

/** Cámara: abierta, o de cerca sobre la cabina mientras Ramiro maneja. */
interface Camera {
  zoom: number;
  cx: number;
  cy: number;
}
const WIDE: Camera = { zoom: 1, cx: art.W / 2, cy: art.H / 2 };
const CLOSE: Camera = { zoom: 2, cx: 212, cy: 126 };

type Load = "alta" | "amarrada";

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  max: number;
  color: Color;
  size: number;
}

type RamiroPlace = "fuera" | "volante";
type TonoPlace = "carga" | "cabina" | "suelo";

export class TransporteScene implements PlayScene {
  readonly width = art.W;
  readonly height = art.H;

  private background = new PixelBuffer(art.W, art.H);
  private clouds = [finca.cloudSprite(5, 1), finca.cloudSprite(12, 0.7), finca.cloudSprite(19, 0.9)];
  private bushSprites = BUSHES.map(([, , seed, scale]) => finca.coffeeBush(seed, scale));
  private plantain = finca.plantain();
  private house = new PixelBuffer(120, 90);

  private timeline = new Timeline();
  private ramiro: Actor = {
    x: 0,
    y: 0,
    facing: -1,
    pose: STAND,
    expr: "normal",
    walking: false,
    walkPhase: 0,
    carrying: false,
  };
  private ramiroAt: RamiroPlace = "fuera";
  private look: Look = { ...RAMIRO, shoes: "botas" };
  private tonoAt: TonoPlace = "carga";
  private tono: Actor = { x: 0, y: 0, facing: -1, pose: ON_LOAD, expr: "normal", walking: false, walkPhase: 0, carrying: false };
  private load: Load = "alta";
  private badTire = true;
  private chocks = false;
  private phone = true;
  private belt = false;
  private sleepy = true;

  private scroll = 0;
  private speed = 0;
  private cruise = 0;
  private looping = false;
  /** Si no es nulo, la vía frena hasta quedar exactamente en este punto. */
  private stopAt: number | null = null;
  /** Dónde queda parqueado el yipao frente a la cooperativa (nulo: no se dibuja). */
  private coopAt: number | null = null;
  private creep = 0;
  private spin = 0;
  private bump = 0;

  private rigR: Rig | null = null;
  private rigT: Rig | null = null;
  private worldBuf = new PixelBuffer(art.W, art.H);
  private cam: Camera = { ...WIDE };
  private camTarget: Camera = WIDE;
  private time = 0;
  private particles: Particle[] = [];
  private nextPuff = 0;
  private dissolve: { t: number; apply: () => void; applied: boolean } | null = null;
  private ripples: { x: number; y: number; t: number }[] = [];

  moment: Moment = 1;
  found = new Set<string>();
  hint: string | null = null;
  mode: "juego" | "intro" | "final" = "juego";

  private events: SceneEvents;

  constructor(events: SceneEvents = {}) {
    this.events = events;
    art.drawBackground(this.background);
    finca.drawHouse(this.house, 64, 86);
    this.applyMoment(1);
  }

  // --- Estado de cada momento ------------------------------------------------------

  private place(a: Actor, p: { i: number; j: number }) {
    const s = art.P(p.i, p.j, art.groundZ(p.i));
    a.x = s.x;
    a.y = s.y;
  }

  private applyMoment(m: Moment) {
    this.moment = m;
    this.look = { ...RAMIRO, shoes: "botas" };
    this.load = "alta";
    this.badTire = true;
    this.chocks = false;
    this.phone = m === 2;
    this.belt = false;
    this.sleepy = m === 2;
    this.tonoAt = "carga";
    this.tono.pose = ON_LOAD;
    this.stopAt = null;
    this.creep = 0;
    Object.assign(this.ramiro, { facing: -1, walking: false, walkPhase: 0, carrying: false });
    if (m === 1) {
      this.setRoad(0, 0, false);
      this.setCamera(WIDE, true);
      this.coopAt = null;
      this.ramiroAt = "fuera";
      this.place(this.ramiro, BESIDE);
      Object.assign(this.ramiro, { pose: POINT, expr: "feliz" });
    } else if (m === 2) {
      this.setRoad(LOOP_FROM + 80, CRUISE, true);
      this.setCamera(CLOSE, true);
      this.coopAt = null;
      this.ramiroAt = "volante";
      Object.assign(this.ramiro, { pose: DRIVE_PHONE, expr: "sueno" });
    } else {
      this.setRoad(PARK_AT, 0, false);
      this.setCamera(WIDE, true);
      this.coopAt = PARK_AT;
      this.ramiroAt = "fuera";
      this.place(this.ramiro, DOOR);
      Object.assign(this.ramiro, { pose: WAVE, expr: "feliz", facing: 1 });
    }
  }

  private setCamera(c: Camera, snap = false) {
    this.camTarget = c;
    if (snap) this.cam = { ...c };
  }

  private setRoad(scroll: number, speed: number, looping: boolean) {
    this.scroll = scroll;
    this.speed = speed;
    this.cruise = speed;
    this.looping = looping;
  }

  setMoment(m: Moment): boolean {
    if (this.mode !== "juego" || this.dissolve || this.timeline.busy) return false;
    if (m === this.moment) return true;
    this.timeline.clear();
    if (m === this.moment + 1) {
      this.moment = m;
      if (m === 2) this.pushDriveOff(false);
      else this.pushArrive(false);
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
    return this.mode !== "juego" || this.timeline.busy || this.dissolve !== null || this.stopAt !== null;
  }

  private say(text: string): Step {
    return act(() => this.events.say?.(text));
  }

  /** Espera a que la vía termine de frenar. */
  private untilStopped(): Step {
    const step: Step = {
      dur: 30,
      tick: () => {
        if (this.stopAt === null) step.dur = 0;
      },
    };
    return step;
  }

  // --- Tramos del viaje -------------------------------------------------------------

  /** Ramiro se sube al yipao y arranca (del momento 1 al 2). */
  private pushDriveOff(story: boolean) {
    const r = this.ramiro;
    this.timeline.push(
      poseTo(r, STAND, 0.25, "normal"),
      walkTo(r, art.P(CAB.i, CAB.j).x, art.P(CAB.i, CAB.j).y, 30),
      act(() => {
        this.ramiroAt = "volante";
        r.pose = DRIVE;
        r.facing = -1;
        if (!story) {
          this.phone = true;
          this.sleepy = true;
          r.pose = DRIVE_PHONE;
          r.expr = "sueno";
        }
      }),
      wait(0.4),
      act(() => {
        this.looping = true;
        this.cruise = CRUISE;
        this.setCamera(CLOSE);
      }),
      wait(story ? 0.6 : 1.4),
    );
  }

  /** Frena frente a la cooperativa, Ramiro se baja y se va a saludar (del 2 al 3). */
  private pushArrive(story: boolean) {
    const r = this.ramiro;
    this.timeline.push(
      act(() => this.brakeToCoop()),
      this.untilStopped(),
      act(() => {
        this.phone = false;
        this.sleepy = false;
        this.ramiroAt = "fuera";
        this.place(r, CAB);
        Object.assign(r, { pose: STAND, expr: "normal", facing: -1 });
      }),
    );
    if (story) {
      this.timeline.push(
        walkTo(r, art.P(AROUND.i, AROUND.j).x, art.P(AROUND.i, AROUND.j).y, 40),
        walkTo(r, art.P(DOOR.i, DOOR.j).x, art.P(DOOR.i, DOOR.j).y, 40),
      );
    } else {
      // Al cambiar de momento no se hace esperar: Ramiro ya está en la puerta.
      this.timeline.push(act(() => this.place(r, DOOR)));
    }
    this.timeline.push(
      act(() => (r.facing = 1)),
      poseTo(r, WAVE, 0.3, "feliz"),
      wait(0.2),
    );
  }

  private brakeToCoop() {
    this.looping = false;
    this.setCamera(WIDE);
    const d = this.speed > 1 ? Math.max(BRAKE_DIST, (this.speed * this.speed) / 70) : BRAKE_DIST;
    this.stopAt = this.scroll + d;
    this.coopAt = this.stopAt;
    this.cruise = 0;
    if (this.speed < 60) this.speed = 60;
  }

  /** La historia completa, con las malas prácticas, antes de empezar a buscar. */
  playIntro(onDone: () => void) {
    this.mode = "intro";
    this.timeline.clear();
    this.applyMoment(1);
    const r = this.ramiro;
    this.place(r, ENTER);
    Object.assign(r, { pose: STAND, expr: "normal", facing: -1 });
    this.phone = false;
    this.sleepy = false;
    this.timeline.push(
      wait(0.3),
      walkTo(r, art.P(BESIDE.i, BESIDE.j).x, art.P(BESIDE.i, BESIDE.j).y, 32),
      this.say("¡Listo el café pa' la cooperativa!"),
      poseTo(r, POINT, 0.3, "feliz"),
      wait(1.4),
      this.say("Toño, hágale encima de los bultos, que allá va fresquito."),
      wait(2),
      poseTo(r, STAND, 0.2, "normal"),
      this.say("Esa llanta está bajita... ¡pero aguanta!"),
      wait(1.6),
    );
    this.pushDriveOff(true);
    this.timeline.push(
      wait(1.2),
      act(() => {
        this.phone = true;
        this.events.say?.("¿Aló? Sí, ya voy llegando...");
      }),
      poseTo(r, DRIVE_PHONE, 0.35),
      wait(2.2),
      act(() => {
        this.sleepy = true;
        r.expr = "bostezo";
        this.events.say?.("Uuuaaah... desde las 4 en el cafetal.");
      }),
      wait(2.4),
    );
    this.pushArrive(true);
    this.timeline.push(
      this.say("Lo dejo aquí un momentico, ¡ya vuelvo!"),
      wait(2.2),
      act(() => {
        this.startDissolve(() => {
          this.mode = "juego";
          this.applyMoment(1);
          onDone();
        });
      }),
    );
  }

  /** La forma correcta, paso a paso, al terminar. */
  playGoodPractice(onDone: () => void) {
    this.timeline.clear();
    this.hint = null;
    const r = this.ramiro;
    const t = this.tono;
    this.startDissolve(() => {
      this.mode = "final";
      this.applyMoment(1);
      this.load = "amarrada";
      this.phone = false;
      this.sleepy = false;
      this.tonoAt = "suelo";
      this.place(t, { i: 66, j: 176 });
      Object.assign(t, { pose: STAND, expr: "feliz", facing: -1 });
      this.place(r, { i: 64, j: 186 });
      Object.assign(r, { pose: STAND, expr: "normal", facing: -1 });
      this.timeline.push(
        this.say("Antes de salir reviso el yipao: llantas, frenos, luces y aceite."),
        poseTo(r, CHECK, 0.6),
        wait(1.2),
        act(() => {
          this.badTire = false;
          this.sparkle(art.P(CAR_I + art.CAR.width + 1, CAR_J + art.CAR.frontWheel, 12));
        }),
        this.say("1. Llanta inflada y con labrado."),
        wait(1.4),
        poseTo(r, STAND, 0.4, "feliz"),
        this.say("2. La carga no pasa de la carrocería y va bien amarrada."),
        wait(2),
        act(() => {
          this.tonoAt = "cabina";
          t.pose = PASSENGER;
        }),
        this.say("3. Toño viaja en la cabina, no encima de la carga."),
        wait(1.6),
        walkTo(r, art.P(CAB.i, CAB.j).x, art.P(CAB.i, CAB.j).y, 30),
        act(() => {
          this.ramiroAt = "volante";
          r.pose = DRIVE;
          r.expr = "normal";
          this.belt = true;
        }),
        this.say("4. Cinturón puesto y el celular guardado."),
        wait(1.6),
        act(() => {
          this.looping = true;
          this.cruise = CRUISE * 0.7;
          this.setCamera(CLOSE);
        }),
        this.say("5. Descansé bien. Si me da sueño, paro y hago una pausa."),
        wait(2.6),
        act(() => this.brakeToCoop()),
        this.untilStopped(),
        act(() => (this.chocks = true)),
        this.say("6. Freno de mano, un cambio puesto y los tacos en las llantas."),
        wait(2.2),
        act(() => {
          this.ramiroAt = "fuera";
          this.place(r, CAB);
          Object.assign(r, { pose: STAND, expr: "feliz", facing: -1 });
        }),
        walkTo(r, art.P(AROUND.i, AROUND.j).x, art.P(AROUND.i, AROUND.j).y, 34),
        poseTo(r, WAVE, 0.35),
        this.say("¡Café entregado, y todos sanos y salvos!"),
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

    this.drive(dt);
    const k = 1 - Math.exp(-dt * 3.5);
    for (const key of ["zoom", "cx", "cy"] as const) {
      this.cam[key] += (this.camTarget[key] - this.cam[key]) * k;
      if (Math.abs(this.camTarget[key] - this.cam[key]) < 0.01) this.cam[key] = this.camTarget[key];
    }

    // Polvo detrás de las llantas mientras la vía corre.
    if (this.speed > 20 && this.time > this.nextPuff) {
      this.nextPuff = this.time + 0.06;
      for (const cj of [art.CAR.rearWheel - 8, art.CAR.frontWheel - 8]) {
        const p = art.P(CAR_I + art.CAR.width + 2, CAR_J + cj, 1);
        this.particles.push({
          x: p.x + Math.random() * 4,
          y: p.y - Math.random() * 3,
          vx: this.speed * 0.25 + Math.random() * 10,
          vy: -this.speed * 0.12 - Math.random() * 6,
          life: 0.7,
          max: 0.7,
          color: art.C.dust,
          size: 1.5 + Math.random() * 1.5,
        });
      }
    }
    // En la bajada el yipao sin freno se va rodando: piedritas que salen de la llanta.
    if (this.mode === "juego" && this.moment === 3 && !this.busy && !this.chocks) {
      this.creep = Math.min(9, this.creep + dt * 0.9);
      if (this.time > this.nextPuff) {
        this.nextPuff = this.time + 0.35;
        const p = art.P(CAR_I + art.CAR.width + 1, CAR_J + this.creep + art.CAR.frontWheel + 9, 0);
        this.particles.push({ x: p.x, y: p.y - 1, vx: -14, vy: 8, life: 0.9, max: 0.9, color: art.C.pebble, size: 1 });
      }
    }
    for (const p of this.particles) {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.life -= dt;
    }
    this.particles = this.particles.filter((p) => p.life > 0);
    for (const r of this.ripples) r.t += dt / 0.4;
    this.ripples = this.ripples.filter((r) => r.t < 1);
  }

  private drive(dt: number) {
    if (this.stopAt !== null) {
      // Frena con la desaceleración justa para quedar en stopAt.
      const left = this.stopAt - this.scroll;
      if (left <= 0.5 || this.speed <= 2) {
        this.scroll = this.stopAt;
        this.speed = 0;
        this.stopAt = null;
      } else {
        const decel = (this.speed * this.speed) / (2 * left);
        this.speed = Math.max(2, this.speed - decel * dt);
        this.scroll = Math.min(this.stopAt, this.scroll + this.speed * dt);
      }
    } else {
      const diff = this.cruise - this.speed;
      this.speed += Math.sign(diff) * Math.min(Math.abs(diff), 90 * dt);
      this.scroll += this.speed * dt;
      if (this.looping && this.scroll >= LOOP_FROM + art.PERIOD) this.scroll -= art.PERIOD;
    }
    const creepSpeed = this.mode === "juego" && this.moment === 3 && this.creep < 9 ? 0.9 : 0;
    this.spin -= ((this.speed + creepSpeed) * dt) / art.CAR.wheelR;
    this.bump = this.speed > 30 ? (Math.sin(this.time * 13) + Math.sin(this.time * 5.3) > 1.25 ? 1 : 0) : 0;
  }

  ripple(x: number, y: number) {
    this.ripples.push({ x, y, t: 0 });
  }

  private sparkle(p: Point) {
    for (let k = 0; k < 10; k++) {
      const a = (k / 10) * Math.PI * 2;
      this.particles.push({
        x: p.x,
        y: p.y,
        vx: Math.cos(a) * 26,
        vy: Math.sin(a) * 18,
        life: 0.6,
        max: 0.6,
        color: hex("#fff6b0"),
        size: 1,
      });
    }
  }

  // --- Dibujo ---------------------------------------------------------------------

  private get carJ() {
    return CAR_J + this.creep;
  }

  render(screen: PixelBuffer) {
    const zoomed = this.cam.zoom > 1.001;
    const out = zoomed ? this.worldBuf : screen;
    this.renderWorld(out);
    if (zoomed) this.project(out, screen);
    this.drawOverlay(screen);
    if (this.dissolve) drawDissolve(screen, this.dissolve.t);
  }

  /** Amplía la parte del mundo que encuadra la cámara, píxel por píxel (sin suavizado). */
  private project(world: PixelBuffer, screen: PixelBuffer) {
    const { zoom, cx, cy } = this.cam;
    const W = art.W;
    const H = art.H;
    for (let y = 0; y < H; y++) {
      const sy = Math.min(H - 1, Math.max(0, Math.floor(cy + (y + 0.5 - H / 2) / zoom)));
      for (let x = 0; x < W; x++) {
        const sx = Math.min(W - 1, Math.max(0, Math.floor(cx + (x + 0.5 - W / 2) / zoom)));
        screen.data[y * W + x] = world.data[sy * W + sx];
      }
    }
  }

  /** De píxeles del mundo a píxeles de la pantalla, según la cámara. */
  private toScreen(p: Point): Point {
    const { zoom, cx, cy } = this.cam;
    return { x: (p.x - cx) * zoom + art.W / 2, y: (p.y - cy) * zoom + art.H / 2 };
  }

  private renderWorld(out: PixelBuffer) {
    out.data.set(this.background.data);
    const starts = [40, 190, 300];
    this.clouds.forEach((c, k) => {
      const span = art.W + c.w + 40;
      const x = ((starts[k] + this.time * (2 + k)) % span) - c.w - 20;
      out.blit(c, x, 4 + k * 10);
    });
    art.drawGround(out, this.scroll);

    // Lo que está en el talud, de lo más lejano a lo más cercano.
    type Drawable = { depth: number; draw: () => void };
    const back: Drawable[] = [];
    const s = this.scroll;
    BUSHES.forEach(([i, jw], k) => {
      const j = art.displayJ(jw, s);
      if (j > 330) return;
      const sprite = this.bushSprites[k];
      back.push({
        depth: i + j,
        draw: () => {
          const p = art.P(i, j, art.groundZ(i));
          out.blit(sprite, p.x - sprite.w / 2, p.y - sprite.h + 3);
        },
      });
    });
    for (const [i, jw] of PLANTAINS) {
      const j = art.displayJ(jw, s);
      if (j > 330) continue;
      back.push({
        depth: i + j,
        draw: () => {
          const p = art.P(i, j, art.groundZ(i));
          out.blit(this.plantain, p.x - 32, p.y - 70);
        },
      });
    }
    const signJ = art.displayJ(SIGN_AT, s);
    back.push({ depth: signJ - 5, draw: () => art.drawCurveSign(out, -5, signJ) });

    // La finca (al salir) y la cooperativa (al llegar), que no se repiten.
    const farmJ = FARM_HOUSE.j - s;
    if (farmJ > -200) {
      back.push({
        depth: FARM_HOUSE.i + farmJ,
        draw: () => {
          const p = art.P(FARM_HOUSE.i, farmJ, art.groundZ(FARM_HOUSE.i));
          out.blit(this.house, p.x - 64, p.y - 86);
        },
      });
      back.push({ depth: farmJ, draw: () => art.drawGate(out, FARM_GATE.i, FARM_GATE.j0 - s, FARM_GATE.j1 - s) });
    }
    if (this.coopAt !== null) {
      const coopJ = COOP.j + this.coopAt - s;
      if (coopJ < 420) back.push({ depth: 1000, draw: () => art.drawCoop(out, COOP.i, coopJ) });
    }
    back.sort((a, b) => a.depth - b.depth);
    for (const d of back) d.draw();

    if (this.ramiroAt === "fuera" && this.ramiroBehindCar()) this.drawRamiro(out);
    this.drawCar(out);
    if (this.tonoAt === "suelo") this.drawTono(out);
    if (this.ramiroAt === "fuera" && !this.ramiroBehindCar()) this.drawRamiro(out);

    for (const jw of DELINEATORS) {
      const j = art.displayJ(jw, s);
      if (j < 330) art.drawDelineator(out, 70, j);
    }

    this.drawEffects(out);
  }

  /** En la cooperativa Ramiro está al otro lado de la vía, detrás del yipao. */
  private ramiroBehindCar() {
    return this.ramiro.x < art.P(0, DOOR.j).x + 12;
  }

  private carState(): art.CarState {
    return { i0: CAR_I, j0: this.carJ, bump: this.bump, spin: this.spin, badTire: this.badTire, chocks: this.chocks };
  }

  private drawCar(out: PixelBuffer) {
    const b = this.bump;
    const I = (ci: number) => CAR_I + ci;
    const J = (cj: number) => this.carJ + cj;
    art.drawWillys(out, this.carState(), {
      cargo: () => {
        this.drawLoad(out, b);
        if (this.tonoAt === "carga") this.drawTono(out);
      },
      driver: () => {
        if (this.tonoAt === "cabina") this.drawTono(out);
        if (this.ramiroAt === "volante") this.drawRamiro(out);
      },
      dash: () => art.drawSteering(out, I(art.CAR.driverI), J(art.CAR.wheelJ), art.CAR.wheelZ + b),
    });
  }

  /** Los bultos del platón: altos y sueltos, o a ras de la carrocería y amarrados. */
  private drawLoad(out: PixelBuffer, b: number) {
    const I = (ci: number) => CAR_I + ci;
    const J = (cj: number) => this.carJ + cj;
    const layers = this.load === "alta" ? 4 : 2;
    const spots: [number, number][] = [
      [2, 2],
      [21, 2],
      [2, 17],
      [21, 17],
    ];
    for (let l = 0; l < layers; l++) {
      // Los de arriba van corridos: la pila se ladea.
      const shift = this.load === "alta" ? l * 1.2 : 0;
      for (const [ci, cj] of spots) art.drawBag(out, I(ci + shift), J(cj), art.CAR.floor + l * 8 + b);
    }
    if (this.load === "alta") {
      // Uno más atravesado encima, asomado por fuera de la carrocería.
      art.drawBag(out, I(26), J(6), art.CAR.floor + layers * 8 + b, 22, 12, 7);
    } else {
      // Lazos cruzados de lado a lado.
      for (const cj of [9, 24]) {
        const a = art.P(I(0), J(cj), art.CAR.wall + b);
        const c = art.P(I(art.CAR.width), J(cj), art.CAR.wall + b);
        const mid = art.P(I(art.CAR.width / 2), J(cj), art.CAR.floor + 17 + b);
        out.line(a.x, a.y, mid.x, mid.y, finca.C.rope);
        out.line(mid.x, mid.y, c.x, c.y, finca.C.rope);
      }
    }
  }

  private drawTono(out: PixelBuffer) {
    const t = this.tono;
    const b = this.bump;
    if (this.tonoAt === "carga") {
      const top = art.CAR.floor + 4 * 8 + b;
      // Sentado atrás, mirando hacia la cola, con las piernas colgando por detrás.
      const seat = art.P(CAR_I + 20, this.carJ + 12, top);
      t.pose = ON_LOAD;
      t.facing = 1;
      this.seatActor(t, seat);
    } else if (this.tonoAt === "cabina") {
      const floor = art.P(CAR_I + 11, this.carJ + art.CAR.driverJ, art.CAR.floor + b);
      t.facing = -1;
      t.x = floor.x;
      t.y = floor.y;
    }
    this.rigT = drawAvatarLayers(out, actorPose(t), TONO, t, {
      held: (rig) => {
        if (this.tonoAt === "cabina") drawBelt(out, rig);
      },
    });
  }

  /** Pone al actor sentado: la cadera queda en `seat`. */
  private seatActor(a: Actor, seat: Point) {
    const rig = poseRig(a.pose, 0, 0, a.facing);
    a.x = seat.x;
    a.y = seat.y - rig.hip.y;
  }

  private drawRamiro(out: PixelBuffer) {
    const r = this.ramiro;
    if (this.ramiroAt === "volante") {
      const floor = art.P(CAR_I + art.CAR.driverI, this.carJ + art.CAR.driverJ, art.CAR.floor + this.bump);
      r.x = floor.x;
      r.y = floor.y;
      if (this.sleepy && this.mode !== "final") {
        // Bosteza cada tanto y cabecea.
        const k = this.time % 4.2;
        r.expr = k > 3 ? "bostezo" : "sueno";
      }
    } else {
      out.shadow(r.x + r.facing * 3, r.y, 11, 3, finca.C.shadow, 0.32);
    }
    const p = actorPose(r);
    const nod = this.sleepy && this.ramiroAt === "volante" ? Math.max(0, Math.sin(this.time * 1.5)) * 6 : 0;
    this.rigR = drawAvatarLayers(out, { ...p, headTilt: p.headTilt + nod }, this.look, r, {
      held: (rig) => {
        if (this.belt && this.ramiroAt === "volante") drawBelt(out, rig);
      },
      front: (rig) => {
        if (this.phone && this.ramiroAt === "volante") drawPhone(out, rig, this.time, this.look.skin);
      },
    });
  }

  private drawEffects(out: PixelBuffer) {
    for (const p of this.particles) {
      const k = p.life / p.max;
      if (p.size <= 1) {
        out.px(p.x, p.y, p.color);
        continue;
      }
      const r = p.size * (1.6 - k * 0.6);
      for (let y = -r; y <= r; y++) {
        for (let x = -r; x <= r; x++) {
          if (x * x + y * y <= r * r && (Math.floor(p.x + x) + Math.floor(p.y + y)) % 2 === 0) out.blend(p.x + x, p.y + y, p.color, 0.7 * k);
        }
      }
    }
    // Zzz de sueño sobre la cabeza.
    if (this.sleepy && this.ramiroAt === "volante" && this.rigR) {
      const h = this.rigR.head;
      for (let k = 0; k < 3; k++) {
        const t = (this.time * 0.6 + k / 3) % 1;
        const size = 3 + Math.round(t * 2);
        drawZOutlined(out, h.x - 10 - t * 8, h.y - 14 - t * 16, size);
      }
    }
    // En la bajada sin freno: rayitas de movimiento detrás de la llanta de atrás.
    if (this.mode === "juego" && this.moment === 3 && !this.busy && !this.chocks && Math.floor(this.time * 3) % 2 === 0) {
      const p = art.P(CAR_I + art.CAR.width + 2, this.carJ + art.CAR.rearWheel - 16, 6);
      for (let k = 0; k < 3; k++) out.span(p.y + k * 3, p.x + k, p.x + 6 + k, hex("#ffffff"));
    }
  }

  /** Lo que va encima de la cámara: señales de riesgo, la pista y el toque. */
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
    const I = (ci: number) => CAR_I + ci;
    const J = (cj: number) => this.carJ + cj;
    const zoom = this.cam.zoom;
    const at = (id: string, p: Point, r: number, dy = 0) => {
      const q = this.toScreen({ x: p.x, y: p.y + dy });
      zones.push({ id, x: q.x, y: q.y, r: r * zoom });
    };

    const loadTop = this.load === "alta" ? 36 : 24;
    at("carga", art.P(I(21), J(16), loadTop), 13);
    if (this.rigT && this.tonoAt === "carga") at("tono", this.rigT.shoulder, 8, 2);
    at("llanta", art.P(I(art.CAR.width + 1), J(art.CAR.frontWheel), 9), 9);
    at("yipao", art.P(I(21), J(72), 34), 11);

    const rig = this.rigR;
    if (m === 1 && rig) at("ramiro", { x: (rig.hip.x + rig.neck.x) / 2, y: (rig.hip.y + rig.neck.y) / 2 }, 9);
    if (m === 2 && rig) {
      at("cara", rig.head, 6, 1);
      at("celular", phoneAt(rig), 5);
      at("pecho", { x: (rig.shoulder.x + rig.hip.x) / 2, y: (rig.shoulder.y + rig.hip.y) / 2 }, 6);
      const signJ = art.displayJ(SIGN_AT, this.scroll);
      const sign = art.P(-5, signJ, art.groundZ(-5) + 32);
      if (sign.x > 8 && sign.x < art.W - 8 && sign.y > 8 && sign.y < art.H - 8) at("senal", sign, 9);
      at("barranco", art.P(art.CLIFF_EDGE, 70, -12), 12);
    }
    if (m === 3) {
      at("ruedas", art.P(I(art.CAR.width + 1), J(art.CAR.rearWheel), 9), 9);
      if (rig) at("saludo", { x: (rig.hip.x + rig.neck.x) / 2, y: (rig.hip.y + rig.neck.y) / 2 }, 9);
      if (this.coopAt !== null) at("cooperativa", art.P(COOP.i + 34, COOP.j + 20, 30), 14);
    }
    if (m === 1) {
      const house = art.P(FARM_HOUSE.i, FARM_HOUSE.j - this.scroll, art.groundZ(FARM_HOUSE.i) + 30);
      at("casa", house, 20);
    }
    if (m !== 3) {
      BUSHES.forEach(([i, jw], k) => {
        const j = art.displayJ(jw, this.scroll);
        const p = art.P(i, j, art.groundZ(i));
        const sprite = this.bushSprites[k];
        if (p.x > 0 && p.x < art.W && p.y > 0 && p.y < art.H) at("cafetal", p, 10, -sprite.h / 2);
      });
    }
    // Solo lo que queda dentro del encuadre.
    return zones.filter((z) => z.x > 2 && z.x < art.W - 2 && z.y > 2 && z.y < art.H - 2);
  }

  hitTest(x: number, y: number, tolerance = 2): Zone | null {
    return nearestZone(this.zones(), x, y, tolerance);
  }

  speaker(): Point {
    const p = this.rigR ? { x: this.rigR.head.x, y: this.rigR.head.y - 12 } : { x: this.ramiro.x, y: this.ramiro.y - 60 };
    return this.toScreen(p);
  }
}

/** Cinturón cruzado del hombro de atrás a la cadera de adelante, con la hebilla. */
function drawBelt(out: PixelBuffer, rig: Rig) {
  const f = rig.facingUpper;
  const a = { x: rig.neck.x - f * 3, y: rig.neck.y + 1 };
  const b = { x: rig.hip.x + f * 4, y: rig.hip.y - 1 };
  out.line(a.x, a.y, b.x, b.y, hex("#3b4046"));
  out.line(a.x + 1, a.y, b.x + 1, b.y, hex("#5a616b"));
  out.rect(b.x - 1, b.y - 1, 3, 2, hex("#c9cfd4"));
}

/** Dónde queda el celular: pegado a la oreja, en la mitad de atrás de la cabeza. */
function phoneAt(rig: Rig): Point {
  return { x: rig.head.x - rig.facingUpper * 3, y: rig.head.y + 2 };
}

/** Celular pegado a la oreja, timbrando. */
function drawPhone(out: PixelBuffer, rig: Rig, t: number, skin: Color) {
  const h = phoneAt(rig);
  // La mano que lo sostiene, debajo.
  out.rect(h.x - 2.5, h.y + 2, 5, 4, hex("#2a1e17"));
  out.rect(h.x - 1.5, h.y + 2, 3, 3, skin);
  out.rect(h.x - 1.5, h.y - 4, 4, 7, hex("#2a1e17"));
  out.rect(h.x - 0.5, h.y - 3, 2, 5, hex("#1e2226"));
  out.px(h.x, h.y - 2, hex("#8fe0ff"));
  out.px(h.x, h.y - 1, hex("#8fe0ff"));
  if (Math.floor(t * 4) % 2 === 0) {
    // Ondas del timbre hacia atrás.
    const c = hex("#ffffff");
    const x = h.x - rig.facingUpper * 5;
    out.px(x, h.y - 5, c);
    out.px(x - rig.facingUpper, h.y - 4, c);
    out.px(x - rig.facingUpper, h.y - 3, c);
    out.px(x, h.y - 2, c);
    out.px(x - rig.facingUpper * 3, h.y - 6, c);
    out.px(x - rig.facingUpper * 4, h.y - 4, c);
    out.px(x - rig.facingUpper * 3, h.y - 2, c);
  }
}

function drawZOutlined(out: PixelBuffer, x: number, y: number, size: number) {
  const ink = hex("#2a1e17");
  for (const [dx, dy] of [
    [-1, 0],
    [1, 0],
    [0, -1],
    [0, 1],
  ])
    art.drawZ(out, x + dx, y + dy, size, ink);
  art.drawZ(out, x, y, size, mix(hex("#ffffff"), hex("#cfe8ff"), 0.3));
}
