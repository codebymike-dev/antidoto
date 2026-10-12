// Orden de las operaciones del equipo en el navegador (investigación, 7.8). El servidor numera
// cada lote con `seq`; por Ably los lotes pueden llegar desordenados y los propios llegan dos
// veces (la respuesta del POST y el eco del canal). Esta cola entrega cada seq una sola vez y en
// orden, y avisa cuando falta uno hace rato para pedir la foto completa al servidor.

import type { Op } from "./ops.ts";

export interface SeqBatch {
  seq: number;
  /** Lo mandó este mismo jugador: ya está aplicado en su mundo. */
  mine: boolean;
  ops: Op[];
}

export class SeqQueue {
  last: number;
  private pending = new Map<number, SeqBatch>();
  private gapSince: number | null = null;

  constructor(last: number) {
    this.last = last;
  }

  /** Recibe un lote y devuelve los que ya se pueden aplicar, en orden. */
  push(batch: SeqBatch, now: number): SeqBatch[] {
    if (batch.seq <= this.last) return [];
    // Si el mismo seq llega por las dos vías, gana la marca de "propio".
    const prev = this.pending.get(batch.seq);
    this.pending.set(batch.seq, prev ? { ...batch, mine: prev.mine || batch.mine } : batch);
    return this.drain(now);
  }

  /** Los lotes que ya se pueden aplicar, en orden (también los que esperaban tras un reset). */
  drain(now: number): SeqBatch[] {
    const out: SeqBatch[] = [];
    while (this.pending.has(this.last + 1)) {
      const next = this.pending.get(this.last + 1)!;
      this.pending.delete(this.last + 1);
      this.last++;
      out.push(next);
    }
    this.gapSince = this.pending.size === 0 ? null : (this.gapSince ?? now);
    return out;
  }

  /** Falta un lote desde hace más de `ms`: hay que resincronizar con la foto del servidor. */
  stalled(now: number, ms = 1500): boolean {
    return this.gapSince !== null && now - this.gapSince > ms;
  }

  /** Tras cargar la foto del servidor en `seq`, lo anterior sobra. */
  reset(seq: number) {
    this.last = seq;
    for (const k of [...this.pending.keys()]) if (k <= seq) this.pending.delete(k);
    this.gapSince = null;
  }
}
