// Conexión del constructor con su equipo (investigación, 7.8). Fuera de React, como el motor:
// 1. Cada cambio propio ya se ve en el celular (optimista) y se junta en un lote cada 200 ms.
// 2. El servidor valida el lote, le pone `seq` y lo reparte por el canal del equipo.
// 3. Los lotes se aplican en orden de `seq`; los propios llegan de eco y se saltan.
// 4. Si algo no cuadra (un rechazo, un choque, un lote perdido) se pide la foto completa y se
//    vuelven a aplicar encima los cambios propios que todavía no salieron.

import * as Ably from "ably";
import type { Op } from "@/lib/bricks/ops";
import { sessionChannel, teamChannel } from "@/lib/bricks/channels";
import { SeqQueue } from "@/lib/bricks/sync";
import type { Brick } from "@/lib/bricks/world";
import type { BuilderEngine } from "../builder/engine";

const FLUSH_MS = 200;
const LOBBY_POLL_MS = 5000;

export type TeamStatus = "lobby" | "building" | "finished";

export interface TeamClock {
  status: TeamStatus;
  /** Desde aquí corren los turnos del Relevo y las rondas de Teléfono Roto. */
  startedMs: number | null;
  endsMs: number | null;
  /** Diferencia entre el reloj del servidor y el del celular. */
  offset: number;
}

export interface TeamMember {
  nickname: string;
  slot: number;
  placed: number;
}

export interface TeamSnapshot {
  session: { id: number; status: TeamStatus; startedMs: number | null; endsMs: number | null; serverNow: number };
  team: { id: number; seq: number; bricks: Brick[]; members: TeamMember[] };
  me: { tag: string };
}

interface Callbacks {
  onClock: (clock: TeamClock) => void;
  onMembers: (members: TeamMember[]) => void;
  onConnection: (state: Ably.ConnectionState) => void;
  /** La sesión ya no reconoce a este celular (salió o la sesión se borró). */
  onLost: (message: string) => void;
}

const REJECTION: Record<string, string> = {
  choque: "Alguien de tu equipo puso una pieza ahí primero",
  turno: "Se acabó tu turno: esa pieza no alcanzó a entrar",
  rol: "En esta ronda te toca describir: construye tu pareja",
  parcela: "Esa parte es de otra persona: la pieza tiene que tocar tu franja",
  presupuesto: "Tu equipo ya usó todas sus piezas",
  fuera: "Esa pieza queda fuera de la base",
  invalida: "No pudimos mandar esa pieza",
};

export class TeamSync {
  private engine: BuilderEngine;
  private cb: Callbacks;
  private sessionId: number;
  private teamId: number;
  private tag: string;
  private queue: SeqQueue;
  private outbox: Op[] = [];
  private inFlight = false;
  private needResync = false;
  private resyncing = false;
  /** Lo que llega mientras se trae la foto: se aplica después, si es más nuevo que ella. */
  private held: { seq: number; mine: boolean; ops: Op[] }[] = [];
  private realtime: Ably.Realtime | null = null;
  private timer: ReturnType<typeof setInterval> | null = null;
  private closed = false;
  private status: TeamStatus;
  private lastPoll = Date.now();

  constructor(engine: BuilderEngine, snap: TeamSnapshot, cb: Callbacks) {
    this.engine = engine;
    this.cb = cb;
    this.sessionId = snap.session.id;
    this.teamId = snap.team.id;
    this.tag = snap.me.tag;
    this.queue = new SeqQueue(snap.team.seq);
    this.status = snap.session.status;
  }

  /** El motor llama esto con cada cambio propio ya aplicado. */
  local = (op: Op) => {
    this.outbox.push(op);
  };

  start() {
    this.timer = setInterval(() => this.tick(), FLUSH_MS);
    const realtime = new Ably.Realtime({ authUrl: "/api/bricks/token", authMethod: "GET" });
    this.realtime = realtime;
    realtime.connection.on((change) => this.cb.onConnection(change.current));
    const session = realtime.channels.get(sessionChannel(this.sessionId));
    const team = realtime.channels.get(teamChannel(this.sessionId, this.teamId));
    // Un corte que Ably no pudo recuperar: lo perdido se trae de la base.
    team.on("attached", (change) => {
      if (!change.resumed) this.requestResync();
    });
    // Suscribirse es lo que conecta el canal: así no queda un hueco entre conectar y escuchar
    // por donde se pierda un aviso.
    Promise.all([
      session.subscribe("status", (msg) => {
        const d = msg.data as { status: TeamStatus; startedMs: number | null; endsMs: number | null; serverNow: number };
        this.clock({ status: d.status, startedMs: d.startedMs, endsMs: d.endsMs, offset: d.serverNow - Date.now() });
        // Al cerrar se trae la foto final: piezas y créditos de cada uno, ya sin nada en vuelo.
        if (d.status === "finished") this.requestResync();
      }),
      team.subscribe("members", (msg) => this.cb.onMembers((msg.data as { members: TeamMember[] }).members)),
      team.subscribe("ops", (msg) => {
        const d = msg.data as { seq: number; ops: Op[]; by: string };
        this.receive({ seq: d.seq, mine: d.by === this.tag, ops: d.ops });
      }),
    ]).catch(() => {
      // Solo falla por close() al desmontar; los cortes de red los reintenta Ably.
    });
  }

  stop() {
    this.closed = true;
    if (this.timer) clearInterval(this.timer);
    this.realtime?.close();
  }

  private receive(batch: { seq: number; mine: boolean; ops: Op[] }) {
    if (this.resyncing) {
      this.held.push(batch);
      return;
    }
    for (const b of this.queue.push(batch, Date.now())) {
      if (b.mine) continue;
      if (!this.engine.applyRemote(b.ops)) {
        this.requestResync();
        return;
      }
    }
  }

  private clock(c: TeamClock) {
    this.status = c.status;
    this.cb.onClock(c);
  }

  private tick() {
    if (this.queue.stalled(Date.now())) this.requestResync();
    // Red de seguridad del lobby: si el aviso de "empezar" se perdió (celular bloqueado, red lenta),
    // se pregunta cada pocos segundos. Mientras construyen, un rechazo ya trae la foto.
    if (this.status === "lobby" && Date.now() - this.lastPoll > LOBBY_POLL_MS) {
      this.lastPoll = Date.now();
      this.requestResync();
    }
    if (this.needResync && !this.inFlight) {
      void this.resync();
      return;
    }
    if (this.inFlight || this.resyncing || this.outbox.length === 0) return;
    void this.flush();
  }

  private requestResync() {
    this.needResync = true;
  }

  private async flush() {
    const ops = this.outbox.splice(0, 24);
    this.inFlight = true;
    try {
      const res = await fetch("/api/bricks/ops", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ops }) });
      const body = (await res.json().catch(() => ({}))) as { results?: (string | null)[]; seq?: number | null; error?: string };
      if (res.status === 401) return this.cb.onLost(body.error ?? "Tu sesión terminó.");
      if (!res.ok) {
        this.engine.notify(body.error ?? "No pudimos mandar tus piezas");
        this.needResync = true;
        return;
      }
      if (body.seq) this.receive({ seq: body.seq, mine: true, ops: [] });
      const rejected = (body.results ?? []).find((r) => r !== null);
      if (rejected) {
        // Lo rechazado se deshace trayendo la foto del servidor, que es la verdad del equipo.
        this.engine.notify(REJECTION[rejected] ?? REJECTION.invalida);
        this.needResync = true;
      }
    } catch {
      // Sin red: lo que no salió vuelve al principio de la fila y se reintenta.
      this.outbox.unshift(...ops);
    } finally {
      this.inFlight = false;
    }
  }

  private async resync() {
    this.needResync = false;
    this.resyncing = true;
    try {
      const res = await fetch("/api/bricks/me", { cache: "no-store" });
      if (res.status === 401) return this.cb.onLost("Tu sesión terminó.");
      if (!res.ok) {
        this.needResync = true;
        return;
      }
      const snap = (await res.json()) as TeamSnapshot;
      this.engine.replaceWorld(snap.team.bricks);
      // Lo propio que aún no salió se vuelve a poner encima; si ya no cabe, se descarta.
      const keep: Op[] = [];
      for (const op of this.outbox) if (this.engine.applyRemote([op])) keep.push(op);
      this.outbox = keep;
      this.queue.reset(snap.team.seq);
      this.resyncing = false;
      const held = this.held.splice(0);
      for (const b of held) this.receive(b);
      this.cb.onMembers(snap.team.members);
      this.clock({
        status: snap.session.status,
        startedMs: snap.session.startedMs,
        endsMs: snap.session.endsMs,
        offset: snap.session.serverNow - Date.now(),
      });
    } catch {
      this.needResync = true;
    } finally {
      this.resyncing = false;
    }
  }
}
