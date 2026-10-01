"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { one, run } from "./db";
import { PARTICIPATION_COOKIE } from "./participation";
import { isExpired } from "./expiry";
import { audit, requireSuper } from "./admin-guard";
import { getExperience } from "./experiences/catalog";
import { riskResult, riskTexts, validateRiskTexts } from "./experiences/texts";
import type { ExperienceDef, RiskResult } from "./experiences/types";
import {
  loadAllOverrides,
  loadOverrides,
  missionStations,
  participationAnswers,
  refreshParticipationScore,
  resultsFor,
  stationRisks,
} from "./experience-data";
import { profileConfigFor } from "./participant-profile";
import { validateProfile } from "./profile";

// --- Participante --------------------------------------------------------------

/**
 * Por qué no se puede seguir jugando. El jugador lo usa para explicarlo con claridad
 * (pausa: se espera; vencida o sin sesión: se vuelve al inicio) en vez de un aviso suelto.
 */
export type BlockReason = "paused" | "expired" | "session" | "done" | "other";

export type Blocked = { ok: false; error: string; reason: BlockReason };

export type AnswerOutcome = { ok: true; result: RiskResult; grains: number } | Blocked;

interface PlayerContext {
  participationId: string;
  /** Las estaciones que se juegan con el código, en orden. */
  stations: ExperienceDef[];
}

/** La participación de la cookie, si es de una experiencia abierta y sin terminar. */
async function playerContext(): Promise<PlayerContext | { error: string; reason: BlockReason }> {
  const jar = await cookies();
  const id = jar.get(PARTICIPATION_COOKIE)?.value;
  if (!id) return { error: "Tu sesión terminó. Vuelve a entrar con tu código.", reason: "session" };

  const row = await one<{ mission_id: string; estado: string; expires_at: string | null; completed_at: string | null }>(
    `SELECT ac.mission_id, ac.estado, ac.expires_at, p.completed_at
     FROM participations p JOIN activity_codes ac ON ac.id = p.activity_code_id
     WHERE p.id = ?`,
    [id],
  );
  if (!row) return { error: "Tu sesión terminó. Vuelve a entrar con tu código.", reason: "session" };
  if (row.completed_at) return { error: "Ya terminaste esta actividad.", reason: "done" };
  if (row.estado === "pausado") return { error: "Esta actividad está pausada por tu administrador.", reason: "paused" };
  if (isExpired(row.expires_at)) return { error: "Esta actividad ya venció.", reason: "expired" };

  const stations = await missionStations(row.mission_id);
  if (!stations) return { error: "Esta actividad no es una escena interactiva.", reason: "other" };
  return { participationId: id, stations };
}

/**
 * ¿Se puede seguir jugando? El jugador lo pregunta al abrir una pregunta, para avisar de una
 * pausa o un vencimiento antes de que la persona lea y elija, no después. Solo lee.
 */
export async function checkActivity(): Promise<{ ok: true } | Blocked> {
  const ctx = await playerContext();
  if ("error" in ctx) return { ok: false, error: ctx.error, reason: ctx.reason };
  return { ok: true };
}

export async function answerExperienceRisk(riskId: string, option: number): Promise<AnswerOutcome> {
  const ctx = await playerContext();
  if ("error" in ctx) return { ok: false, error: ctx.error, reason: ctx.reason };
  const found = stationRisks(ctx.stations).find((x) => x.risk.id === riskId);
  if (!found || ![0, 1, 2].includes(option)) return { ok: false, error: "Respuesta no válida.", reason: "other" };
  const { def, risk } = found;

  const texts = riskTexts(risk, await loadOverrides(def.key));
  // Si ya lo respondió (doble clic, otra pestaña), vale la primera respuesta.
  await run(
    `INSERT OR IGNORE INTO experience_answers (participation_id, risk_id, option_index, option_text, is_correct)
     VALUES (?, ?, ?, ?, ?)`,
    [ctx.participationId, riskId, option, texts.options[option], option === texts.correct ? 1 : 0],
  );
  const stored = (await participationAnswers(ctx.participationId)).find((r) => r.risk_id === riskId)!;
  const s = await refreshParticipationScore(ctx.participationId, ctx.stations);
  const result = riskResult(risk, texts, stored.option_index);
  return { ok: true, result: { ...result, correct: stored.is_correct === 1 }, grains: s.grains };
}

/**
 * "Ya no encuentro más": revela los riesgos que faltan en una estación (cuentan como no
 * encontrados). Las demás estaciones de la serie no se tocan.
 */
export async function revealExperienceRisks(
  stationKey: string,
): Promise<{ ok: true; results: RiskResult[] } | Blocked> {
  const ctx = await playerContext();
  if ("error" in ctx) return { ok: false, error: ctx.error, reason: ctx.reason };
  const station = ctx.stations.find((d) => d.key === stationKey);
  if (!station) return { ok: false, error: "Estación no válida.", reason: "other" };
  const done = new Set((await participationAnswers(ctx.participationId)).map((r) => r.risk_id));
  for (const risk of station.risks) {
    if (done.has(risk.id)) continue;
    await run(
      `INSERT OR IGNORE INTO experience_answers (participation_id, risk_id, option_index, option_text, is_correct)
       VALUES (?, ?, NULL, NULL, 0)`,
      [ctx.participationId, risk.id],
    );
  }
  await refreshParticipationScore(ctx.participationId, ctx.stations);
  const results = resultsFor(
    ctx.stations,
    await loadAllOverrides(ctx.stations),
    await participationAnswers(ctx.participationId),
  );
  return { ok: true, results };
}

export type WelcomeOutcome = { ok: true } | { ok: false; error: string };

/**
 * Cierra la bienvenida y guarda los datos que pide el código. Se puede aunque la
 * actividad esté pausada: son datos del participante, no respuestas del juego.
 */
export async function saveWelcome(input: { cargo: string | null; municipio: string | null }): Promise<WelcomeOutcome> {
  const jar = await cookies();
  const id = jar.get(PARTICIPATION_COOKIE)?.value;
  const exists = id ? await one<{ id: string }>("SELECT id FROM participations WHERE id = ?", [id]) : null;
  if (!id || !exists) return { ok: false, error: "Tu sesión terminó. Vuelve a entrar con tu código." };

  const config = (await profileConfigFor(id)) ?? { cargos: null, askPlace: false };
  const parsed = validateProfile(config, input);
  if (!parsed.ok) return parsed;
  await run(
    `INSERT INTO participant_profiles (participation_id, cargo, municipio) VALUES (?, ?, ?)
     ON CONFLICT(participation_id) DO UPDATE SET cargo = excluded.cargo, municipio = excluded.municipio`,
    [id, parsed.value.cargo, parsed.value.municipio],
  );
  return { ok: true };
}

/**
 * Cierra la ruta. Devuelve un resultado en vez de redirigir para que el jugador pueda
 * avisar si no hubo conexión y reintentar; si todo sale bien, él mismo navega al cierre.
 */
export async function completeExperience(): Promise<{ ok: true } | Blocked> {
  const ctx = await playerContext();
  if ("error" in ctx) return { ok: false, error: ctx.error, reason: ctx.reason };
  const s = await refreshParticipationScore(ctx.participationId, ctx.stations);
  // Solo se termina con todos los riesgos de todas las estaciones resueltos (encontrados o revelados).
  if (s.answered < s.total) return { ok: false, error: "Aún te faltan riesgos por resolver.", reason: "other" };
  await run("UPDATE participations SET completed_at = datetime('now'), avance = 100 WHERE id = ? AND completed_at IS NULL", [
    ctx.participationId,
  ]);
  revalidatePath("/mision");
  return { ok: true };
}

// --- Biblioteca (admin) --------------------------------------------------------------

export type SaveTextsState = { ok: boolean; message: string } | null;

export async function saveRiskTexts(_prev: SaveTextsState, formData: FormData): Promise<SaveTextsState> {
  const user = await requireSuper();
  const def = getExperience(String(formData.get("experience") ?? ""));
  const risk = def?.risks.find((r) => r.id === String(formData.get("risk") ?? ""));
  if (!def || !risk) return { ok: false, message: "No se encontró el riesgo." };

  const parsed = validateRiskTexts({
    title: formData.get("title"),
    prompt: formData.get("prompt"),
    options: [formData.get("option0"), formData.get("option1"), formData.get("option2")],
    correct: formData.get("correct"),
    explanation: formData.get("explanation"),
    practice: formData.get("practice"),
  });
  if (!parsed.ok) return { ok: false, message: parsed.error };

  const t = parsed.value;
  await run(
    `INSERT INTO experience_risk_texts
       (experience_key, risk_id, title, prompt, options, correct, explanation, practice, updated_by, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
     ON CONFLICT(experience_key, risk_id) DO UPDATE SET
       title = excluded.title, prompt = excluded.prompt, options = excluded.options,
       correct = excluded.correct, explanation = excluded.explanation, practice = excluded.practice,
       updated_by = excluded.updated_by, updated_at = excluded.updated_at`,
    [def.key, risk.id, t.title, t.prompt, JSON.stringify(t.options), t.correct, t.explanation, t.practice, user.id],
  );
  await audit(`Textos del riesgo "${t.title}" editados en "${def.series} · ${def.title}".`, user);
  revalidatePath(`/admin/biblioteca/${def.key}`);
  return { ok: true, message: "Guardado. Los participantes ya ven el texto nuevo." };
}

/** Vuelve a los textos del código. Devuelve una marca para que el formulario se recargue. */
export async function resetRiskTexts(_prev: number, formData: FormData): Promise<number> {
  const user = await requireSuper();
  const def = getExperience(String(formData.get("experience") ?? ""));
  const risk = def?.risks.find((r) => r.id === String(formData.get("risk") ?? ""));
  if (!def || !risk) return _prev;
  await run("DELETE FROM experience_risk_texts WHERE experience_key = ? AND risk_id = ?", [def.key, risk.id]);
  await audit(`Textos del riesgo "${risk.defaults.title}" restaurados en "${def.series} · ${def.title}".`, user);
  revalidatePath(`/admin/biblioteca/${def.key}`);
  return _prev + 1;
}
