"use client";

// Sonido del proyector, sintetizado con Web Audio: sin archivos, sin licencias y sin
// peso de descarga. Todo suena desde el proyector, nunca desde los celulares.
// Diseño según docs/investigacion-ux-kahoot.md (sección 3): música de lobby a 120 BPM,
// música de pregunta con tensión creciente al final, pops con tono variable, gong,
// tic ascendente y fanfarria.

type Prefs = { music: boolean; effects: boolean; volume: number };
const PREFS_KEY = "antidoto-live-sound";
const BPM = 120;
const BEAT = 60 / BPM;

// Pentatónica de Do: nada suena "mal" aunque se combine al azar.
const SCALE = [261.63, 293.66, 329.63, 392.0, 440.0, 523.25, 587.33, 659.25];

function loadPrefs(): Prefs {
  try {
    const raw = localStorage.getItem(PREFS_KEY);
    if (raw) return { music: true, effects: true, volume: 0.7, ...JSON.parse(raw) };
  } catch {
    // Sin almacenamiento (modo privado): valores por defecto.
  }
  return { music: true, effects: true, volume: 0.7 };
}

class LiveSound {
  private ctx: AudioContext | null = null;
  private master!: GainNode;
  private musicBus!: GainNode;
  private sfxBus!: GainNode;
  private scheduler: ReturnType<typeof setInterval> | null = null;
  private nextNoteAt = 0;
  private step = 0;
  private track: "lobby" | "question" | null = null;
  private questionEndsAt = 0; // en tiempo del AudioContext
  private lastAnswerSound = 0;
  prefs: Prefs = { music: true, effects: true, volume: 0.7 };
  private listeners = new Set<() => void>();

  constructor() {
    if (typeof window !== "undefined") this.prefs = loadPrefs();
  }

  /** El navegador exige un gesto del usuario antes de sonar: llamarlo en un clic. */
  unlock() {
    if (!this.ctx) {
      const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!Ctx) return;
      this.ctx = new Ctx();
      this.master = this.ctx.createGain();
      this.musicBus = this.ctx.createGain();
      this.sfxBus = this.ctx.createGain();
      this.musicBus.connect(this.master);
      this.sfxBus.connect(this.master);
      this.master.connect(this.ctx.destination);
      this.applyPrefs();
    }
    void this.ctx.resume().then(() => this.emit());
  }

  get ready() {
    return this.ctx?.state === "running";
  }

  subscribe(fn: () => void) {
    this.listeners.add(fn);
    return () => void this.listeners.delete(fn);
  }

  private emit() {
    this.listeners.forEach((fn) => fn());
  }

  setPrefs(patch: Partial<Prefs>) {
    this.prefs = { ...this.prefs, ...patch };
    try {
      localStorage.setItem(PREFS_KEY, JSON.stringify(this.prefs));
    } catch {
      // Se ignora: la preferencia solo dura la sesión.
    }
    this.applyPrefs();
    this.emit();
  }

  private applyPrefs() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this.master.gain.setTargetAtTime(this.prefs.volume, t, 0.05);
    this.musicBus.gain.setTargetAtTime(this.prefs.music ? 0.35 : 0, t, 0.1);
    // Efectos de interfaz más bajos que la música de fondo (ver 3.3).
    this.sfxBus.gain.setTargetAtTime(this.prefs.effects ? 0.6 : 0, t, 0.05);
  }

  // --- Primitivas --------------------------------------------------------------

  private tone(freq: number, at: number, dur: number, opts: { type?: OscillatorType; gain?: number; bus?: GainNode; slideTo?: number } = {}) {
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = opts.type ?? "sine";
    osc.frequency.setValueAtTime(freq, at);
    if (opts.slideTo) osc.frequency.exponentialRampToValueAtTime(opts.slideTo, at + dur);
    const peak = opts.gain ?? 0.3;
    g.gain.setValueAtTime(0.0001, at);
    g.gain.exponentialRampToValueAtTime(peak, at + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
    osc.connect(g).connect(opts.bus ?? this.sfxBus);
    osc.start(at);
    osc.stop(at + dur + 0.05);
  }

  private noise(at: number, dur: number, opts: { from: number; to: number; gain?: number; bus?: GainNode }) {
    if (!this.ctx) return;
    const buffer = this.ctx.createBuffer(1, Math.ceil(this.ctx.sampleRate * dur), this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    const src = this.ctx.createBufferSource();
    src.buffer = buffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.setValueAtTime(opts.from, at);
    filter.frequency.exponentialRampToValueAtTime(opts.to, at + dur);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(opts.gain ?? 0.25, at);
    g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
    src.connect(filter).connect(g).connect(opts.bus ?? this.sfxBus);
    src.start(at);
  }

  private now() {
    return this.ctx?.currentTime ?? 0;
  }

  /** Pequeña variación de tono para que 30 sonidos seguidos no suenen robóticos. */
  private jitter() {
    return 0.95 + Math.random() * 0.1;
  }

  // --- Efectos -------------------------------------------------------------------

  /** Un jugador entró al lobby. `n` sube el tono con cada uno (hasta la octava). */
  pop(n = 0, delay = 0) {
    const f = SCALE[n % SCALE.length] * 2 * this.jitter();
    this.tone(f, this.now() + delay, 0.12, { gain: 0.25, slideTo: f * 1.5 });
  }

  /**
   * Nube de palabras: un pop por palabra, con el tono subiendo, y un ping más largo
   * para la más votada, que aparece al final. Los tiempos coinciden con la animación.
   */
  wordCloud(count: number, start: number, step: number, topAt: number) {
    const t = this.now();
    for (let i = 0; i < count - 1; i++) {
      // Reparte la subida en dos octavas, sean 3 palabras o 50.
      const degree = Math.floor((i / Math.max(1, count - 2)) * (SCALE.length * 2 - 1));
      const f = SCALE[degree % SCALE.length] * (degree >= SCALE.length ? 4 : 2) * this.jitter();
      this.tone(f, t + start + i * step, 0.1, { gain: 0.18, slideTo: f * 1.4 });
    }
    if (count > 0) {
      this.tone(1567.98, t + topAt, 0.9, { type: "triangle", gain: 0.22 });
      this.tone(2093, t + topAt + 0.06, 0.7, { gain: 0.12 });
    }
  }

  /** Llegó una respuesta. Con tope de uno cada 60 ms: 50 respuestas en un segundo no saturan. */
  answer() {
    const t = this.now();
    if (t - this.lastAnswerSound < 0.06) return;
    this.lastAnswerSound = t;
    this.tone(1400 * this.jitter(), t, 0.05, { type: "triangle", gain: 0.12 });
  }

  countdownBeep(secondsLeft: number) {
    const f = secondsLeft <= 1 ? 880 : 660;
    this.tone(f, this.now(), 0.18, { type: "square", gain: 0.12 });
  }

  whoosh() {
    this.noise(this.now(), 0.45, { from: 400, to: 3500, gain: 0.2 });
  }

  /** Se acabó el tiempo (o respondieron todos): golpe grave tipo gong. */
  gong() {
    const t = this.now();
    this.tone(110, t, 1.8, { gain: 0.45, slideTo: 98 });
    // Parciales altos: son los que se oyen en parlantes chicos.
    this.tone(220, t, 1.4, { gain: 0.28 });
    this.tone(331, t, 1.0, { gain: 0.16 });
    this.tone(442, t, 0.7, { type: "triangle", gain: 0.08 });
  }

  /** Tic de tono ascendente mientras crecen las barras de resultado. */
  risingTicks(count = 10, span = 0.8) {
    const t = this.now();
    for (let i = 0; i < count; i++) {
      this.tone(500 + i * 90, t + (i * span) / count, 0.05, { type: "square", gain: 0.06 });
    }
  }

  /** Puntos sumando en el ranking: tics suaves y rápidos que suben durante `dur` s. */
  points(dur: number, delay = 0) {
    const t = this.now() + delay;
    const count = Math.max(1, Math.round(dur / 0.05));
    for (let i = 0; i < count; i++) {
      this.tone(900 + (i / count) * 900, t + i * 0.05, 0.03, { type: "triangle", gain: 0.05 });
    }
  }

  /** Se revela la correcta: acorde mayor arpegiado. */
  reveal(delay = 0) {
    const t = this.now() + delay;
    [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => this.tone(f, t + i * 0.07, 0.6, { type: "triangle", gain: 0.18 }));
  }

  /** Fanfarria del ganador. */
  fanfare(delay = 0) {
    const t = this.now() + delay;
    const notes = [392, 523.25, 659.25, 783.99, 659.25, 783.99, 1046.5];
    notes.forEach((f, i) => this.tone(f, t + i * 0.14, i === notes.length - 1 ? 1.2 : 0.2, { type: "sawtooth", gain: 0.1 }));
    this.noise(t + 0.98, 1.5, { from: 6000, to: 3000, gain: 0.08 });
  }

  /** Aparece una columna del podio (bronce, plata). */
  podiumStep(place: number, delay = 0) {
    const f = place === 3 ? 392 : 523.25;
    this.tone(f, this.now() + delay, 0.4, { type: "triangle", gain: 0.2 });
  }

  // --- Música ---------------------------------------------------------------------

  /** Loop del lobby, 120 BPM, "ligeramente repetitivo" (ver 3.1). */
  playLobby() {
    this.startTrack("lobby");
  }

  /**
   * Música de pregunta: pulso tranquilo que se acelera y suma una capa de tensión en
   * los últimos 5 s, con el clímax en el final del tiempo (ver 3.2).
   */
  playQuestion(msLeft: number, startsInMs = 0) {
    if (!this.ctx) return;
    this.questionEndsAt = this.now() + msLeft / 1000;
    // Durante la entrada ("¡Prepárate!") solo suenan los pitidos 3-2-1: la música
    // arranca cuando aparecen las opciones.
    this.startTrack("question", Math.max(0, startsInMs) / 1000);
  }

  stopMusic() {
    if (this.scheduler) clearInterval(this.scheduler);
    this.scheduler = null;
    this.track = null;
  }

  private startTrack(track: "lobby" | "question", delay = 0) {
    if (!this.ctx) return;
    if (this.track === track && this.scheduler) return;
    this.stopMusic();
    this.track = track;
    this.step = 0;
    this.nextNoteAt = this.now() + 0.05 + delay;
    // Planificador con margen: se agendan las notas de los próximos 150 ms.
    this.scheduler = setInterval(() => this.schedule(), 25);
  }

  private schedule() {
    if (!this.ctx || !this.track) return;
    while (this.nextNoteAt < this.now() + 0.15) {
      if (this.track === "lobby") this.lobbyStep(this.step, this.nextNoteAt);
      else this.questionStep(this.step, this.nextNoteAt);
      this.nextNoteAt += this.track === "question" && this.questionEndsAt - this.nextNoteAt < 5 ? BEAT / 4 : BEAT / 2;
      this.step++;
    }
  }

  private lobbyStep(step: number, at: number) {
    const bar = Math.floor(step / 8) % 4;
    const bass = [130.81, 110.0, 146.83, 98.0][bar];
    if (step % 2 === 0) this.tone(bass, at, BEAT * 0.9, { type: "triangle", gain: 0.35, bus: this.musicBus });
    const arp = [0, 2, 4, 2, 5, 4, 2, 1];
    const f = SCALE[(arp[step % 8] + bar) % SCALE.length];
    this.tone(f, at, BEAT * 0.4, { type: "square", gain: 0.06, bus: this.musicBus });
    if (step % 4 === 2) this.noise(at, 0.05, { from: 7000, to: 5000, gain: 0.05, bus: this.musicBus });
  }

  private questionStep(step: number, at: number) {
    const left = this.questionEndsAt - at;
    if (left <= 0) return this.stopMusic();
    const tense = left < 5;
    // Pulso grave constante. Parlantes de notebook y proyector casi no dan nada bajo
    // ~150 Hz: la onda triangular y la octava de arriba hacen que el pulso se oiga igual.
    if (step % 2 === 0) {
      const f = tense ? 98 : 110;
      this.tone(f, at, 0.25, { type: "triangle", gain: 0.4, bus: this.musicBus });
      this.tone(f * 2, at, 0.18, { type: "sine", gain: 0.14, bus: this.musicBus });
    }
    // Motivo que sube de registro a medida que se acaba el tiempo.
    const lift = Math.min(4, Math.floor((1 - Math.min(1, left / 20)) * 5));
    const f = SCALE[(step + lift) % SCALE.length] * (tense ? 2 : 1);
    if (step % 2 === 1 || tense) this.tone(f, at, 0.1, { type: "square", gain: tense ? 0.08 : 0.05, bus: this.musicBus });
    // Capa de tensión: tic agudo en los últimos 5 s.
    if (tense) this.noise(at, 0.03, { from: 9000, to: 7000, gain: 0.06, bus: this.musicBus });
  }
}

let instance: LiveSound | null = null;

/** Un solo motor de audio por página. */
export function liveSound(): LiveSound {
  if (!instance) instance = new LiveSound();
  return instance;
}

export type { LiveSound, Prefs as SoundPrefs };
