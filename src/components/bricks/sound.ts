"use client";

// Sonido de los ladrillos, sintetizado con Web Audio como el resto del proyecto (sin archivos ni
// licencias). El clic de encaje es la mitad de la sensación de construir (investigación,
// sección 5): una ráfaga corta de ruido filtrado más un golpe grave, con el tono un poco
// distinto cada vez para que no canse.

export type BrickSfx = "place" | "pick" | "invalid" | "undo" | "remove" | "rotate";

const KEY = "antidoto-ladrillos-sonido";

class BrickSound {
  private ctx: AudioContext | null = null;
  private out: GainNode | null = null;
  private noise: AudioBuffer | null = null;
  muted = false;
  private listeners = new Set<() => void>();

  /** Para useSyncExternalStore: el botón de sonido refleja la preferencia guardada. */
  subscribe = (fn: () => void) => {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  };

  getMuted = () => this.muted;

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
      this.ctx = new Ctx({ latencyHint: "interactive" });
      this.out = this.ctx.createGain();
      this.out.gain.value = 0.5;
      this.out.connect(this.ctx.destination);
      const len = Math.floor(this.ctx.sampleRate * 0.05);
      this.noise = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const data = this.noise.getChannelData(0);
      for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    }
    void this.ctx.resume();
  }

  setMuted(muted: boolean) {
    this.muted = muted;
    this.listeners.forEach((fn) => fn());
    try {
      localStorage.setItem(KEY, muted ? "off" : "on");
    } catch {
      // Se recuerda solo en esta visita.
    }
  }

  /** Transiente de plástico: ruido con pasabanda, muy corto y sin cola. */
  private tick(at: number, freq: number, dur: number, vol: number) {
    const ctx = this.ctx!;
    const src = ctx.createBufferSource();
    src.buffer = this.noise;
    const band = ctx.createBiquadFilter();
    band.type = "bandpass";
    band.frequency.value = freq;
    band.Q.value = 1.4;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(vol, at);
    gain.gain.exponentialRampToValueAtTime(0.0001, at + dur);
    src.connect(band).connect(gain).connect(this.out!);
    src.start(at);
    src.stop(at + dur + 0.01);
  }

  /** Cuerpo grave: una senoidal que cae rápido. */
  private thump(at: number, freq: number, dur: number, vol: number, slideTo?: number) {
    const ctx = this.ctx!;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(freq, at);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, at + dur);
    gain.gain.setValueAtTime(0.0001, at);
    gain.gain.exponentialRampToValueAtTime(vol, at + 0.004);
    gain.gain.exponentialRampToValueAtTime(0.0001, at + dur);
    osc.connect(gain).connect(this.out!);
    osc.start(at);
    osc.stop(at + dur + 0.02);
  }

  /**
   * @param height altura de la pieza en placas: más arriba, un poco más agudo (sensación de
   *   progreso). @param size studs de la huella: las piezas grandes suenan más llenas.
   */
  play(kind: BrickSfx, height = 0, size = 2) {
    if (this.muted || !this.ctx || this.ctx.state !== "running") return;
    const t = this.ctx.currentTime;
    const vary = 1 + (Math.random() * 2 - 1) * 0.07;
    const up = 1 + Math.min(height, 60) * 0.004;
    const body = Math.min(1, 0.55 + size * 0.05);
    switch (kind) {
      case "place":
        this.tick(t, 3200 * vary * up, 0.012, 0.9);
        this.tick(t + 0.018, 2400 * vary * up, 0.01, 0.45);
        this.thump(t, 150 * vary, 0.045, 0.6 * body);
        break;
      case "pick":
        this.tick(t, 4200 * vary, 0.008, 0.35);
        break;
      case "rotate":
        this.tick(t, 2800 * vary, 0.008, 0.3);
        this.tick(t + 0.03, 3400 * vary, 0.008, 0.25);
        break;
      case "invalid":
        this.thump(t, 140, 0.16, 0.5, 95);
        break;
      case "remove":
        this.tick(t, 1800 * vary, 0.02, 0.5);
        this.thump(t, 220, 0.06, 0.35, 330);
        break;
      case "undo":
        this.thump(t, 520, 0.09, 0.25, 260);
        this.tick(t + 0.02, 2000, 0.03, 0.2);
        break;
    }
  }
}

let instance: BrickSound | null = null;

export function brickSound(): BrickSound {
  if (!instance) instance = new BrickSound();
  return instance;
}

/** Vibración corta al encajar donde existe (Android). iOS Safari no la tiene: nunca es el único aviso. */
export function haptic(ms = 10) {
  if (typeof navigator !== "undefined" && "vibrate" in navigator) navigator.vibrate(ms);
}
