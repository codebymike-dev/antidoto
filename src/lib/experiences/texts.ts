// Lógica pura de las experiencias: mezclar los textos editados con los de fábrica,
// validar una edición, calificar y proyectar lo que ve el participante. Sin base de
// datos, para poder probarla con node --test.

import type { ExperienceDef, PublicExperience, RiskDef, RiskResult, RiskTexts } from "./types";

export const LIMITS = {
  title: 60,
  prompt: 160,
  option: 110,
  explanation: 420,
  practice: 260,
} as const;

/** Puntos (granos de café) por riesgo: acertar a la primera vale más que solo encontrarlo. */
export const GRAINS_CORRECT = 100;
export const GRAINS_FOUND = 25;

export type TextOverrides = Map<string, RiskTexts>;

export function riskTexts(risk: RiskDef, overrides: TextOverrides): RiskTexts {
  return overrides.get(risk.id) ?? risk.defaults;
}

export function publicExperience(def: ExperienceDef, overrides: TextOverrides): PublicExperience {
  return {
    key: def.key,
    scene: def.scene,
    tag: def.tag,
    series: def.series,
    station: def.station,
    title: def.title,
    description: def.description,
    character: def.character,
    risks: def.risks.map((r) => {
      const t = riskTexts(r, overrides);
      return { id: r.id, category: r.category, prompt: t.prompt, options: t.options };
    }),
  };
}

export interface AnswerRow {
  risk_id: string;
  option_index: number | null;
  is_correct: number;
}

/** Resultado de un riesgo con los textos vigentes (para mostrar la explicación). */
export function riskResult(risk: RiskDef, texts: RiskTexts, chosen: number | null): RiskResult {
  return {
    id: risk.id,
    category: risk.category,
    title: texts.title,
    correct: chosen !== null && chosen === texts.correct,
    chosen,
    correctIndex: texts.correct,
    explanation: texts.explanation,
    practice: texts.practice,
  };
}

export interface Score {
  answered: number;
  correct: number;
  revealed: number;
  total: number;
  /** 0..100: riesgos ya resueltos (encontrados o revelados). */
  avance: number;
  /** 0..10: aciertos a la primera sobre el total, como el puntaje de las misiones. */
  puntaje: number;
  grains: number;
}

export function score(rows: AnswerRow[], total: number): Score {
  const revealed = rows.filter((r) => r.option_index === null).length;
  const correct = rows.filter((r) => Number(r.is_correct) === 1).length;
  const answered = rows.length;
  const found = answered - revealed;
  return {
    answered,
    correct,
    revealed,
    total,
    avance: total ? Math.round((answered / total) * 100) : 0,
    puntaje: total ? Math.round((correct / total) * 100) / 10 : 0,
    grains: correct * GRAINS_CORRECT + (found - correct) * GRAINS_FOUND,
  };
}

function clean(value: unknown): string {
  return String(value ?? "")
    .replace(/\s+/g, " ")
    .trim();
}

export type ValidateResult = { ok: true; value: RiskTexts } | { ok: false; error: string };

/** Valida lo que llega del formulario de edición de un riesgo. */
export function validateRiskTexts(input: {
  title: unknown;
  prompt: unknown;
  options: unknown[];
  correct: unknown;
  explanation: unknown;
  practice: unknown;
}): ValidateResult {
  const title = clean(input.title);
  const prompt = clean(input.prompt);
  const options = input.options.map(clean);
  const explanation = clean(input.explanation);
  const practice = clean(input.practice);
  const correct = Number(input.correct);

  if (!title || !prompt || !explanation || !practice) return { ok: false, error: "Todos los campos son obligatorios." };
  if (options.length !== 3 || options.some((o) => !o)) return { ok: false, error: "Escribe las tres opciones." };
  if (new Set(options.map((o) => o.toLowerCase())).size !== 3) return { ok: false, error: "Las tres opciones deben ser distintas." };
  if (![0, 1, 2].includes(correct)) return { ok: false, error: "Marca cuál opción es la correcta." };
  if (title.length > LIMITS.title) return { ok: false, error: `El título admite hasta ${LIMITS.title} caracteres.` };
  if (prompt.length > LIMITS.prompt) return { ok: false, error: `La pregunta admite hasta ${LIMITS.prompt} caracteres.` };
  if (options.some((o) => o.length > LIMITS.option)) return { ok: false, error: `Cada opción admite hasta ${LIMITS.option} caracteres.` };
  if (explanation.length > LIMITS.explanation) return { ok: false, error: `La explicación admite hasta ${LIMITS.explanation} caracteres.` };
  if (practice.length > LIMITS.practice) return { ok: false, error: `La buena práctica admite hasta ${LIMITS.practice} caracteres.` };

  return {
    ok: true,
    value: {
      title,
      prompt,
      options: [options[0], options[1], options[2]],
      correct: correct as 0 | 1 | 2,
      explanation,
      practice,
    },
  };
}

/** Lee una fila de experience_risk_texts; si el JSON está roto, se ignora (quedan los de fábrica). */
export function parseStoredTexts(row: {
  title: string;
  prompt: string;
  options: string;
  correct: number;
  explanation: string;
  practice: string;
}): RiskTexts | null {
  try {
    const options = JSON.parse(row.options);
    if (!Array.isArray(options) || options.length !== 3) return null;
    const correct = Number(row.correct);
    if (![0, 1, 2].includes(correct)) return null;
    return {
      title: row.title,
      prompt: row.prompt,
      options: [String(options[0]), String(options[1]), String(options[2])],
      correct: correct as 0 | 1 | 2,
      explanation: row.explanation,
      practice: row.practice,
    };
  } catch {
    return null;
  }
}
