import { applyOps } from "@/lib/brick-session";
import { brickPlayerId } from "@/lib/brick-http";
import { fail, json, readJson, sameOrigin } from "@/lib/live-http";

/** Un lote de operaciones del constructor (cada ~200 ms mientras alguien construye). */
export async function POST(request: Request) {
  if (!sameOrigin(request)) return fail("Origen no permitido.", 403);
  const playerId = await brickPlayerId();
  if (!playerId) return fail("No estás en ninguna sesión.", 401);
  const body = await readJson(request);
  const res = await applyOps(playerId, body.ops);
  return res.ok ? json({ results: res.results, seq: res.seq }) : fail(res.error, res.status);
}
