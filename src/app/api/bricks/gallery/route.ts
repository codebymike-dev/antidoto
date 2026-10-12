import { castVote, playerGallery, setTeamHidden } from "@/lib/brick-gallery";
import { brickPlayerId } from "@/lib/brick-http";
import { fail, json, matchIdParam, readJson, sameOrigin } from "@/lib/live-http";

/** La galería vista desde el celular: obras numeradas, mis votos y, al final, los ganadores. */
export async function GET() {
  const playerId = await brickPlayerId();
  if (!playerId) return fail("No estás en ninguna sesión.", 401);
  const res = await playerGallery(playerId);
  return res.ok ? json(res.gallery) : fail(res.error, res.status);
}

/** Votar en una categoría, o retirar (y devolver) la obra del equipo antes de que abra la galería. */
export async function POST(request: Request) {
  if (!sameOrigin(request)) return fail("Origen no permitido.", 403);
  const playerId = await brickPlayerId();
  if (!playerId) return fail("No estás en ninguna sesión.", 401);
  const body = await readJson(request);
  if (body.action === "vote") {
    const teamId = matchIdParam(String(body.team ?? ""));
    if (!teamId) return fail("Elige una obra.");
    const res = await castVote(playerId, String(body.category ?? ""), teamId);
    return res.ok ? json({ ok: true }) : fail(res.error, res.status);
  }
  if (body.action === "hide" || body.action === "show") {
    const res = await setTeamHidden(playerId, body.action === "hide");
    return res.ok ? json({ ok: true }) : fail(res.error, res.status);
  }
  return fail("Acción desconocida.");
}
