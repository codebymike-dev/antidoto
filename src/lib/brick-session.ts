import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { after } from "next/server";
import { all, one, run } from "./db";
import type { AdminUser } from "./auth";
import { audit } from "./admin-guard";
import { generatePin, normalizeNickname } from "./live-engine";
import { publishBestEffort, publishReliable } from "./realtime";
import {
  applyTeamOp,
  canBuildPhone,
  freeSlot,
  getTeamMode,
  parcelFor,
  parseOp,
  phoneArea,
  phoneRound,
  pickTeam,
  relayTurn,
  teamBase,
  teamIdentity,
  type OpRejection,
  type Parcel,
  type TeamMode,
  type TeamPlay,
} from "./bricks/team";
import type { Op } from "./bricks/ops";
import { BrickWorld, type Brick } from "./bricks/world";
import { hostChannel, hostChannels, sessionChannel, teamChannel } from "./bricks/channels";

export { hostChannels, sessionChannel, teamChannel };

// Construcción por equipos en vivo (fase 6 de docs/plan-construccion-3d.md). Mismo patrón que el
// quiz en vivo (live-match.ts): el servidor es la autoridad y el único que publica por Ably; los
// celulares mandan lotes de operaciones por HTTP y reciben lo aceptado por el canal de su equipo.

export type Result<T = object> = ({ ok: true } & T) | { ok: false; error: string; status: number };
const err = (error: string, status = 400): { ok: false; error: string; status: number } => ({ ok: false, error, status });

/** El plan gratis de Ably admite 200 conexiones simultáneas, compartidas con el quiz en vivo. */
export const MAX_SESSION_PLAYERS = 100;
/** Una sesión abierta más de esto se da por abandonada y libera su PIN. */
const STALE_HOURS = 12;
/** Un lote que llega justo al sonar la alarma todavía cuenta (latencia del celular). */
const GRACE_MS = 2000;
/** Lotes por petición y operaciones por lote: un constructor manda 1 a 3 cada 200 ms. */
const MAX_OPS = 24;

export type BrickSessionStatus = "lobby" | "building" | "finished";

/** Marca pública de un jugador en el canal: se reconoce a sí mismo sin exponer el id de la cookie. */
export const playerTag = (playerId: string) => createHash("sha256").update(playerId).digest("hex").slice(0, 12);

interface SessionRow {
  id: number;
  mode: string;
  host_user_id: number | null;
  company_id: number | null;
  pin: string;
  status: BrickSessionStatus;
  team_size: number;
  time_limit: number;
  started_ms: number | null;
  ends_ms: number | null;
  ably_messages: number;
}

const SESSION_COLUMNS = "id, mode, host_user_id, company_id, pin, status, team_size, time_limit, started_ms, ends_ms, ably_messages";

function normalize(row: SessionRow): SessionRow {
  return {
    ...row,
    id: Number(row.id),
    company_id: row.company_id === null ? null : Number(row.company_id),
    team_size: Number(row.team_size),
    time_limit: Number(row.time_limit),
    started_ms: row.started_ms === null ? null : Number(row.started_ms),
    ends_ms: row.ends_ms === null ? null : Number(row.ends_ms),
    ably_messages: Number(row.ably_messages),
  };
}

async function getSession(id: number): Promise<SessionRow | null> {
  const row = await one<SessionRow>(`SELECT ${SESSION_COLUMNS} FROM brick_sessions WHERE id = ?`, [id]);
  return row ? normalize(row) : null;
}

/** El host ve sus sesiones; el admin de empresa, las de su empresa; el superadmin, todas. */
export async function getSessionForHost(id: number, user: AdminUser): Promise<SessionRow | null> {
  const s = await getSession(id);
  if (!s) return null;
  if (user.role === "super" || s.host_user_id === user.id || (s.company_id !== null && s.company_id === user.company_id)) return s;
  return null;
}

function modeOf(s: SessionRow): TeamMode {
  return getTeamMode(s.mode) ?? getTeamMode("obra-equipo")!;
}

// --- Lanzar ----------------------------------------------------------------------

export async function launchSession(user: AdminUser, input: { mode: string; teamSize: number; timeLimit: number }): Promise<Result<{ id: number }>> {
  const mode = getTeamMode(input.mode);
  if (!mode) return err("Ese modo no existe.");
  if (!mode.sizes.includes(input.teamSize)) return err("Elige uno de los tamaños de equipo propuestos.");
  if (!mode.times.includes(input.timeLimit)) return err("Elige una de las duraciones propuestas.");
  const companyId = user.role === "empresa" ? user.company_id : null;
  for (let attempt = 0; attempt < 8; attempt++) {
    const pin = generatePin();
    try {
      const res = await run(
        "INSERT INTO brick_sessions (mode, host_user_id, company_id, pin, team_size, time_limit) VALUES (?, ?, ?, ?, ?, ?)",
        [mode.key, user.id, companyId, pin, input.teamSize, input.timeLimit],
      );
      const id = Number(res.lastInsertRowid);
      await audit(`Sesión en equipo "${mode.title}" lanzada (PIN ${pin}).`, user, companyId);
      return { ok: true, id };
    } catch (e) {
      // El PIN chocó con otra sesión abierta: se prueba otro.
      if (!String(e).includes("UNIQUE")) throw e;
    }
  }
  return err("No se pudo generar un PIN libre. Vuelve a intentarlo.", 503);
}

// --- Fotos de estado -------------------------------------------------------------------

interface TeamRow {
  id: number;
  position: number;
  bricks: string;
  seq: number;
}

interface MemberRow {
  team_id: number;
  slot: number;
  nickname: string;
  placed: number;
}

export interface TeamView {
  id: number;
  position: number;
  name: string;
  color: string;
  seq: number;
  bricks: Brick[];
  members: { nickname: string; slot: number; placed: number }[];
}

export interface SessionView {
  id: number;
  mode: TeamMode["key"];
  pin: string;
  status: BrickSessionStatus;
  teamSize: number;
  timeLimit: number;
  base: number;
  maxPieces: number | null;
  play: TeamPlay;
  /** Consigna sorpresa de mitad de tiempo (Relevo). */
  twist: string | null;
  startedMs: number | null;
  endsMs: number | null;
  serverNow: number;
}

function sessionView(s: SessionRow): SessionView {
  const mode = modeOf(s);
  return {
    id: s.id,
    mode: mode.key,
    pin: s.pin,
    status: s.status,
    teamSize: s.team_size,
    timeLimit: s.time_limit,
    base: teamBase(mode, s.team_size),
    maxPieces: mode.maxPieces,
    play: mode.play,
    twist: mode.twist ?? null,
    startedMs: s.started_ms,
    endsMs: s.ends_ms,
    serverNow: Date.now(),
  };
}

const parseBricks = (json: string): Brick[] => {
  try {
    const v = JSON.parse(json);
    return Array.isArray(v) ? (v as Brick[]) : [];
  } catch {
    return [];
  }
};

async function teamsOf(sessionId: number): Promise<TeamView[]> {
  const [teams, members] = await Promise.all([
    all<TeamRow>("SELECT id, position, bricks, seq FROM brick_teams WHERE session_id = ? ORDER BY position", [sessionId]),
    all<MemberRow>("SELECT team_id, slot, nickname, placed FROM brick_players WHERE session_id = ? ORDER BY slot", [sessionId]),
  ]);
  return teams.map((t) => ({
    id: Number(t.id),
    position: Number(t.position),
    ...teamIdentity(Number(t.position)),
    seq: Number(t.seq),
    bricks: parseBricks(t.bricks),
    members: members.filter((m) => Number(m.team_id) === Number(t.id)).map((m) => ({ nickname: m.nickname, slot: Number(m.slot), placed: Number(m.placed) })),
  }));
}

/** Si el reloj ya pasó, la sesión se cierra sola: nadie depende de que el proyector siga abierto. */
async function settle(s: SessionRow): Promise<SessionRow> {
  if (s.status !== "building" || s.ends_ms === null || Date.now() < s.ends_ms + GRACE_MS) return s;
  const res = await run("UPDATE brick_sessions SET status = 'finished', finished_at = datetime('now') WHERE id = ? AND status = 'building'", [s.id]);
  const next = { ...s, status: "finished" as const };
  if (res.rowsAffected === 1) await publishStatus(next);
  return next;
}

export async function hostSnapshot(id: number, user: AdminUser): Promise<Result<{ session: SessionView; teams: TeamView[]; ablyMessages: number }>> {
  const found = await getSessionForHost(id, user);
  if (!found) return err("No encontramos esa sesión.", 404);
  const s = await settle(found);
  return { ok: true, session: sessionView(s), teams: await teamsOf(s.id), ablyMessages: s.ably_messages };
}

export interface PlayerView {
  session: SessionView;
  team: TeamView;
  me: { nickname: string; slot: number; tag: string };
  parcel: Parcel | null;
  prompt: string;
  title: string;
}

interface PlayerRow {
  id: string;
  session_id: number;
  team_id: number;
  slot: number;
  nickname: string;
}

async function getPlayer(playerId: string): Promise<PlayerRow | null> {
  const p = await one<PlayerRow>("SELECT id, session_id, team_id, slot, nickname FROM brick_players WHERE id = ?", [playerId]);
  return p ? { ...p, session_id: Number(p.session_id), team_id: Number(p.team_id), slot: Number(p.slot) } : null;
}

export async function playerSnapshot(playerId: string): Promise<Result<{ view: PlayerView }>> {
  const p = await getPlayer(playerId);
  if (!p) return err("No estás en ninguna sesión.", 401);
  const found = await getSession(p.session_id);
  if (!found) return err("La sesión ya no existe.", 404);
  const s = await settle(found);
  const team = (await teamsOf(s.id)).find((t) => t.id === p.team_id)!;
  const mode = modeOf(s);
  return {
    ok: true,
    view: {
      session: sessionView(s),
      team,
      me: { nickname: p.nickname, slot: p.slot, tag: playerTag(p.id) },
      parcel: mode.play === "parcelas" ? parcelFor(p.slot) : null,
      prompt: mode.prompt,
      title: mode.title,
    },
  };
}

/** Sesión y equipo de un jugador, para el token de Ably. */
export async function playerChannels(playerId: string): Promise<{ sessionId: number; teamId: number } | null> {
  const p = await getPlayer(playerId);
  return p ? { sessionId: p.session_id, teamId: p.team_id } : null;
}

// --- Publicaciones -----------------------------------------------------------------------

async function countMessages(sessionId: number, n: number) {
  await run("UPDATE brick_sessions SET ably_messages = ably_messages + ? WHERE id = ?", [n, sessionId]);
}

async function publishStatus(s: SessionRow) {
  await publishReliable(sessionChannel(s.id), "status", {
    status: s.status,
    startedMs: s.started_ms,
    endsMs: s.ends_ms,
    serverNow: Date.now(),
  });
  const players = await one<{ n: number }>("SELECT COUNT(*) AS n FROM brick_players WHERE session_id = ?", [s.id]);
  await countMessages(s.id, Number(players?.n ?? 0) + 1);
  // Al cerrar, cada equipo recibe los créditos finales (quién puso cuántas piezas), ya sin nada en vuelo.
  if (s.status === "finished") {
    const teams = await all<{ id: number }>("SELECT id FROM brick_teams WHERE session_id = ?", [s.id]);
    await Promise.all(teams.map((t) => publishMembers(s.id, Number(t.id))));
  }
}

/** Cambió la gente de un equipo: lo ven sus miembros y el proyector. */
async function publishMembers(sessionId: number, teamId: number) {
  const members = await all<{ nickname: string; slot: number; placed: number }>(
    "SELECT nickname, slot, placed FROM brick_players WHERE team_id = ? ORDER BY slot",
    [teamId],
  );
  await publishBestEffort(teamChannel(sessionId, teamId), "members", { members: members.map((m) => ({ ...m, slot: Number(m.slot), placed: Number(m.placed) })) });
  // El proyector pide la foto completa al recibir esto: así ve también los equipos nuevos.
  await publishBestEffort(hostChannel(sessionId), "roster", { teamId });
  await countMessages(sessionId, members.length + 2);
}

// --- Jugadores ---------------------------------------------------------------------------

export async function joinSession(input: {
  pin: string;
  nickname: string;
  acceptedPolicy: boolean;
  currentPlayerId: string | null;
}): Promise<Result<{ playerId: string; sessionId: number }>> {
  const pin = input.pin.replace(/\s/g, "");
  if (!/^\d{6}$/.test(pin)) return err("El PIN tiene 6 dígitos.");
  const row = await one<SessionRow>(
    `SELECT ${SESSION_COLUMNS} FROM brick_sessions WHERE pin = ? AND status <> 'finished' AND created_at >= datetime('now', ?)`,
    [pin, `-${STALE_HOURS} hours`],
  );
  if (!row) return err("No hay una sesión abierta con ese PIN.", 404);
  const s = normalize(row);

  // Recargar o volver a entrar con la misma cookie: se reusa el jugador.
  if (input.currentPlayerId) {
    const existing = await getPlayer(input.currentPlayerId);
    if (existing?.session_id === s.id) return { ok: true, playerId: existing.id, sessionId: s.id };
  }
  if (!input.acceptedPolicy) return err("Debes aceptar la política de tratamiento de datos.");
  const nick = normalizeNickname(input.nickname);
  if (!nick.ok) return err(nick.error);
  const count = await one<{ n: number }>("SELECT COUNT(*) AS n FROM brick_players WHERE session_id = ?", [s.id]);
  if (Number(count?.n ?? 0) >= MAX_SESSION_PLAYERS) return err("La sesión está llena.", 403);

  const playerId = randomBytes(16).toString("hex");
  // Dos personas entrando a la vez pueden pedir el mismo puesto: el UNIQUE lo frena y se reintenta.
  for (let attempt = 0; attempt < 6; attempt++) {
    const teams = await all<{ id: number; position: number; members: number; slots: string | null }>(
      `SELECT t.id, t.position, COUNT(p.id) AS members, GROUP_CONCAT(p.slot) AS slots
       FROM brick_teams t LEFT JOIN brick_players p ON p.team_id = t.id
       WHERE t.session_id = ? GROUP BY t.id ORDER BY t.position`,
      [s.id],
    );
    let teamId = pickTeam(teams.map((t) => ({ id: Number(t.id), members: Number(t.members) })), s.team_size);
    if (teamId === null) {
      const position = teams.length === 0 ? 0 : Math.max(...teams.map((t) => Number(t.position))) + 1;
      try {
        const res = await run("INSERT INTO brick_teams (session_id, position) VALUES (?, ?)", [s.id, position]);
        teamId = Number(res.lastInsertRowid);
      } catch (e) {
        if (String(e).includes("UNIQUE")) continue;
        throw e;
      }
    }
    const used = (teams.find((t) => Number(t.id) === teamId)?.slots ?? "").split(",").filter(Boolean).map(Number);
    const slot = freeSlot(used, s.team_size);
    if (slot === null) continue;
    try {
      await run(
        "INSERT INTO brick_players (id, session_id, team_id, slot, nickname, accepted_policy_at) VALUES (?, ?, ?, ?, ?, datetime('now'))",
        [playerId, s.id, teamId, slot, nick.nickname],
      );
    } catch (e) {
      const msg = String(e);
      if (msg.includes("nickname") || msg.includes("idx_brick_players_nickname")) return err("Ese apodo ya está en uso en esta sesión.", 409);
      if (msg.includes("UNIQUE")) continue;
      throw e;
    }
    const id = teamId;
    after(() => publishMembers(s.id, id));
    return { ok: true, playerId, sessionId: s.id };
  }
  return err("Hay mucha gente entrando a la vez. Vuelve a intentarlo.", 503);
}

export interface OpsOutcome {
  /** Una entrada por operación recibida: null = aceptada. */
  results: (OpRejection | "invalida" | null)[];
  /** Seq del lote aceptado; null si no se aceptó ninguna. */
  seq: number | null;
}

/**
 * Valida y aplica un lote de operaciones de un jugador contra la obra de su equipo. Gana el
 * primero que llega: si dos ponen una pieza en la misma celda, el segundo recibe "choque" y su
 * constructor la devuelve con un rebote.
 */
export async function applyOps(playerId: string, raw: unknown): Promise<Result<OpsOutcome>> {
  if (!Array.isArray(raw) || raw.length === 0 || raw.length > MAX_OPS) return err("Lote no válido.");
  const p = await getPlayer(playerId);
  if (!p) return err("No estás en ninguna sesión.", 401);
  const s = await getSession(p.session_id);
  if (!s) return err("La sesión ya no existe.", 404);
  if (s.status === "lobby") return err("Todavía no empieza: espera la señal del anfitrión.", 409);
  if (s.status === "finished" || (s.ends_ms !== null && Date.now() > s.ends_ms + GRACE_MS)) return err("Se acabó el tiempo.", 409);

  const mode = modeOf(s);
  const rules = { base: teamBase(mode, s.team_size), maxPieces: mode.maxPieces, parcel: mode.play === "parcelas" ? parcelFor(p.slot) : null };
  const ops = raw.map((o) => parseOp(o));

  // Relevo y Teléfono Roto: no todos pueden construir todo el tiempo.
  if ((mode.play === "relevo" || mode.play === "telefono") && s.started_ms !== null) {
    const slots = (await all<{ slot: number }>("SELECT slot FROM brick_players WHERE team_id = ?", [p.team_id])).map((r) => Number(r.slot));
    const now = Date.now();
    if (mode.play === "relevo") {
      // Lo que llega justo al cambiar de turno (latencia del celular) todavía cuenta.
      const mine = relayTurn(slots, s.started_ms, now).slot === p.slot || relayTurn(slots, s.started_ms, now - GRACE_MS).slot === p.slot;
      if (!mine) return { ok: true, results: ops.map(() => "turno" as const), seq: null };
    } else {
      const round = phoneRound(s.started_ms, s.time_limit, now);
      if (!canBuildPhone(p.slot, round, slots)) return { ok: true, results: ops.map(() => "rol" as const), seq: null };
      rules.parcel = phoneArea(round);
    }
  }

  // Concurrencia optimista: se lee la obra, se aplica y se guarda solo si nadie la cambió entre medio.
  for (let attempt = 0; attempt < 6; attempt++) {
    const team = await one<TeamRow>("SELECT id, position, bricks, seq FROM brick_teams WHERE id = ?", [p.team_id]);
    if (!team) return err("Tu equipo ya no existe.", 404);
    const world = new BrickWorld(rules.base);
    for (const b of parseBricks(team.bricks)) world.add(b);
    const results: OpsOutcome["results"] = [];
    const accepted: Op[] = [];
    let adds = 0;
    for (const op of ops) {
      if (!op) {
        results.push("invalida");
        continue;
      }
      const why = applyTeamOp(world, op, rules);
      results.push(why);
      if (why === null) {
        accepted.push(op);
        if (op.t === "add") adds++;
      }
    }
    if (accepted.length === 0) return { ok: true, results, seq: null };

    const seq = Number(team.seq) + 1;
    const res = await run("UPDATE brick_teams SET bricks = ?, seq = ? WHERE id = ? AND seq = ?", [
      JSON.stringify([...world.bricks.values()]),
      seq,
      team.id,
      team.seq,
    ]);
    if (res.rowsAffected !== 1) continue;
    if (adds) await run("UPDATE brick_players SET placed = placed + ? WHERE id = ?", [adds, p.id]);
    await publishReliable(teamChannel(s.id, p.team_id), "ops", { seq, ops: accepted, by: playerTag(p.id) });
    const members = await one<{ n: number }>("SELECT COUNT(*) AS n FROM brick_players WHERE team_id = ?", [p.team_id]);
    await countMessages(s.id, Number(members?.n ?? 0) + 1);
    return { ok: true, results, seq };
  }
  return err("Tu equipo está construyendo muy rápido. Vuelve a intentarlo.", 503);
}

// --- Host ----------------------------------------------------------------------------------

export async function hostCommand(id: number, user: AdminUser, action: string): Promise<Result> {
  const s = await getSessionForHost(id, user);
  if (!s) return err("No encontramos esa sesión.", 404);
  if (action === "start") {
    if (s.status !== "lobby") return err("La sesión ya empezó.", 409);
    const players = await one<{ n: number }>("SELECT COUNT(*) AS n FROM brick_players WHERE session_id = ?", [s.id]);
    if (Number(players?.n ?? 0) === 0) return err("Espera a que entre al menos una persona.", 409);
    const now = Date.now();
    const ends = now + s.time_limit * 1000;
    const res = await run("UPDATE brick_sessions SET status = 'building', started_ms = ?, ends_ms = ? WHERE id = ? AND status = 'lobby'", [now, ends, s.id]);
    if (res.rowsAffected === 1) await publishStatus({ ...s, status: "building", started_ms: now, ends_ms: ends });
    return { ok: true };
  }
  if (action === "finish") {
    if (s.status === "finished") return { ok: true };
    const res = await run("UPDATE brick_sessions SET status = 'finished', finished_at = datetime('now'), ends_ms = COALESCE(MIN(ends_ms, ?), ?) WHERE id = ? AND status <> 'finished'", [
      Date.now(),
      Date.now(),
      s.id,
    ]);
    if (res.rowsAffected === 1) {
      await audit(`Sesión en equipo ${s.pin} terminada.`, user, s.company_id);
      await publishStatus({ ...(await getSession(s.id))! });
    }
    return { ok: true };
  }
  if (action === "extend") {
    // Un minuto más, desde la pantalla del anfitrión: el grupo casi termina.
    if (s.status !== "building" || s.ends_ms === null) return err("Solo se puede alargar mientras construyen.", 409);
    const ends = Math.max(s.ends_ms, Date.now()) + 60_000;
    await run("UPDATE brick_sessions SET ends_ms = ? WHERE id = ?", [ends, s.id]);
    await publishStatus({ ...s, ends_ms: ends });
    return { ok: true };
  }
  return err("Acción desconocida.");
}

/** Sesiones del usuario, para la lista de la biblioteca. */
export async function recentSessions(user: AdminUser, limit = 5) {
  const scope = user.role === "super" ? { clause: "", args: [] as number[] } : { clause: "AND (company_id = ? OR host_user_id = ?)", args: [user.company_id!, user.id] };
  const rows = await all<{ id: number; mode: string; pin: string; status: BrickSessionStatus; created_at: string; players: number }>(
    `SELECT s.id, s.mode, s.pin, s.status, s.created_at,
            (SELECT COUNT(*) FROM brick_players p WHERE p.session_id = s.id) AS players
     FROM brick_sessions s WHERE 1 = 1 ${scope.clause} ORDER BY s.id DESC LIMIT ?`,
    [...scope.args, limit],
  );
  return rows.map((r) => ({ ...r, id: Number(r.id), players: Number(r.players), title: getTeamMode(r.mode)?.title ?? r.mode }));
}
