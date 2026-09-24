// Estación 1 de la Ruta del café: Ramiro, recolector, sube un bulto de café cereza al
// beneficiadero con todas las malas prácticas. La escena se divide en tres momentos
// (agarrar, subir, llevar) donde el personaje queda quieto para poder señalar cada error,
// y cierra con la versión correcta.

import { PixelBuffer, hex, mix, type Color } from "../pixel/buffer.ts";
import { drawAvatar, poseRig, STAND, type Look, type Pose, type Rig, type Point } from "../pixel/avatar.ts";
import { Timeline, act, actorPose, poseTo, wait, walkTo, type Actor } from "../pixel/actor.ts";
import * as art from "./finca-art.ts";

export type Moment = 1 | 2 | 3;

export interface Zone {
  id: string;
  x: number;
  y: number;
  r: number;
}

export interface SceneEvents {
  say?: (text: string) => void;
}

const RAMIRO: Look = {
  shirt: hex("#3f7fc0"),
  shirtDark: hex("#2e5f95"),
  shirtLine: hex("#1f3f66"),
  pants: hex("#44587f"),
  pantsDark: hex("#33435f"),
  skin: hex("#c98d5f"),
  skinDark: hex("#a8714a"),
  hat: hex("#ecdcab"),
  hatDark: hex("#c9b27c"),
  band: hex("#2b2320"),
  hair: hex("#3a2a20"),
  shoes: "chanclas",
};

// --- Posturas ------------------------------------------------------------------

const pose = (p: Partial<Pose>): Pose => ({ ...STAND, ...p });

/** Momento 1: espalda doblada, piernas rectas y el bulto lejos del cuerpo. */
const BEND_BAD = pose({ lean: 94, thighN: -5, shinN: -5, thighF: 3, shinF: 3, armN: 24, foreN: 34, armF: 16, foreF: 28, headTilt: 22 });
/** Momento 2: de un tirón y girando la cintura, el bulto va hacia el hombro. */
const TWIST_BAD = pose({ lean: -10, thighN: 10, shinN: -2, thighF: -8, shinF: -10, armN: 118, foreN: 150, armF: 104, foreF: 140, headTilt: -12, twist: 1 });
/** Momento 3: el bulto sobre la nuca, cuello torcido, resbalando en el barro. */
const CARRY_BAD = pose({ lean: 30, thighN: 34, shinN: 40, thighF: -20, shinF: -6, armN: 160, foreN: 222, armF: -28, foreF: -8, headTilt: 38, headPush: 2 });
const CARRY_WALK = pose({ lean: 24, armN: 160, foreN: 222, armF: -10, foreF: 0, headTilt: 30, headPush: 2 });

const WIDE = pose({ thighN: 13, shinN: 13, thighF: -13, shinF: -13, lean: 4 });
const SQUAT_GOOD = pose({ lean: 28, thighN: 78, shinN: -12, thighF: 60, shinF: -26, armN: 24, foreN: 62, armF: 18, foreF: 56, headTilt: 4 });
const HOLD_GOOD = pose({ lean: 4, thighN: 6, shinN: 6, thighF: -6, shinF: -6, armN: 22, foreN: 104, armF: 16, foreF: 98 });
const LOAD_GOOD = pose({ lean: 10, thighN: 10, shinN: 10, thighF: -8, shinF: -8, armN: 64, foreN: 92, armF: 58, foreF: 88 });
const WAVE = pose({ armN: 164, foreN: 186, armF: -6, foreF: 4 });

// --- Lugares (pies del personaje, en píxeles del lienzo) --------------------------

const ENTER = { x: 96, y: 148 };
const M1 = { x: 158, y: 166 };
const SACK = { x: 188, y: 168 };
const M3 = { x: 236, y: 145 };
const MULE = { x: 246, y: 192 };
const POST = { x: 276, y: 196 };
const BASKET = { x: 176, y: 138 };
const HOUSE = { x: 300, y: 92 };
const GOOD_START = { x: 120, y: 176 };
const GOOD_SACK = { x: 204, y: 184 };
const GOOD_LOAD = { x: 226, y: 198 };

interface SackState {
  mode: "ground" | "twist" | "nape" | "chest" | "hands" | "mule";
  x: number;
  y: number;
  fill: number;
}

interface Particle {
  x: number;
  y: number;
  vy: number;
  life: number;
  color: Color;
}

export class FincaScene {
  readonly width = art.W;
  readonly height = art.H;

  private sky = new PixelBuffer(art.W, art.H);
  private world = new PixelBuffer(art.W, art.H);
  private front = new PixelBuffer(art.W, art.H);
  private clouds = [art.cloudSprite(3, 1), art.cloudSprite(9, 0.75), art.cloudSprite(14, 1.2), art.cloudSprite(22, 0.6)];
  private bushes: { sprite: PixelBuffer; x: number; y: number }[] = [];
  private plantain = art.plantain();

  private timeline = new Timeline();
  private actor: Actor = { x: M1.x, y: M1.y, facing: 1, pose: BEND_BAD, expr: "esfuerzo", walking: false, walkPhase: 0, carrying: false };
  private look: Look = { ...RAMIRO };
  private sack: SackState = { mode: "ground", x: SACK.x, y: SACK.y, fill: 1 };
  private muleLoaded = false;
  private rig: Rig | null = null;
  private sackCenter: Point = { x: SACK.x, y: SACK.y - 9 };

  private time = 0;
  private particles: Particle[] = [];
  private nextSweat = 0;
  private dissolve: { t: number; apply: () => void; applied: boolean } | null = null;
  private ripples: { x: number; y: number; t: number }[] = [];

  moment: Moment = 1;
  /** Zonas de riesgo ya encontradas (se marcan con la señal de peligro). */
  found = new Set<string>();
  hint: string | null = null;
  /** "juego": momentos quietos; "intro" y "final": secuencias automáticas. */
  mode: "juego" | "intro" | "final" = "juego";

  private events: SceneEvents;

  constructor(events: SceneEvents = {}) {
    this.events = events;
    art.drawSky(this.sky);
    art.drawLandscape(this.world);
    art.drawHillPath(this.world, art.iso(3.5, 0), { x: HOUSE.x - 14, y: HOUSE.y + 4 });
    art.drawHouse(this.world, HOUSE.x, HOUSE.y);
    art.drawPlatform(this.world);

    const bushAt: [number, number, number, number][] = [
      [0.55, 1.1, 1, 1],
      [0.5, 2.5, 2, 0.95],
      [0.6, 5.4, 3, 1],
      [1.9, 0.5, 4, 0.9],
      [5.1, 0.55, 5, 1],
      [6.4, 0.7, 6, 0.95],
      [6.5, 2.1, 8, 0.85],
      [1.6, 5.6, 10, 0.9],
    ];
    for (const [i, j, seed, scale] of bushAt) {
      const p = art.iso(i, j);
      this.bushes.push({ sprite: art.coffeeBush(seed, scale), x: p.x, y: p.y });
    }

    // Encuadre: hojas de plátano y cafeto en las esquinas de abajo.
    art.foregroundLeaf(this.front, -8, 262, 70, -40, art.C.plantainDark);
    art.foregroundLeaf(this.front, -10, 238, 52, -10, art.C.plantain);
    const cornerBush = art.coffeeBush(31, 1.3);
    this.front.blit(cornerBush, art.W - cornerBush.w + 8, art.H - cornerBush.h + 14);

    this.applyMoment(1);
  }

  // --- Estado de cada momento ------------------------------------------------------

  private applyMoment(m: Moment) {
    this.moment = m;
    this.look = { ...RAMIRO };
    this.muleLoaded = false;
    Object.assign(this.actor, { facing: 1, walking: false, walkPhase: 0, carrying: m !== 1, expr: "esfuerzo" });
    if (m === 1) {
      Object.assign(this.actor, { x: M1.x, y: M1.y, pose: BEND_BAD });
      this.sack = { mode: "ground", x: SACK.x, y: SACK.y, fill: 1 };
    } else if (m === 2) {
      Object.assign(this.actor, { x: M1.x, y: M1.y, pose: TWIST_BAD });
      this.sack = { mode: "twist", x: 0, y: 0, fill: 1 };
    } else {
      Object.assign(this.actor, { x: M3.x, y: M3.y, pose: CARRY_BAD });
      this.sack = { mode: "nape", x: 0, y: 0, fill: 1 };
    }
  }

  /** Cambia de momento: hacia adelante se anima, hacia atrás se disuelve. */
  setMoment(m: Moment) {
    if (this.mode !== "juego" || this.dissolve) return;
    if (m === this.moment) return;
    this.timeline.clear();
    if (m === this.moment + 1) {
      this.moment = m;
      if (m === 2) this.pushLift();
      else this.pushCarry();
    } else {
      this.startDissolve(() => this.applyMoment(m));
    }
  }

  private pushLift() {
    const a = this.actor;
    this.timeline.push(
      act(() => {
        this.sack = { ...this.sack, mode: "twist" };
        a.carrying = true;
      }),
      poseTo(a, TWIST_BAD, 0.45, "esfuerzo"),
    );
  }

  private pushCarry() {
    const a = this.actor;
    this.timeline.push(
      act(() => {
        this.sack = { ...this.sack, mode: "nape" };
        a.carrying = true;
      }),
      poseTo(a, CARRY_WALK, 0.3, "esfuerzo"),
      walkTo(a, M3.x, M3.y, 30),
      poseTo(a, CARRY_BAD, 0.25),
    );
  }

  private startDissolve(apply: () => void) {
    this.dissolve = { t: 0, apply, applied: false };
  }

  get busy() {
    return this.mode !== "juego" || this.timeline.busy || this.dissolve !== null;
  }

  /** La historia completa, con las malas prácticas, antes de empezar a buscar. */
  playIntro(onDone: () => void) {
    this.mode = "intro";
    this.timeline.clear();
    const a = this.actor;
    const say = (text: string) => act(() => this.events.say?.(text));
    this.look = { ...RAMIRO };
    Object.assign(a, { x: ENTER.x, y: ENTER.y, facing: 1, pose: STAND, expr: "normal", carrying: false });
    this.sack = { mode: "ground", x: SACK.x, y: SACK.y, fill: 1 };
    this.timeline.push(
      say("¡Buenos días! Hoy llevo este bulto al beneficiadero."),
      wait(0.6),
      walkTo(a, M1.x, M1.y, 32),
      wait(0.3),
      poseTo(a, BEND_BAD, 0.7, "esfuerzo"),
      say("Este bulto lo subo yo solito, ¡de una!"),
      wait(1.8),
      act(() => {
        this.sack = { ...this.sack, mode: "twist" };
        a.carrying = true;
      }),
      poseTo(a, TWIST_BAD, 0.4),
      say("¡Upa! Y con un giro pa'l hombro..."),
      wait(1.6),
      act(() => (this.sack = { ...this.sack, mode: "nape" })),
      poseTo(a, CARRY_WALK, 0.3),
      walkTo(a, M3.x, M3.y, 26),
      poseTo(a, CARRY_BAD, 0.25),
      say("¡Uy, qué barro tan liso!"),
      wait(1.8),
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
    const a = this.actor;
    const say = (text: string) => act(() => this.events.say?.(text));
    this.startDissolve(() => {
      this.mode = "final";
      this.look = { ...RAMIRO, shoes: "botas" };
      this.muleLoaded = false;
      Object.assign(a, { x: GOOD_START.x, y: GOOD_START.y, facing: 1, pose: STAND, expr: "feliz", carrying: false, walking: false });
      this.sack = { mode: "ground", x: GOOD_SACK.x, y: GOOD_SACK.y, fill: 0.5 };
      this.timeline.push(
        say("Así sí: botas de caucho y medio bulto, máximo 25 kg."),
        wait(2),
        walkTo(a, GOOD_SACK.x - 9, GOOD_SACK.y, 30),
        poseTo(a, WIDE, 0.35, "normal"),
        say("1. Me acerco al bulto y separo los pies."),
        wait(1.5),
        poseTo(a, SQUAT_GOOD, 0.7),
        say("2. Doblo las rodillas con la espalda recta."),
        wait(1.6),
        act(() => {
          this.sack = { ...this.sack, mode: "hands" };
          a.carrying = true;
        }),
        say("3. Lo pego al cuerpo y lo agarro firme."),
        wait(1.3),
        poseTo(a, HOLD_GOOD, 0.9, "esfuerzo"),
        act(() => (this.sack = { ...this.sack, mode: "chest" })),
        say("4. Subo con la fuerza de las piernas."),
        wait(1.3),
        say("5. Giro con los pies, no con la cintura."),
        walkTo(a, GOOD_LOAD.x, GOOD_LOAD.y, 14),
        poseTo(a, LOAD_GOOD, 0.5, "normal"),
        act(() => {
          this.sack = { ...this.sack, mode: "mule" };
          this.muleLoaded = true;
          a.carrying = false;
        }),
        poseTo(a, STAND, 0.4, "feliz"),
        say("6. ¡Y que la mula haga la fuerza!"),
        wait(0.8),
        poseTo(a, WAVE, 0.35),
        wait(0.9),
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

    // Sudor mientras hace fuerza.
    if (this.actor.expr === "esfuerzo" && this.rig && this.time > this.nextSweat) {
      this.nextSweat = this.time + 0.7 + Math.random() * 0.5;
      const h = this.rig.head;
      this.particles.push({ x: h.x + (Math.random() - 0.5) * 10, y: h.y - 4, vy: 10, life: 0.8, color: hex("#8fd3f5") });
    }
    for (const p of this.particles) {
      p.y += p.vy * dt;
      p.vy += 30 * dt;
      p.life -= dt;
    }
    this.particles = this.particles.filter((p) => p.life > 0);
    for (const r of this.ripples) r.t += dt / 0.4;
    this.ripples = this.ripples.filter((r) => r.t < 1);
  }

  ripple(x: number, y: number) {
    this.ripples.push({ x, y, t: 0 });
  }

  // --- Dibujo ---------------------------------------------------------------------

  render(out: PixelBuffer) {
    out.data.set(this.sky.data);
    const widths = [70, 150, 250, 330];
    this.clouds.forEach((c, k) => {
      const speed = 2 + k * 0.8;
      const span = art.W + c.w + 40;
      const x = ((widths[k] + this.time * speed) % span) - c.w - 20;
      out.blit(c, x, 6 + k * 9 + (k % 2) * 6);
    });
    out.blit(this.world, 0, 0);

    type Drawable = { y: number; draw: () => void };
    const items: Drawable[] = [];
    for (const b of this.bushes) items.push({ y: b.y, draw: () => out.blit(b.sprite, b.x - b.sprite.w / 2, b.y - b.sprite.h + 3) });
    const pl = art.iso(0.4, 0.35);
    items.push({ y: pl.y, draw: () => out.blit(this.plantain, pl.x - 32, pl.y - 70) });
    items.push({ y: BASKET.y, draw: () => art.drawBasket(out, BASKET.x, BASKET.y) });
    const pile = art.iso(4.7, 1.25);
    items.push({
      y: pile.y,
      draw: () => {
        out.shadow(pile.x, pile.y, 14, 3, art.C.shadow, 0.3);
        art.drawSack(out, pile.x - 6, pile.y, 0.6, true);
        art.drawSack(out, pile.x + 5, pile.y + 1, 0.6, true);
        art.drawSack(out, pile.x, pile.y - 7, 0.55, true);
      },
    });
    items.push({ y: POST.y, draw: () => art.drawPost(out, POST.x, POST.y) });
    items.push({
      y: MULE.y,
      draw: () => {
        const t = this.time;
        const m = art.drawMule(out, MULE.x, MULE.y, 1, {
          tail: Math.sin(t * 2.2) * 30 + (Math.sin(t * 7) > 0.97 ? 20 : 0),
          ear: Math.sin(t * 0.9) > 0.8 ? 1 : 0,
          nod: this.muleLoaded ? Math.round(Math.abs(Math.sin(t * 3))) : Math.sin(t * 0.7) > 0.6 ? 1 : 0,
          blink: t % 4 < 0.15,
          loaded: this.muleLoaded,
        });
        out.line(m.halter.x, m.halter.y, POST.x, POST.y - 12, art.C.rope);
        if (this.sack.mode === "mule") {
          this.sackCenter = { x: m.load.x, y: m.load.y - 5 };
          art.drawSack(out, m.load.x, m.load.y + 2, this.sack.fill, true);
        }
      },
    });
    if (this.sack.mode === "ground") {
      items.push({
        y: this.sack.y,
        draw: () => {
          out.shadow(this.sack.x, this.sack.y, 9, 2.5, art.C.shadow, 0.3);
          this.sackCenter = { x: this.sack.x, y: this.sack.y - 9 };
          art.drawSack(out, this.sack.x, this.sack.y, this.sack.fill);
        },
      });
    }
    items.push({ y: this.actor.y, draw: () => this.drawRamiro(out) });
    items.sort((a, b) => a.y - b.y);
    for (const it of items) it.draw();

    this.drawEffects(out);
    out.blit(this.front, 0, 0);
    if (this.dissolve) this.drawDissolve(out, this.dissolve.t);
  }

  private drawRamiro(out: PixelBuffer) {
    const a = this.actor;
    out.shadow(a.x + a.facing * 3, a.y, 11, 3, art.C.shadow, 0.32);
    const sack = this.sack;
    const pose = actorPose(a);
    const hold = (rig: Rig) => {
      if (sack.mode === "twist") {
        const c = { x: (rig.handN.x + rig.handF.x) / 2, y: (rig.handN.y + rig.handF.y) / 2 + 4 };
        this.sackCenter = c;
        art.drawSack(out, c.x, c.y + 6, sack.fill, true);
      } else if (sack.mode === "chest" || sack.mode === "hands") {
        const c =
          sack.mode === "chest"
            ? { x: rig.shoulder.x + rig.facingUpper * 7, y: rig.shoulder.y + 9 }
            : { x: sack.x, y: sack.y - 7 };
        this.sackCenter = c;
        art.drawSack(out, c.x, c.y + 7, sack.fill);
      }
    };
    this.rig = drawAvatarLayers(out, pose, this.look, a, {
      back: (rig) => {
        if (sack.mode === "nape") {
          const c = { x: rig.neck.x - rig.facingUpper * 3, y: rig.neck.y - 5 };
          this.sackCenter = c;
          art.drawSack(out, c.x, c.y + 6, sack.fill, true);
        }
      },
      afterTorso: (rig) => {
        if (sack.mode === "hands") hold(rig);
      },
      held: (rig) => {
        if (sack.mode === "chest" || sack.mode === "twist") hold(rig);
      },
    });

    // Arcos de movimiento del tirón (momento 2) y salpicadura de barro (momento 3).
    if (this.mode !== "final" && sack.mode === "twist" && !this.timeline.busy) {
      const c = this.sackCenter;
      const blink = Math.floor(this.time * 6) % 2 === 0;
      for (let k = 0; k < 3; k++) {
        const r = 12 + k * 4;
        for (let d = 0; d < 50; d += 6) {
          const ang = ((200 + d) * Math.PI) / 180;
          if (blink || k !== 1) out.px(c.x + Math.cos(ang) * r * 0.6 + 8, c.y + Math.sin(ang) * r * 0.5 + 14, hex("#ffffff"));
        }
      }
    }
    if (this.mode !== "final" && sack.mode === "nape" && !a.walking && this.rig) {
      const f = this.rig.footN;
      const k = Math.floor(this.time * 5) % 3;
      out.px(f.x + 6 + k, f.y - 1 - k, art.C.mudDark);
      out.px(f.x + 8 + k, f.y - 2, art.C.mud);
      out.px(f.x + 4 - k, f.y - 1, art.C.mudWet);
    }
  }

  private drawEffects(out: PixelBuffer) {
    for (const p of this.particles) {
      out.px(p.x, p.y, p.color);
      out.px(p.x, p.y + 1, mix(p.color, hex("#ffffff"), 0.4));
    }
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
    for (const r of this.ripples) {
      const rad = 2 + r.t * 8;
      for (let a = 0; a < 360; a += 20) {
        const x = r.x + Math.cos((a * Math.PI) / 180) * rad;
        const y = r.y + Math.sin((a * Math.PI) / 180) * rad * 0.7;
        out.px(x, y, r.t < 0.5 ? hex("#ffffff") : hex("#fff3a8"));
      }
    }
  }

  private drawDissolve(out: PixelBuffer, t: number) {
    // Tramado de Bayer 4x4: la escena se "apaga" en píxeles y vuelve a aparecer.
    const bayer = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
    const level = (t < 0.5 ? t * 2 : (1 - t) * 2) * 16;
    const ink = hex("#0f181d");
    for (let y = 0; y < art.H; y++) {
      for (let x = 0; x < art.W; x++) {
        if (bayer[(y % 4) * 4 + (x % 4)] < level) out.data[y * art.W + x] = ink;
      }
    }
  }

  // --- Zonas tocables -----------------------------------------------------------

  /**
   * Zonas del momento actual, en píxeles del lienzo. Los ids son de la escena; qué
   * riesgo (o qué mensaje "todo bien") corresponde a cada una lo define el contenido.
   */
  zones(): Zone[] {
    const rig = this.rig;
    const zones: Zone[] = [];
    const m = this.moment;
    if (rig) {
      const feet = { x: (rig.footN.x + rig.footF.x) / 2 + rig.facingLegs * 2, y: (rig.footN.y + rig.footF.y) / 2 };
      if (m === 1) {
        zones.push({ id: "espalda", x: (rig.lumbar.x + rig.shoulder.x) / 2, y: (rig.lumbar.y + rig.shoulder.y) / 2 - 1, r: 8 });
        zones.push({ id: "brazos", x: (rig.elbowN.x + rig.handN.x) / 2, y: (rig.elbowN.y + rig.handN.y) / 2, r: 6 });
        zones.push({ id: "piernas", x: (rig.kneeN.x + rig.kneeF.x) / 2, y: (rig.kneeN.y + rig.kneeF.y) / 2, r: 5 });
        zones.push({ id: "bulto", x: this.sackCenter.x + 1, y: this.sackCenter.y, r: 9 });
        zones.push({ id: "sombrero", x: rig.head.x, y: rig.head.y - 3, r: 7 });
      } else if (m === 2) {
        zones.push({ id: "cintura", x: rig.lumbar.x, y: rig.lumbar.y, r: 8 });
        zones.push({ id: "bulto", x: this.sackCenter.x, y: this.sackCenter.y + 2, r: 9 });
        zones.push({ id: "sombrero", x: rig.head.x, y: rig.head.y - 3, r: 6 });
      } else {
        zones.push({ id: "cuello", x: rig.neck.x, y: rig.neck.y - 2, r: 9 });
        zones.push({ id: "bulto", x: this.sackCenter.x, y: this.sackCenter.y + 1, r: 8 });
        for (const [pi, pj] of art.PUDDLES) {
          const p = art.iso(pi, pj);
          zones.push({ id: "barro", x: p.x, y: p.y, r: 7 });
        }
      }
      zones.push({ id: "pies", x: feet.x, y: feet.y - 2, r: 7 });
    }
    zones.push({ id: "mula", x: MULE.x + 2, y: MULE.y - 20, r: 17 });
    zones.push({ id: "canasto", x: BASKET.x, y: BASKET.y - 6, r: 9 });
    zones.push({ id: "casa", x: HOUSE.x - 16, y: HOUSE.y - 26, r: 26 });
    for (const b of this.bushes) zones.push({ id: "cafetal", x: b.x, y: b.y - b.sprite.h / 2, r: 12 });
    return zones;
  }

  /** La zona más cercana al punto, con tolerancia extra para dedos en pantallas táctiles. */
  hitTest(x: number, y: number, tolerance = 2): Zone | null {
    let best: Zone | null = null;
    let bestScore = Infinity;
    for (const z of this.zones()) {
      const d = Math.hypot(z.x - x, z.y - y);
      if (d > z.r + tolerance) continue;
      const score = d / z.r;
      if (score < bestScore) {
        bestScore = score;
        best = z;
      }
    }
    return best;
  }

  /** Dónde está la cabeza de Ramiro (para la burbuja de chat). */
  speaker(): Point {
    return this.rig ? { x: this.rig.head.x, y: this.rig.head.y - 12 } : { x: this.actor.x, y: this.actor.y - 60 };
  }
}

/** drawAvatar con capas que reciben el rig (calculado antes, para saber dónde están las manos). */
function drawAvatarLayers(
  out: PixelBuffer,
  pose: Pose,
  look: Look,
  a: Actor,
  layers: { back?: (r: Rig) => void; afterTorso?: (r: Rig) => void; held?: (r: Rig) => void },
): Rig {
  const rig = poseRig(pose, a.x, a.y, a.facing);
  const withRig = (fn?: (r: Rig) => void) => (fn ? () => fn(rig) : undefined);
  drawAvatar(out, pose, look, a.x, a.y, a.facing, a.expr, {
    back: withRig(layers.back),
    afterTorso: withRig(layers.afterTorso),
    held: withRig(layers.held),
  });
  return rig;
}

/** Señal de peligro amarilla sobre un riesgo ya encontrado. */
function drawWarning(out: PixelBuffer, x: number, y: number) {
  const ink = hex("#2a1e17");
  const yellow = hex("#ffd23f");
  x = Math.round(x);
  y = Math.round(y);
  for (let row = 0; row < 8; row++) {
    const half = Math.floor(row * 0.6);
    out.span(y - 8 + row, x - half - 1, x + half + 1, ink);
    if (row > 0 && row < 7) out.span(y - 8 + row, x - half, x + half, yellow);
  }
  out.span(y - 1, x - 5, x + 5, ink);
  out.px(x, y - 6, ink);
  out.px(x, y - 5, ink);
  out.px(x, y - 4, ink);
  out.px(x, y - 2, ink);
}

function drawSparkle(out: PixelBuffer, x: number, y: number, t: number) {
  const size = 2 + Math.round((Math.sin(t * 8) + 1) * 1.5);
  const c = hex("#fff6b0");
  for (let k = -size; k <= size; k++) {
    out.px(x + k, y, c);
    out.px(x, y + k, c);
  }
  out.px(x, y, hex("#ffffff"));
}
