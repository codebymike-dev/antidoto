"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { one, run } from "./db";
import { PARTICIPATION_COOKIE } from "./participation";
import { isExpired } from "./expiry";
import { audit, requireSuper, requireUser } from "./admin-guard";
import { getExperience } from "./experiences/catalog";
import { riskResult, riskTexts, validateRiskTexts } from "./experiences/texts";
import type { ExperienceDef, RiskResult } from "./experiences/types";
import {
  ensureExperienceMission,
  loadOverrides,
  missionExperience,
  participationAnswers,
  refreshParticipationScore,
  resultsFor,
} from "./experience-data";

// --- Participante --------------------------------------------------------------

export type AnswerOutcome = { ok: true; result: RiskResult; grains: number } | { ok: false; error: string };

interface PlayerContext {
  participationId: string;
  def: ExperienceDef;
}

/** La participación de la cookie, si es de una experiencia abierta y sin terminar. */
async function playerContext(): Promise<PlayerContext | { error: string }> {
  const jar = await cookies();
  const id = jar.get(PARTICIPATION_COOKIE)?.value;
  if (!id) return { error: "Tu sesión terminó. Vuelve a entrar con tu código." };

  const row = await one<{ mission_id: string; estado: string; expires_at: string | null; completed_at: string | null }>(
    `SELECT ac.mission_id, ac.estado, ac.expires_at, p.completed_at
     FROM participations p JOIN activity_codes ac ON ac.id = p.activity_code_id
     WHERE p.id = ?`,
    [id]
  );
  if (!row) return { error: "Tu sesión terminó. Vuelve a entrar con tu código." };
  if (row.completed_at) return { error: "Ya terminaste esta actividad." };
  if (row.estado === "pausado") return { error: "Esta actividad está pausada por tu administrador." };
  if (isExpired(row.expires_at)) return { error: "Esta actividad ya venció." };

  const def = await missionExperience(row.mission_id);
  if (!def) return { error: "Esta actividad no es una escena interactiva." };
  return { participationId: id, def };
}

export async function answerExperienceRisk(riskId: string, option: number): Promise<AnswerOutcome> {
  const ctx = await playerContext();
  if ("error" in ctx) return { ok: false, error: ctx.error };
  const risk = ctx.def.risks.find((r) => r.id === riskId);
  if (!risk || ![0, 1, 2].includes(option)) return { ok: false, error: "Respuesta no válida." };

  const texts = riskTexts(risk, await loadOverrides(ctx.def.key));
  // Si ya lo respondió (doble clic, otra pestaña), vale la primera respuesta.
  await run(
    `INSERT OR IGNORE INTO experience_answers (participation_id, risk_id, option_index, option_text, is_correct)
     VALUES (?, ?, ?, ?, ?)`,
    [ctx.participationId, riskId, option, texts.options[option], option === texts.correct ? 1 : 0]
  );
  const stored = (await participationAnswers(ctx.participationId)).find((r) => r.risk_id === riskId)!;
  const s = await refreshParticipationScore(ctx.participationId, ctx.def);
  const result = riskResult(risk, texts, stored.option_index);
  return { ok: true, result: { ...result, correct: stored.is_correct === 1 }, grains: s.grains };
}

/** "Ya no encuentro más": revela los riesgos que faltan (cuentan como no encontrados). */
export async function revealExperienceRisks(): Promise<{ ok: true; results: RiskResult[] } | { ok: false; error: string }> {
  const ctx = await playerContext();
  if ("error" in ctx) return { ok: false, error: ctx.error };
  const done = new Set((await participationAnswers(ctx.participationId)).map((r) => r.risk_id));
  for (const risk of ctx.def.risks) {
    if (done.has(risk.id)) continue;
    await run(
      `INSERT OR IGNORE INTO experience_answers (participation_id, risk_id, option_index, option_text, is_correct)
       VALUES (?, ?, NULL, NULL, 0)`,
      [ctx.participationId, risk.id]
    );
  }
  await refreshParticipationScore(ctx.participationId, ctx.def);
  const results = resultsFor(ctx.def, await loadOverrides(ctx.def.key), await participationAnswers(ctx.participationId));
  return { ok: true, results };
}

export async function finishExperience() {
  const ctx = await playerContext();
  if ("error" in ctx) redirect("/mision");
  const s = await refreshParticipationScore(ctx.participationId, ctx.def);
  // Solo se termina con todos los riesgos resueltos (encontrados o revelados).
  if (s.answered < s.total) redirect("/mision");
  await run(
    "UPDATE participations SET completed_at = datetime('now'), avance = 100 WHERE id = ? AND completed_at IS NULL",
    [ctx.participationId]
  );
  revalidatePath("/mision");
  redirect("/mision/completada");
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
    [def.key, risk.id, t.title, t.prompt, JSON.stringify(t.options), t.correct, t.explanation, t.practice, user.id]
  );
  await audit(`Textos del riesgo "${t.title}" editados en "${def.series} · ${def.title}".`, user);
  revalidatePath(`/admin/biblioteca/${def.key}`);
  return { ok: true, message: "Guardado. Los participantes ya ven el texto nuevo." };
}

export async function resetRiskTexts(formData: FormData) {
  const user = await requireSuper();
  const def = getExperience(String(formData.get("experience") ?? ""));
  const risk = def?.risks.find((r) => r.id === String(formData.get("risk") ?? ""));
  if (!def || !risk) return;
  await run("DELETE FROM experience_risk_texts WHERE experience_key = ? AND risk_id = ?", [def.key, risk.id]);
  await audit(`Textos del riesgo "${risk.defaults.title}" restaurados en "${def.series} · ${def.title}".`, user);
  revalidatePath(`/admin/biblioteca/${def.key}`);
}

/** Crea la actividad de la experiencia (si falta) y lleva a generar un código. */
export async function adoptExperience(formData: FormData) {
  const user = await requireUser();
  if (user.role !== "super") return;
  const def = getExperience(String(formData.get("experience") ?? ""));
  if (!def) return;
  const missionId = await ensureExperienceMission(def);
  revalidatePath("/admin");
  redirect(`/admin/config?mission=${missionId}`);
}
