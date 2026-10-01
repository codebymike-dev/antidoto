import "server-only";
import { all, one, run } from "./db";
import type { AdminUser } from "./auth";
import { companyFilter, LIVE_CODE } from "./scope";
import { EXPERIENCES, experienceMissionId, getExperience, seriesEntry, seriesFrom } from "./experiences/catalog";
import { parseStoredTexts, riskResult, riskTexts, score, type AnswerRow, type TextOverrides } from "./experiences/texts";
import type { ExperienceDef, RiskResult } from "./experiences/types";
import { buildRecap, type Recap } from "./experiences/recap";

/** Qué experiencia usa una misión; null si es una misión común. */
export async function missionExperience(missionId: string): Promise<ExperienceDef | null> {
  const row = await one<{ experience_key: string }>("SELECT experience_key FROM mission_experiences WHERE mission_id = ?", [
    missionId,
  ]);
  return row ? getExperience(row.experience_key) : null;
}

/** Las estaciones que se juegan con el código de la misión, en orden; null si es una misión común. */
export async function missionStations(missionId: string): Promise<ExperienceDef[] | null> {
  const def = await missionExperience(missionId);
  return def ? seriesFrom(def) : null;
}

/** Todos los riesgos de las estaciones, cada uno con la experiencia a la que pertenece. */
export function stationRisks(stations: ExperienceDef[]) {
  return stations.flatMap((def) => def.risks.map((risk) => ({ def, risk })));
}

export async function loadOverrides(key: string): Promise<TextOverrides> {
  const rows = await all<{
    risk_id: string;
    title: string;
    prompt: string;
    options: string;
    correct: number;
    explanation: string;
    practice: string;
  }>(
    `SELECT risk_id, title, prompt, options, correct, explanation, practice
     FROM experience_risk_texts WHERE experience_key = ?`,
    [key],
  );
  const map: TextOverrides = new Map();
  for (const r of rows) {
    const parsed = parseStoredTexts(r);
    if (parsed) map.set(r.risk_id, parsed);
  }
  return map;
}

export async function participationAnswers(participationId: string): Promise<AnswerRow[]> {
  const rows = await all<AnswerRow>(
    "SELECT risk_id, option_index, is_correct FROM experience_answers WHERE participation_id = ? ORDER BY id",
    [participationId],
  );
  return rows.map((r) => ({
    risk_id: r.risk_id,
    option_index: r.option_index === null ? null : Number(r.option_index),
    is_correct: Number(r.is_correct),
  }));
}

/** Textos editados de varias experiencias, por clave. */
export async function loadAllOverrides(stations: ExperienceDef[]): Promise<Map<string, TextOverrides>> {
  const out = new Map<string, TextOverrides>();
  for (const def of stations) out.set(def.key, await loadOverrides(def.key));
  return out;
}

/** Resultados ya resueltos por un participante en las estaciones, con los textos vigentes. */
export function resultsFor(stations: ExperienceDef[], overrides: Map<string, TextOverrides>, rows: AnswerRow[]): RiskResult[] {
  const byId = new Map(stationRisks(stations).map((x) => [x.risk.id, x]));
  const out: RiskResult[] = [];
  for (const row of rows) {
    const found = byId.get(row.risk_id);
    if (!found) continue;
    const { def, risk } = found;
    const texts = riskTexts(risk, overrides.get(def.key) ?? new Map());
    const result = riskResult(risk, texts, row.option_index);
    // La calificación guardada manda: si después se cambió la opción correcta, no se recalifica.
    out.push({ ...result, correct: row.is_correct === 1 });
  }
  return out;
}

/** El resumen personal de quien terminó una ruta; null si la misión no es de escenas. */
export async function participationRecap(participationId: string, missionId: string): Promise<Recap | null> {
  const stations = await missionStations(missionId);
  if (!stations) return null;
  const [overrides, answers] = await Promise.all([loadAllOverrides(stations), participationAnswers(participationId)]);
  return buildRecap(stations, overrides, answers);
}

/** Recalcula avance y puntaje de la participación desde sus respuestas, sobre toda la serie. */
export async function refreshParticipationScore(participationId: string, stations: ExperienceDef[]) {
  const s = score(await participationAnswers(participationId), stationRisks(stations).length);
  await run("UPDATE participations SET avance = ?, puntaje = ? WHERE id = ?", [s.avance, s.puntaje, participationId]);
  return s;
}

/**
 * Crea (si falta) la misión que representa a la experiencia en actividades y códigos.
 * Id fijo por experiencia: correrlo dos veces no duplica nada. Una serie se juega completa
 * con el mismo código, así que la actividad lleva el nombre de la serie, no el de su
 * primera estación; el título se resincroniza por si la actividad ya existía con el viejo.
 */
export async function ensureExperienceMission(def: ExperienceDef): Promise<string> {
  const id = experienceMissionId(def.key);
  const title = seriesFrom(def).length > 1 ? def.series : `${def.series} · ${def.title}`;
  await run(
    `INSERT INTO missions (id, tag, title, description) VALUES (?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET title = excluded.title`,
    [id, def.tag, title, def.description],
  );
  await run("INSERT OR IGNORE INTO mission_experiences (mission_id, experience_key) VALUES (?, ?)", [id, def.key]);
  return id;
}

export interface LibraryItem {
  def: ExperienceDef;
  missionId: string | null;
  participantes: number;
  edited: number;
}

/** La biblioteca: cada experiencia con su uso (participantes visibles para el usuario). */
export async function listLibrary(user: AdminUser): Promise<LibraryItem[]> {
  const { clause, args } = companyFilter(user.role, user.company_id);
  const rows = await all<{ experience_key: string; mission_id: string; participantes: number }>(
    `SELECT me.experience_key, me.mission_id, COUNT(p.id) AS participantes
     FROM mission_experiences me
     JOIN missions m ON m.id = me.mission_id AND m.archived_at IS NULL
     LEFT JOIN activity_codes ac ON ac.mission_id = me.mission_id AND ${LIVE_CODE} ${clause}
     LEFT JOIN participations p ON p.activity_code_id = ac.id
     GROUP BY me.mission_id`,
    args,
  );
  const edits = await all<{ experience_key: string; n: number }>(
    "SELECT experience_key, COUNT(*) AS n FROM experience_risk_texts GROUP BY experience_key",
  );
  return EXPERIENCES.map((def) => {
    // Las estaciones siguientes se juegan con el código de la primera: comparten su uso.
    const entry = seriesEntry(def);
    const own = rows.filter((r) => r.experience_key === entry.key);
    const mine = own.find((r) => r.mission_id === experienceMissionId(entry.key)) ?? own[0];
    return {
      def,
      missionId: mine?.mission_id ?? null,
      participantes: own.reduce((acc, r) => acc + Number(r.participantes), 0),
      edited: Number(edits.find((e) => e.experience_key === def.key)?.n ?? 0),
    };
  });
}

export interface RiskStat {
  id: string;
  /** Estación de la serie donde está el riesgo. */
  station: number;
  stationTitle: string;
  title: string;
  category: string;
  /** Participantes que lo encontraron (sin contar los que se rindieron). */
  found: number;
  correct: number;
  revealed: number;
  /** Opción equivocada más elegida, si hay. */
  topWrong: { text: string; count: number } | null;
}

/** Filtro de los resultados por la ficha del participante (vacío = sin filtro). */
export interface ProfileFilter {
  cargo?: string;
  /** Código DANE del departamento (2 dígitos). */
  dpto?: string;
  /** Código DANE del municipio (5 dígitos); manda sobre el departamento. */
  mpio?: string;
}

/** Condición sobre la participación `p` según su ficha. */
function profileFilterClause(f: ProfileFilter = {}): { clause: string; args: string[] } {
  const parts: string[] = [];
  const args: string[] = [];
  if (f.cargo) {
    parts.push("pp.cargo = ?");
    args.push(f.cargo);
  }
  if (f.mpio) {
    parts.push("pp.municipio = ?");
    args.push(f.mpio);
  } else if (f.dpto) {
    parts.push("substr(pp.municipio, 1, 2) = ?");
    args.push(f.dpto);
  }
  if (parts.length === 0) return { clause: "", args };
  return {
    clause: `AND EXISTS (SELECT 1 FROM participant_profiles pp WHERE pp.participation_id = p.id AND ${parts.join(" AND ")})`,
    args,
  };
}

/** Cargos y municipios que respondieron los participantes de una actividad, para los filtros. */
export async function profileOptions(missionId: string, user: AdminUser) {
  const { clause, args } = companyFilter(user.role, user.company_id);
  const rows = await all<{ cargo: string | null; municipio: string | null }>(
    `SELECT DISTINCT pp.cargo, pp.municipio
     FROM participant_profiles pp
     JOIN participations p ON p.id = pp.participation_id
     JOIN activity_codes ac ON ac.id = p.activity_code_id
     WHERE ac.mission_id = ? AND ${LIVE_CODE} ${clause}`,
    [missionId, ...args],
  );
  const es = (a: string, b: string) => a.localeCompare(b, "es");
  return {
    cargos: [...new Set(rows.map((r) => r.cargo).filter((c): c is string => !!c))].sort(es),
    municipios: [...new Set(rows.map((r) => r.municipio).filter((m): m is string => !!m))],
  };
}

/** Resumen por riesgo de una actividad de tipo escena (todas sus estaciones), filtrado por empresa y ficha. */
export async function experienceRiskStats(missionId: string, stations: ExperienceDef[], user: AdminUser, filter?: ProfileFilter) {
  const scope = companyFilter(user.role, user.company_id);
  const prof = profileFilterClause(filter);
  const clause = `${scope.clause} ${prof.clause}`;
  const args = [...scope.args, ...prof.args];
  const rows = await all<{
    risk_id: string;
    option_index: number | null;
    option_text: string | null;
    is_correct: number;
    n: number;
  }>(
    `SELECT ea.risk_id, ea.option_index, ea.option_text, ea.is_correct, COUNT(*) AS n
     FROM experience_answers ea
     JOIN participations p ON p.id = ea.participation_id
     JOIN activity_codes ac ON ac.id = p.activity_code_id
     WHERE ac.mission_id = ? AND ${LIVE_CODE} ${clause}
     GROUP BY ea.risk_id, ea.option_index, ea.option_text, ea.is_correct`,
    [missionId, ...args],
  );
  const participants = await one<{ n: number }>(
    `SELECT COUNT(*) AS n FROM participations p
     JOIN activity_codes ac ON ac.id = p.activity_code_id
     WHERE ac.mission_id = ? AND ${LIVE_CODE} ${clause}`,
    [missionId, ...args],
  );
  const overrides = await loadAllOverrides(stations);
  const stats: RiskStat[] = stationRisks(stations).map(({ def, risk }) => {
    const mine = rows.filter((r) => r.risk_id === risk.id);
    const count = (pred: (r: (typeof rows)[number]) => boolean) => mine.filter(pred).reduce((acc, r) => acc + Number(r.n), 0);
    const wrong = mine
      .filter((r) => r.option_index !== null && Number(r.is_correct) === 0 && r.option_text)
      .sort((a, b) => Number(b.n) - Number(a.n))[0];
    return {
      id: risk.id,
      station: def.station,
      stationTitle: def.title,
      title: riskTexts(risk, overrides.get(def.key) ?? new Map()).title,
      category: risk.category,
      found: count((r) => r.option_index !== null),
      correct: count((r) => Number(r.is_correct) === 1),
      revealed: count((r) => r.option_index === null),
      topWrong: wrong ? { text: wrong.option_text!, count: Number(wrong.n) } : null,
    };
  });
  return { participants: Number(participants?.n ?? 0), stats };
}

/** Participantes de una actividad con su ficha, para el CSV; mismo alcance y filtro que la página. */
export async function listProfiledParticipants(missionId: string, user: AdminUser, filter?: ProfileFilter) {
  const scope = companyFilter(user.role, user.company_id);
  const prof = profileFilterClause(filter);
  const rows = await all<{
    empresa: string;
    codigo: string;
    nombre: string;
    cargo: string | null;
    municipio: string | null;
    avance: number;
    puntaje: number | null;
    started_at: string;
    completed_at: string | null;
  }>(
    `SELECT c.name AS empresa, ac.code AS codigo, p.participant_name AS nombre, pp.cargo, pp.municipio,
            p.avance, p.puntaje, p.started_at, p.completed_at
     FROM participations p
     JOIN activity_codes ac ON ac.id = p.activity_code_id
     JOIN companies c ON c.id = ac.company_id
     LEFT JOIN participant_profiles pp ON pp.participation_id = p.id
     WHERE ac.mission_id = ? AND ${LIVE_CODE} ${scope.clause} ${prof.clause}
     ORDER BY c.name COLLATE NOCASE, p.participant_name COLLATE NOCASE`,
    [missionId, ...scope.args, ...prof.args],
  );
  return rows.map((r) => ({ ...r, avance: Number(r.avance), puntaje: r.puntaje === null ? null : Number(r.puntaje) }));
}
