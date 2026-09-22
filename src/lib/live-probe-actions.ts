"use server";

// Fase 0 (prueba técnica de tiempo real). Se borra cuando exista el módulo en vivo.

import { createHmac, timingSafeEqual } from "node:crypto";
import { currentUser } from "./auth";
import { publish } from "./realtime";
import { clientIp, rateLimit } from "./rate-limit";
import { PROBE_CHANNEL, type ProbeAnswer, type ProbePing } from "./live-probe";

function sign(value: string): string {
  return createHmac("sha256", process.env.ABLY_API_KEY ?? "").update(value).digest("hex").slice(0, 32);
}

function verify(id: string): number | null {
  const [serverAt, sig] = id.split(".");
  if (!serverAt || !sig) return null;
  const expected = Buffer.from(sign(serverAt));
  const given = Buffer.from(sig);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null;
  return Number(serverAt);
}

export async function sendProbePing(n: number): Promise<void> {
  if (!(await currentUser())) throw new Error("No autorizado");
  const serverAt = Date.now();
  const ping: ProbePing = { id: `${serverAt}.${sign(String(serverAt))}`, n, serverAt };
  await publish(PROBE_CHANNEL, "ping", ping);
}

export async function answerProbe(pingId: string, pingN: number, nickname: string): Promise<{ error?: string; responseMs?: number }> {
  // El reloj se toma antes de cualquier I/O para no inflar el tiempo de respuesta.
  const receivedAt = Date.now();

  const serverAt = verify(pingId);
  if (serverAt === null) return { error: "Ping inválido" };

  const ip = await clientIp();
  if (!(await rateLimit(`probe:${ip}`, 60, 60))) return { error: "Demasiadas respuestas" };

  const answer: ProbeAnswer = {
    pingN,
    nickname: nickname.trim().slice(0, 24) || "Anónimo",
    responseMs: receivedAt - serverAt,
  };
  await publish(PROBE_CHANNEL, "answer", answer);
  return { responseMs: answer.responseMs };
}
