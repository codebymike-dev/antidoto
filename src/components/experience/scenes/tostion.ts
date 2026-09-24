// Estación 4 de la Ruta del café: la tostión. Luz, maestra tostadora, prepara la
// tostadora, tuesta y enfría el café con todas las malas prácticas. Tres momentos quietos
// (preparar, tostar, enfriar) y al final la versión correcta, en la misma sala de Habbo
// de la trilladora.

import { PixelBuffer, hex, mix } from "../pixel/buffer.ts";
import { STAND, type Look, type Pose, type Rig, type Point } from "../pixel/avatar.ts";
import { Timeline, act, actorPose, poseTo, wait, walkTo, type Actor, type Step } from "../pixel/actor.ts";
import * as finca from "./finca-art.ts";
import * as art from "./tostion-art.ts";
import { Camera, drawAvatarLayers, drawDissolve, drawRipples, drawSparkle, drawWarning, nearestZone, type Framing } from "./common.ts";
import type { Moment, PlayScene, SceneEvents, Zone } from "./types.ts";

const LUZ: Look = {
  shirt: hex("#ece7dc"),
  shirtDark: hex("#d2cabb"),
  shirtLine: hex("#b8ae9b"),
  pants: hex("#3b3b46"),
  pantsDark: hex("#2c2c35"),
  skin: hex("#c68f63"),
  skinDark: hex("#a8714a"),
  hat: hex("#dcedf5"),
  hatDark: hex("#4a3024"),
  band: hex("#9cc6dc"),
  hair: hex("#2a1a12"),
  shoes: "botas",
  headwear: "ninguno",
  hairStyle: "suelto",
  mustache: false,
};

// --- Posturas ------------------------------------------------------------------

const pose = (p: Partial<Pose>): Pose => ({ ...STAND, ...p });

/** En cuclillas junto al cilindro, con la mano arriba hacia la válvula. */
const CROUCH = pose({ lean: 18, thighN: 82, shinN: -14, thighF: 64, shinF: -28, armN: 118, foreN: 128, armF: 24, foreF: 44, headTilt: -10 });
/** Con la muestra en la mano, mirándola de cerca. */
const SAMPLE = pose({ lean: 6, armN: 36, foreN: 128, armF: 60, foreF: 100, headTilt: 16 });
/** Inclinada sobre la bandeja. */
const LEAN = pose({ lean: 50, thighN: 14, shinN: 6, thighF: -6, shinF: -2, armN: 34, foreN: 46, armF: 24, foreF: 36, headTilt: 22 });
const WAVE = pose({ armN: 140, foreN: 168, armF: -6, foreF: 4 });

// --- Lugares (baldosas) ------------------------------------------------------------

type Spot = { i: number; j: number };
const ENTRY: Spot = { i: 2.2, j: 5.4 };
const M1: Spot = { i: 6.05, j: 1.7 };
const M2: Spot = { i: 5.95, j: 2.05 };
const M3: Spot = { i: 6.35, j: 2.85 };
const NEAR_CYCLONE: Spot = { i: 3.3, j: 2.2 };
const START_GOOD: Spot = { i: 2.6, j: 4.3 };

const WIDE: Framing = { zoom: 1, cx: 200, cy: 125 };
const CLOSE_ROASTER: Framing = { zoom: 2, cx: 262, cy: 118 };
const CLOSE_TRAY: Framing = { zoom: 2, cx: 242, cy: 138 };

interface Puff {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  max: number;
  r: number;
  color: number;
}

export class TostionScene implements PlayScene {
  readonly width = art.W;
  readonly height = art.H;

  private room = new PixelBuffer(art.W, art.H);
  private roomGood = new PixelBuffer(art.W, art.H);
  private camera = new Camera(new PixelBuffer(art.W, art.H), WIDE);

  private timeline = new Timeline();
  private luz: Actor = { x: 0, y: 0, facing: 1, pose: CROUCH, expr: "normal", walking: false, walkPhase: 0, carrying: false };
  private look: Look = { ...LUZ };

  private good = false;
  private roasterOn = false;
  private fanOn = false;
  private lighter = false;
  private spray = false;
  private holdingSample = false;
  private hairDown = false;
  private trayBeans = false;
  private pouring = false;
  private spilled = false;
  /** Humo acumulado en la planta (0 a 1). */
  private haze = 0;

  private rig: Rig | null = null;
  private time = 0;
  private puffs: Puff[] = [];
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
    art.drawRoom(this.room);
    this.roomGood.data.set(this.room.data);
    art.drawCanaleta(this.roomGood);
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
    this.look = good ? { ...LUZ, headwear: "cofia", hairStyle: "recogido" } : { ...LUZ };
    this.fanOn = good;
    this.lighter = false;
    this.spray = false;
    this.holdingSample = false;
    this.hairDown = false;
    this.pouring = false;
    Object.assign(this.luz, { walking: false, walkPhase: 0 });
  }

  private applyMoment(m: Moment) {
    this.moment = m;
    this.prepare(false);
    const l = this.luz;
    if (m === 1) {
      this.roasterOn = false;
      this.haze = 0;
      this.trayBeans = false;
      this.spilled = false;
      this.lighter = true;
      this.place(l, M1);
      Object.assign(l, { pose: CROUCH, expr: "normal", facing: 1 });
      this.camera.set(WIDE, true);
    } else if (m === 2) {
      this.roasterOn = true;
      this.haze = 0.75;
      this.trayBeans = false;
      this.spilled = false;
      this.holdingSample = true;
      this.place(l, M2);
      Object.assign(l, { pose: SAMPLE, expr: "esfuerzo", facing: -1 });
      this.camera.set(CLOSE_ROASTER, true);
    } else {
      this.roasterOn = true;
      this.haze = 0.65;
      this.trayBeans = true;
      this.spilled = true;
      this.hairDown = true;
      this.place(l, M3);
      Object.assign(l, { pose: LEAN, expr: "normal", facing: -1 });
      this.camera.set(CLOSE_TRAY, true);
    }
  }

  setMoment(m: Moment): boolean {
    if (this.mode !== "juego" || this.dissolve || this.timeline.busy) return false;
    if (m === this.moment) return true;
    this.timeline.clear();
    if (m === this.moment + 1) {
      this.moment = m;
      if (m === 2) this.pushRoast(false);
      else this.pushCool(false);
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
    return walkTo(this.luz, p.x, p.y, speed);
  }

  // --- Tramos -------------------------------------------------------------------------

  /** Prende la tostadora y saca una muestra (del momento 1 al 2). */
  private pushRoast(story: boolean) {
    const l = this.luz;
    this.timeline.push(
      act(() => (this.lighter = false)),
      poseTo(l, STAND, 0.3),
      this.walk(M2, story ? 34 : 44),
      act(() => {
        l.facing = -1;
        this.roasterOn = true;
        this.camera.set(CLOSE_ROASTER);
      }),
      wait(story ? 0.4 : 0.8),
      act(() => (this.holdingSample = true)),
      poseTo(l, SAMPLE, 0.4, "esfuerzo"),
    );
  }

  /** Descarga el grano en la bandeja y se inclina a mirarlo (del 2 al 3). */
  private pushCool(story: boolean) {
    const l = this.luz;
    this.timeline.push(
      act(() => (this.holdingSample = false)),
      poseTo(l, STAND, 0.3, "normal"),
      act(() => {
        this.pouring = true;
        this.camera.set(CLOSE_TRAY);
      }),
      wait(story ? 1.6 : 1),
      act(() => {
        this.pouring = false;
        this.trayBeans = true;
        this.spilled = !this.good;
      }),
      this.walk(M3, 34),
      act(() => {
        l.facing = -1;
        this.hairDown = !this.good;
      }),
      poseTo(l, this.good ? STAND : LEAN, 0.5),
    );
  }

  playIntro(onDone: () => void) {
    this.mode = "intro";
    this.timeline.clear();
    this.applyMoment(1);
    const l = this.luz;
    this.lighter = false;
    this.place(l, ENTRY);
    Object.assign(l, { pose: STAND, expr: "normal", facing: 1 });
    this.timeline.push(
      this.say("¡Buenos días! Hoy tostamos el café verde que llegó de la trilladora."),
      wait(1.2),
      this.walk(M1, 34),
      act(() => (l.facing = 1)),
      poseTo(l, CROUCH, 0.4),
      act(() => (this.lighter = true)),
      this.say("Huele a gas... con el encendedor encuentro la fuga."),
      wait(2.2),
      act(() => (this.lighter = false)),
      this.say("La cascarilla del colector la boto después."),
      wait(1.8),
    );
    this.pushRoast(true);
    this.timeline.push(
      this.say("¡Qué humo! El extractor está dañado, pero ya pasa."),
      wait(2),
      this.say("¡Ay, quema! Pero hay que ver el punto del grano."),
      wait(2),
    );
    this.pushCool(true);
    this.timeline.push(
      this.say("A ver si se enfría parejo..."),
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

  playGoodPractice(onDone: () => void) {
    this.timeline.clear();
    this.hint = null;
    const l = this.luz;
    this.startDissolve(() => {
      this.mode = "final";
      this.applyMoment(1);
      this.prepare(true);
      this.roasterOn = false;
      this.haze = 0;
      this.trayBeans = false;
      this.spilled = false;
      this.place(l, START_GOOD);
      Object.assign(l, { pose: STAND, expr: "feliz", facing: 1 });
      this.timeline.push(
        this.say("1. Pelo recogido y cofia: nada suelto cerca de las máquinas."),
        wait(2),
        this.walk(M1, 34),
        act(() => (l.facing = 1)),
        poseTo(l, CROUCH, 0.4, "normal"),
        act(() => (this.spray = true)),
        this.say("2. El cilindro va en su jaula. Las fugas se buscan con agua jabonosa, nunca con llama."),
        wait(2.6),
        act(() => (this.spray = false)),
        poseTo(l, STAND, 0.3),
        this.say("3. El cable va por la canaleta, no regado por el piso."),
        wait(2),
        this.walk(NEAR_CYCLONE, 34),
        act(() => (l.facing = -1)),
        this.say("4. El colector de cascarilla, vacío antes de tostar."),
        wait(2),
        this.walk(M2, 34),
        act(() => {
          l.facing = -1;
          this.roasterOn = true;
          this.camera.set(CLOSE_ROASTER);
        }),
        this.say("5. Primero el extractor, después la llama: el humo se va para afuera."),
        wait(2.2),
        act(() => (this.holdingSample = true)),
        poseTo(l, SAMPLE, 0.4),
        this.say("6. Guantes para el calor: la muestra pasa de 200 grados."),
        wait(2),
      );
      this.pushCool(true);
      this.timeline.push(
        this.say("7. Lejos de las aspas, y el piso limpio de granos."),
        wait(2),
        act(() => this.camera.set(WIDE)),
        poseTo(l, WAVE, 0.4, "feliz"),
        this.say("¡Café tostado, listo pa' la taza!"),
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
    this.camera.update(dt);

    // Humo: se acumula si la tostadora está prendida sin extracción, se va si hay extractor.
    const target = this.roasterOn && !this.fanOn ? 0.8 : 0;
    this.haze += (target - this.haze) * Math.min(1, dt * (target > this.haze ? 0.35 : 1.2));
    if (this.roasterOn && this.time > this.nextPuff) {
      this.nextPuff = this.time + 0.12;
      const top = art.P(5.3, 1.3, art.ROASTER.h + 16);
      const toFan = this.fanOn;
      this.puffs.push({
        x: top.x + (Math.random() - 0.5) * 8,
        y: top.y,
        vx: toFan ? 22 + Math.random() * 6 : (Math.random() - 0.5) * 16,
        vy: toFan ? -6 : -10 - Math.random() * 6,
        life: 2.4,
        max: 2.4,
        r: 3 + Math.random() * 3,
        color: art.C.smoke,
      });
    }
    if (this.spray && this.time > this.nextPuff) {
      this.nextPuff = this.time + 0.15;
      const v = art.valvePoint();
      this.puffs.push({ x: v.x + (Math.random() - 0.5) * 5, y: v.y + 3, vx: (Math.random() - 0.5) * 6, vy: -6, life: 1, max: 1, r: 1.5, color: art.C.soap });
    }
    for (const p of this.puffs) {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy *= 1 - dt * 0.8;
      p.life -= dt;
    }
    this.puffs = this.puffs.filter((p) => p.life > 0);
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
    out.data.set((this.good ? this.roomGood : this.room).data);
    art.drawCable(out, this.good);
    art.drawCyclone(out, !this.good);
    art.drawRoaster(out, { on: this.roasterOn, t: this.time, fanOn: this.fanOn });
    art.drawCylinder(out, this.good);
    art.drawGrinder(out);
    if (this.spilled) art.drawSpilled(out);

    // Bandeja y Luz, ordenadas por profundidad.
    const ls = this.spotOf(this.luz);
    const items = [
      { depth: art.TRAY.i + art.TRAY.j, draw: () => art.drawTray(out, { t: this.time, beans: this.trayBeans, spinning: true }) },
      { depth: ls.i + ls.j, draw: () => this.drawLuz(out) },
    ];
    items.sort((a, b) => a.depth - b.depth);
    for (const it of items) it.draw();
    if (this.pouring) art.drawPour(out, this.time);

    this.drawSmoke(out);
  }

  private spotOf(a: Actor): Spot {
    const u = (a.x - art.P(0, 0).x) / 20;
    const v = (a.y - art.P(0, 0).y) / 10;
    return { i: (u + v) / 2, j: (v - u) / 2 };
  }

  private drawLuz(out: PixelBuffer) {
    const l = this.luz;
    out.shadow(l.x + l.facing * 3, l.y, 11, 3, finca.C.shadow, 0.32);
    this.rig = drawAvatarLayers(out, actorPose(l), this.look, l, {
      front: (rig) => {
        const fu = rig.facingUpper;
        if (this.hairDown) {
          // Mechones que cuelgan hacia las aspas.
          const sway = Math.sin(this.time * 2) * 1.2;
          for (let k = 0; k < 6; k++) {
            const x0 = rig.head.x - fu * (2 + k * 1.2);
            const y0 = rig.head.y + 3;
            const x1 = x0 + fu * 3 + sway;
            const y1 = y0 + 14 + (k % 3) * 2;
            out.line(x0, y0, x1, y1, k % 2 ? LUZ.hair : hex("#4a3024"));
            out.line(x0 + 1, y0, x1 + 1, y1, LUZ.hair);
          }
        }
        if (this.good) {
          // Guantes para el calor.
          for (const h of [rig.handN, rig.handF]) {
            out.rect(h.x - 2.5, h.y - 2.5, 5, 5, hex("#2a1e17"));
            out.rect(h.x - 1.5, h.y - 1.5, 3, 3, hex("#6d8fb0"));
          }
        }
        const h = rig.handN;
        if (this.lighter) {
          out.rect(h.x - 1, h.y - 3, 3, 4, art.C.red);
          const f = Math.floor(this.time * 10) % 2;
          out.px(h.x, h.y - 4, art.C.flame);
          out.px(h.x, h.y - 5 - f, art.C.flameCore);
          out.px(h.x + (f ? 1 : -1), h.y - 5, art.C.flame);
        }
        if (this.spray) {
          out.rect(h.x - 1, h.y - 6, 3, 7, hex("#e8f6ff"));
          out.rect(h.x - 1, h.y - 8, 2, 2, art.C.red);
        }
        if (this.holdingSample) {
          // Granos en la palma y, sin guantes, las ondas de calor.
          out.px(h.x - 1, h.y - 2, art.C.bean);
          out.px(h.x + 1, h.y - 2, art.C.beanLit);
          out.px(h.x, h.y - 3, art.C.bean);
          if (!this.good) {
            for (let k = 0; k < 3; k++) {
              const yy = h.y - 6 - ((this.time * 14 + k * 4) % 10);
              out.px(h.x - 2 + k * 2 + Math.round(Math.sin(yy * 0.8)), yy, hex("#ff8a2a"));
            }
          }
        }
      },
    });
  }

  private drawSmoke(out: PixelBuffer) {
    // Neblina de la planta: más espesa arriba, contra el techo.
    if (this.haze > 0.02) {
      const hx = [art.P(0, 0, 80), art.P(8, 0, 80), art.P(8, 0, 0), art.P(8, 7, 0), art.P(0, 7, 0), art.P(0, 7, 80)];
      out.poly(
        hx.flatMap((p) => [p.x, p.y]),
        (x, y) => {
          const under = out.get(x, y);
          if (!under) return 0;
          // Solo en la parte alta de la sala: el humo se queda contra el techo.
          const a = this.haze * 0.5 * Math.max(0, Math.min(1, (125 - y) / 90));
          if (a <= 0.02 || (x + y) % 2 === 1) return under;
          return mix(under, art.C.smoke, a);
        },
      );
    }
    for (const p of this.puffs) {
      const k = p.life / p.max;
      const r = p.r * (1.8 - k * 0.8);
      for (let y = -r; y <= r; y++) {
        for (let x = -r; x <= r; x++) {
          if (x * x + y * y <= r * r && (Math.floor(p.x + x) + Math.floor(p.y + y)) % 2 === 0) out.blend(p.x + x, p.y + y, p.color, Math.min(0.8, k));
        }
      }
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
    const rig = this.rig;

    if (m === 1) {
      if (rig) at("encendedor", rig.handN, 6, -2);
      at("cilindro", art.valvePoint(), 7, 10);
      at("cable", art.cableMid(), 8);
      at("colector", art.cycloneCenter(), 10);
      at("cascarilla", art.chaffPile(), 8);
      if (rig) at("luz", { x: (rig.hip.x + rig.neck.x) / 2, y: (rig.hip.y + rig.neck.y) / 2 }, 7);
      at("bandeja", art.trayCenter(), 12);
      at("molino", art.P(art.GRINDER.i0 + 0.5, art.GRINDER.j0 + 0.5, 36), 9);
      at("estante", art.P(0.05, 4.6, 40), 12);
      at("ventana", art.P(0, 2, 60), 9);
      at("extintor", art.P(7.55, 0.02, 26), 6);
    }
    if (m === 2) {
      at("humo", art.P(3.2, 0.6, 72), 14);
      at("extractor", art.fanCenter(), 8);
      if (rig) at("mano", rig.handN, 5, -2);
      at("muestra", art.P(art.TRIER.i, art.ROASTER.j1 + 0.35, art.TRIER.z), 5);
      at("colector", art.cycloneCenter(), 10);
      at("cilindro", art.valvePoint(), 7, 10);
      at("tostadora", art.P(art.DRUM.i, art.ROASTER.j1, art.DRUM.z), 10);
    }
    if (m === 3) {
      if (rig) {
        const fu = rig.facingUpper;
        at("pelo", { x: rig.head.x - fu * 5, y: rig.head.y + 10 }, 6);
      }
      at("aspas", art.trayCenter(), 10, -2);
      at("granos", art.spillPoint(), 9);
      at("humo", art.P(3.6, 0.8, 64), 12);
      at("cable", art.cableMid(), 8);
    }
    return zones.filter((z) => z.x > 2 && z.x < art.W - 2 && z.y > 2 && z.y < art.H - 2);
  }

  hitTest(x: number, y: number, tolerance = 2): Zone | null {
    return nearestZone(this.zones(), x, y, tolerance);
  }

  speaker(): Point {
    const p = this.rig ? { x: this.rig.head.x, y: this.rig.head.y - 12 } : { x: this.luz.x, y: this.luz.y - 60 };
    return this.camera.toScreen(p);
  }
}
