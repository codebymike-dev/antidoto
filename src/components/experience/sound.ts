"use client";

// Efectos de la escena, sintetizados con Web Audio como en el módulo en vivo: sin
// archivos ni licencias. Sonidos cortos y "de juego" (blip, moneda, pop de burbuja),
// en la línea de Habbo pero propios.

export type Sfx = "tap" | "pop" | "open" | "found" | "wrong" | "ok" | "badge" | "step";

const KEY = "antidoto-escena-sonido";

class SceneSound {
  private ctx: AudioContext | null = null;
  private out: GainNode | null = null;
  muted = false;

  constructor() {
    if (typeof window === "undefined") return;
    try {
      this.muted = localStorage.getItem(KEY) === "off";
    } catch {
      // Sin almacenamiento (modo privado): con sonido.
    }
  }

  /** El navegador exige un gesto del usuario antes de sonar. */
  unlock() {
    if (!this.ctx) {
      const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!Ctx) return;
      this.ctx = new Ctx();
      this.out = this.ctx.createGain();
      this.out.gain.value = 0.35;
      this.out.connect(this.ctx.destination);
    }
    void this.ctx.resume();
  }

  setMuted(muted: boolean) {
    this.muted = muted;
    try {
      localStorage.setItem(KEY, muted ? "off" : "on");
    } catch {
      // Se recuerda solo en esta visita.
    }
  }

  private note(freq: number, at: number, dur: number, type: OscillatorType, vol = 1, slideTo?: number) {
    const ctx = this.ctx!;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, at);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, at + dur);
    gain.gain.setValueAtTime(0.0001, at);
    gain.gain.exponentialRampToValueAtTime(0.5 * vol, at + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, at + dur);
    osc.connect(gain).connect(this.out!);
    osc.start(at);
    osc.stop(at + dur + 0.02);
  }

  play(kind: Sfx) {
    if (this.muted || !this.ctx || this.ctx.state !== "running") return;
    const t = this.ctx.currentTime;
    switch (kind) {
      case "tap":
        this.note(880, t, 0.05, "square", 0.25);
        break;
      case "step":
        this.note(180, t, 0.04, "triangle", 0.25);
        break;
      case "pop":
        this.note(520, t, 0.09, "sine", 0.6, 880);
        break;
      case "open":
        this.note(660, t, 0.06, "square", 0.3);
        this.note(990, t + 0.05, 0.08, "square", 0.3);
        break;
      case "found":
        this.note(988, t, 0.08, "square", 0.45);
        this.note(1319, t + 0.08, 0.22, "square", 0.45);
        break;
      case "wrong":
        this.note(247, t, 0.25, "triangle", 0.7, 165);
        break;
      case "ok":
        this.note(784, t, 0.12, "sine", 0.5);
        break;
      case "badge":
        [523, 659, 784, 1047].forEach((f, i) => this.note(f, t + i * 0.1, i === 3 ? 0.4 : 0.12, "square", 0.4));
        break;
    }
  }
}

let instance: SceneSound | null = null;

export function sceneSound(): SceneSound {
  if (!instance) instance = new SceneSound();
  return instance;
}
