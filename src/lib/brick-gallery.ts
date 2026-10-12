import "server-only";
import { all, one, run } from "./db";
import type { AdminUser } from "./auth";
import { audit } from "./admin-guard";
import { publishBestEffort, publishReliable } from "./realtime";
import { imageMime, MAX_IMAGE_BYTES } from "./bricks/challenges";
import { GALLERY_CATEGORIES, galleryOrder, MIN_GALLERY_WORKS, tally, voteRejection, type CategoryResult, type GalleryStatus } from "./bricks/gallery";
import { teamIdentity } from "./bricks/team";
import { countMessages, getPlayer, getSession, getSessionForHost, hostChannel, sessionChannel, teamChannel, teamsOf, type Result, type TeamView } from "./brick-session";

// Galería de Cierre de la construcción en equipo (fase 7 de docs/plan-construccion-3d.md). Después
// de construir, el anfitrión puede abrir una votación por categorías: las obras van numeradas y sin
// nombre, nadie vota por la suya y al final solo se muestra quién ganó cada categoría. Es opcional:
// en un evento corto se puede cerrar con el recorrido y nada más.

const err = (error: string, status = 400): { ok: false; error: string; status: number } => ({ ok: false, error, status });

interface GalleryRow {
  status: GalleryStatus;
}

async function galleryStatus(sessionId: number): Promise<GalleryStatus | null> {
  const row = await one<GalleryRow>("SELECT status FROM brick_galleries WHERE session_id = ?", [sessionId]);
  return row?.status ?? null;
}

async function hiddenTeams(sessionId: number): Promise<number[]> {
  const rows = await all<{ team_id: number }>(
    "SELECT h.team_id FROM brick_team_hidden h JOIN brick_teams t ON t.id = h.team_id WHERE t.session_id = ?",
    [sessionId],
  );
  return rows.map((r) => Number(r.team_id));
}

async function photoTeams(sessionId: number): Promise<number[]> {
  const rows = await all<{ team_id: number }>(
    "SELECT p.team_id FROM brick_team_photos p JOIN brick_teams t ON t.id = p.team_id WHERE t.session_id = ?",
    [sessionId],
  );
  return rows.map((r) => Number(r.team_id));
}

/** Obras que entran a la galería, en su orden: con alguna pieza y sin que el equipo se haya retirado. */
function shownTeams(sessionId: number, teams: TeamView[], hidden: number[]): number[] {
  const ids = teams.filter((t) => t.bricks.length > 0 && t.members.length > 0 && !hidden.includes(t.id)).map((t) => t.id);
  return galleryOrder(ids, sessionId);
}

async function votesOf(sessionId: number) {
  const rows = await all<{ player_id: string; category: string; team_id: number }>(
    "SELECT player_id, category, team_id FROM brick_votes WHERE session_id = ?",
    [sessionId],
  );
  return rows.map((r) => ({ playerId: r.player_id, category: r.category, teamId: Number(r.team_id) }));
}

export interface Winner {
  teamId: number;
  number: number;
  name: string;
  color: string;
  members: string[];
}

export interface CategoryWinners {
  key: string;
  title: string;
  hint: string;
  votes: number;
  winners: Winner[];
}

function withNames(results: CategoryResult[], teams: TeamView[], order: number[]): CategoryWinners[] {
  return results.map((r) => ({
    key: r.category.key,
    title: r.category.title,
    hint: r.category.hint,
    votes: r.votes,
    winners: r.winners.map((id) => {
      const t = teams.find((x) => x.id === id)!;
      return { teamId: id, number: order.indexOf(id) + 1, name: t.name, color: t.color, members: t.members.map((m) => m.nickname) };
    }),
  }));
}

// --- Proyector -------------------------------------------------------------------------------

export interface HostGallery {
  status: GalleryStatus | null;
  /** Equipos en la galería, en el orden en que se numeran. */
  order: number[];
  hidden: number[];
  photos: number[];
  /** Personas que ya votaron en al menos una categoría. */
  voters: number;
  players: number;
  /** Solo al mostrar resultados: durante la votación ni el proyector adelanta nada. */
  results: CategoryWinners[] | null;
}

export async function hostGallery(sessionId: number, teams: TeamView[]): Promise<HostGallery> {
  const [status, hidden, photos, votes] = await Promise.all([galleryStatus(sessionId), hiddenTeams(sessionId), photoTeams(sessionId), votesOf(sessionId)]);
  const order = shownTeams(sessionId, teams, hidden);
  return {
    status,
    order,
    hidden,
    photos,
    voters: new Set(votes.map((v) => v.playerId)).size,
    players: teams.reduce((n, t) => n + t.members.length, 0),
    results: status === "results" ? withNames(tally(votes, order), teams, order) : null,
  };
}

/** El proyector sube la foto de cada obra al terminar: es el único que tiene todas en su escena. */
export async function saveTeamPhoto(id: number, user: AdminUser, teamId: number, file: Blob | null): Promise<Result> {
  const s = await getSessionForHost(id, user);
  if (!s) return err("No encontramos esa sesión.", 404);
  if (s.status !== "finished") return err("Las fotos se toman al terminar.", 409);
  const team = await one<{ id: number }>("SELECT id FROM brick_teams WHERE id = ? AND session_id = ?", [teamId, s.id]);
  if (!team) return err("Ese equipo no es de esta sesión.", 404);
  if (!file || file.size === 0) return err("No llegó la foto.");
  if (file.size > MAX_IMAGE_BYTES) return err("La foto pesa demasiado.", 413);
  const image = new Uint8Array(await file.arrayBuffer());
  const mime = imageMime(image);
  if (!mime) return err("La foto no es válida.");
  await run(
    `INSERT INTO brick_team_photos (team_id, image, image_mime) VALUES (?, ?, ?)
     ON CONFLICT(team_id) DO UPDATE SET image = excluded.image, image_mime = excluded.image_mime, created_at = datetime('now')`,
    [teamId, image, mime],
  );
  return { ok: true };
}

/** Abrir la votación y, después, mostrar los resultados. */
export async function galleryCommand(id: number, user: AdminUser, action: string): Promise<Result> {
  const s = await getSessionForHost(id, user);
  if (!s) return err("No encontramos esa sesión.", 404);
  if (s.status !== "finished") return err("Primero hay que terminar de construir.", 409);
  if (action === "open") {
    const teams = await teamsOf(s.id);
    const order = shownTeams(s.id, teams, await hiddenTeams(s.id));
    if (order.length < MIN_GALLERY_WORKS) return err("Hacen falta al menos dos obras para votar.", 409);
    const res = await run("INSERT OR IGNORE INTO brick_galleries (session_id) VALUES (?)", [s.id]);
    if (res.rowsAffected === 1) {
      await audit(`Galería de la sesión en equipo ${s.pin} abierta.`, user, s.company_id);
      await publishGallery(s.id, "voting");
    }
    return { ok: true };
  }
  if (action === "reveal") {
    const res = await run("UPDATE brick_galleries SET status = 'results', revealed_at = datetime('now') WHERE session_id = ? AND status = 'voting'", [s.id]);
    if (res.rowsAffected === 1) await publishGallery(s.id, "results");
    return { ok: true };
  }
  return err("Acción desconocida.");
}

async function publishGallery(sessionId: number, status: GalleryStatus) {
  await publishReliable(sessionChannel(sessionId), "gallery", { status });
  const players = await one<{ n: number }>("SELECT COUNT(*) AS n FROM brick_players WHERE session_id = ?", [sessionId]);
  await countMessages(sessionId, Number(players?.n ?? 0) + 1);
}

// --- Celular ---------------------------------------------------------------------------------

export interface PlayerGallery {
  status: GalleryStatus | null;
  /** Obras para votar, numeradas; la propia viene marcada y no se puede elegir. */
  entries: { teamId: number; number: number; mine: boolean; hasPhoto: boolean }[];
  categories: { key: string; title: string; hint: string }[];
  votes: Record<string, number>;
  /** Si el equipo de esta persona pidió no mostrar su obra. */
  hidden: boolean;
  /** Todavía se puede retirar la obra (la galería no ha abierto). */
  canHide: boolean;
  hasPhoto: boolean;
  results: CategoryWinners[] | null;
}

export async function playerGallery(playerId: string): Promise<Result<{ gallery: PlayerGallery }>> {
  const p = await getPlayer(playerId);
  if (!p) return err("No estás en ninguna sesión.", 401);
  const s = await getSession(p.session_id);
  if (!s) return err("La sesión ya no existe.", 404);
  const [teams, status, hidden, photos, votes] = await Promise.all([
    teamsOf(s.id),
    galleryStatus(s.id),
    hiddenTeams(s.id),
    photoTeams(s.id),
    votesOf(s.id),
  ]);
  const order = shownTeams(s.id, teams, hidden);
  const mine = votes.filter((v) => v.playerId === p.id);
  return {
    ok: true,
    gallery: {
      status,
      // Antes de abrir no se reparte nada: las obras se conocen todas a la vez.
      entries: status === null ? [] : order.map((teamId, n) => ({ teamId, number: n + 1, mine: teamId === p.team_id, hasPhoto: photos.includes(teamId) })),
      categories: GALLERY_CATEGORIES.map((c) => ({ ...c })),
      votes: Object.fromEntries(mine.map((v) => [v.category, v.teamId])),
      hidden: hidden.includes(p.team_id),
      canHide: s.status === "finished" && status === null,
      hasPhoto: photos.includes(p.team_id),
      results: status === "results" ? withNames(tally(votes, order), teams, order) : null,
    },
  };
}

export async function castVote(playerId: string, category: string, teamId: number): Promise<Result> {
  const p = await getPlayer(playerId);
  if (!p) return err("No estás en ninguna sesión.", 401);
  const [teams, status, hidden] = await Promise.all([teamsOf(p.session_id), galleryStatus(p.session_id), hiddenTeams(p.session_id)]);
  const why = voteRejection({ status, category, teamId, shown: shownTeams(p.session_id, teams, hidden), ownTeam: p.team_id });
  if (why) return err(why, 409);
  await run(
    `INSERT INTO brick_votes (session_id, player_id, category, team_id) VALUES (?, ?, ?, ?)
     ON CONFLICT(player_id, category) DO UPDATE SET team_id = excluded.team_id, created_at = datetime('now')`,
    [p.session_id, p.id, category, teamId],
  );
  // El proyector solo muestra cuánta gente votó: un aviso perdido se repone con el siguiente.
  await publishBestEffort(hostChannel(p.session_id), "votes", {});
  await countMessages(p.session_id, 1);
  return { ok: true };
}

/** "No quiero mostrar la nuestra": basta una persona del equipo, y se puede deshacer hasta que abra la galería. */
export async function setTeamHidden(playerId: string, hide: boolean): Promise<Result> {
  const p = await getPlayer(playerId);
  if (!p) return err("No estás en ninguna sesión.", 401);
  const s = await getSession(p.session_id);
  if (!s) return err("La sesión ya no existe.", 404);
  if (s.status !== "finished") return err("Se decide al terminar de construir.", 409);
  if ((await galleryStatus(s.id)) !== null) return err("La galería ya abrió.", 409);
  if (hide) await run("INSERT OR IGNORE INTO brick_team_hidden (team_id) VALUES (?)", [p.team_id]);
  else await run("DELETE FROM brick_team_hidden WHERE team_id = ?", [p.team_id]);
  await publishBestEffort(teamChannel(s.id, p.team_id), "gallery", { hidden: hide });
  await publishBestEffort(hostChannel(s.id), "roster", { teamId: p.team_id });
  const members = await one<{ n: number }>("SELECT COUNT(*) AS n FROM brick_players WHERE team_id = ?", [p.team_id]);
  await countMessages(s.id, Number(members?.n ?? 0) + 1);
  return { ok: true };
}

/**
 * Foto de la obra de un equipo. La ven su equipo, el resto de la sesión una vez abierta la
 * galería (si el equipo no se retiró) y los admins con alcance sobre la sesión.
 */
export async function teamPhoto(teamId: number, viewer: { playerId: string | null; user: AdminUser | null }) {
  const row = await one<{ image: ArrayBuffer; image_mime: string; session_id: number; position: number }>(
    `SELECT p.image, p.image_mime, t.session_id, t.position
     FROM brick_team_photos p JOIN brick_teams t ON t.id = p.team_id WHERE p.team_id = ?`,
    [teamId],
  );
  if (!row) return null;
  const sessionId = Number(row.session_id);
  let allowed = viewer.user ? !!(await getSessionForHost(sessionId, viewer.user)) : false;
  if (!allowed && viewer.playerId) {
    const p = await getPlayer(viewer.playerId);
    if (p?.session_id === sessionId) {
      if (p.team_id === teamId) allowed = true;
      else allowed = (await galleryStatus(sessionId)) !== null && !(await hiddenTeams(sessionId)).includes(teamId);
    }
  }
  if (!allowed) return null;
  return { body: new Uint8Array(row.image), mime: row.image_mime, name: teamIdentity(Number(row.position)).name };
}

// --- Reporte ---------------------------------------------------------------------------------

export interface SessionReport {
  teams: TeamView[];
  gallery: HostGallery;
  /** Votos por categoría, para el reporte: cuánta gente votó en cada una. */
  votesByCategory: Record<string, number>;
}

export async function sessionReport(id: number, user: AdminUser): Promise<SessionReport | null> {
  const s = await getSessionForHost(id, user);
  if (!s) return null;
  const teams = await teamsOf(s.id);
  const gallery = await hostGallery(s.id, teams);
  // El reporte muestra los ganadores aunque el anfitrión no haya llegado a revelarlos en la sala.
  const votes = await votesOf(s.id);
  if (gallery.status !== null && gallery.results === null) gallery.results = withNames(tally(votes, gallery.order), teams, gallery.order);
  const votesByCategory: Record<string, number> = {};
  for (const v of votes) votesByCategory[v.category] = (votesByCategory[v.category] ?? 0) + 1;
  return { teams, gallery, votesByCategory };
}
