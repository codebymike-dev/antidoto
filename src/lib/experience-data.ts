import "server-only";
import { all, one, run } from "./db";
import type { AdminUser } from "./auth";
import { companyFilter } from "./scope";
import { EXPERIENCES, experienceMissionId, getExperience } from "./experiences/catalog";
import { parseStoredTexts, riskResult, riskTexts, score, type AnswerRow, type TextOverrides } from "./experiences/texts";
import type { ExperienceDef, RiskResult } from "./experiences/types";

/** Qué experiencia usa una misión; null si es una misión común. */
export async function missionExperience(missionId: string): Promise<ExperienceDef | null> {
  const row = await one<{ experience_key: string }>("SELECT experience_key FROM mission_experiences WHERE mission_id = ?", [
    missionId,
  ]);
  return row ? getExperience(row.experience_key) : null;
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

/** Resultados ya resueltos por un participante, con los textos vigentes. */
export function resultsFor(def: ExperienceDef, overrides: TextOverrides, rows: AnswerRow[]): RiskResult[] {
  const byId = new Map(def.risks.map((r) => [r.id, r]));
  const out: RiskResult[] = [];
  for (const row of rows) {
    const risk = byId.get(row.risk_id);
    if (!risk) continue;
    const texts = riskTexts(risk, overrides);
    const result = riskResult(risk, texts, row.option_index);
    // La calificación guardada manda: si después se cambió la opción correcta, no se recalifica.
    out.push({ ...result, correct: row.is_correct === 1 });
  }
  return out;
}

/** Recalcula avance y puntaje de la participación desde sus respuestas. */
export async function refreshParticipationScore(participationId: string, def: ExperienceDef) {
  const s = score(await participationAnswers(participationId), def.risks.length);
  await run("UPDATE participations SET avance = ?, puntaje = ? WHERE id = ?", [s.avance, s.puntaje, participationId]);
  return s;
}

/**
 * Crea (si falta) la misión que representa a la experiencia en actividades y códigos.
 * Id fijo por experiencia: correrlo dos veces no duplica nada.
 */
export async function ensureExperienceMission(def: ExperienceDef): Promise<string> {
  const id = experienceMissionId(def.key);
  await run(`INSERT OR IGNORE INTO missions (id, tag, title, description) VALUES (?, ?, ?, ?)`, [
    id,
    def.tag,
    `${def.series} · ${def.title}`,
    def.description,
  ]);
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
     LEFT JOIN activity_codes ac ON ac.mission_id = me.mission_id ${clause}
     LEFT JOIN participations p ON p.activity_code_id = ac.id
     GROUP BY me.mission_id`,
    args,
  );
  const edits = await all<{ experience_key: string; n: number }>(
    "SELECT experience_key, COUNT(*) AS n FROM experience_risk_texts GROUP BY experience_key",
  );
  return EXPERIENCES.map((def) => {
    const own = rows.filter((r) => r.experience_key === def.key);
    const mine = own.find((r) => r.mission_id === experienceMissionId(def.key)) ?? own[0];
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
  title: string;
  category: string;
  /** Participantes que lo encontraron (sin contar los que se rindieron). */
  found: number;
  correct: number;
  revealed: number;
  /** Opción equivocada más elegida, si hay. */
  topWrong: { text: string; count: number } | null;
}

/** Resumen por riesgo de una actividad de tipo escena, filtrado por empresa. */
export async function experienceRiskStats(missionId: string, def: ExperienceDef, user: AdminUser) {
  const { clause, args } = companyFilter(user.role, user.company_id);
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
     WHERE ac.mission_id = ? ${clause}
     GROUP BY ea.risk_id, ea.option_index, ea.option_text, ea.is_correct`,
    [missionId, ...args],
  );
  const participants = await one<{ n: number }>(
    `SELECT COUNT(*) AS n FROM participations p
     JOIN activity_codes ac ON ac.id = p.activity_code_id
     WHERE ac.mission_id = ? ${clause}`,
    [missionId, ...args],
  );
  const overrides = await loadOverrides(def.key);
  const stats: RiskStat[] = def.risks.map((risk) => {
    const mine = rows.filter((r) => r.risk_id === risk.id);
    const count = (pred: (r: (typeof rows)[number]) => boolean) => mine.filter(pred).reduce((acc, r) => acc + Number(r.n), 0);
    const wrong = mine
      .filter((r) => r.option_index !== null && Number(r.is_correct) === 0 && r.option_text)
      .sort((a, b) => Number(b.n) - Number(a.n))[0];
    return {
      id: risk.id,
      title: riskTexts(risk, overrides).title,
      category: risk.category,
      found: count((r) => r.option_index !== null),
      correct: count((r) => Number(r.is_correct) === 1),
      revealed: count((r) => r.option_index === null),
      topWrong: wrong ? { text: wrong.option_text!, count: Number(wrong.n) } : null,
    };
  });
  return { participants: Number(participants?.n ?? 0), stats };
}
