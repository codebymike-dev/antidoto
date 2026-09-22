// Validación de juegos en vivo. Es pura (sin I/O) para usarla igual en el editor,
// que avisa al instante, y en la Server Action, que es la que manda: lo que llega
// del navegador se trata como no confiable.

import type { LiveQuestionType } from "./types";

export const LIMITS = {
  title: 120,
  description: 500,
  prompt: 160,
  option: 75,
  questions: 50,
  minOptions: 2,
  maxOptions: 4,
} as const;

/** Tiempos que ofrece el editor; el esquema admite cualquier valor entre 5 y 240. */
export const TIME_LIMITS = [5, 10, 20, 30, 60, 90, 120, 240] as const;

export const QUESTION_TYPES: { type: LiveQuestionType; label: string }[] = [
  { type: "quiz", label: "Quiz" },
  { type: "vf", label: "Verdadero o falso" },
  { type: "encuesta", label: "Encuesta" },
  { type: "nube", label: "Nube de palabras" },
];

export const VF_LABELS = ["Verdadero", "Falso"] as const;

export interface DraftOption {
  text: string;
  correct: boolean;
}

export interface DraftQuestion {
  type: LiveQuestionType;
  prompt: string;
  timeLimit: number;
  options: DraftOption[];
}

export interface GameDraft {
  title: string;
  description: string;
  /** null = juego global. Solo el superadmin puede elegirlo. */
  companyId: number | null;
  questions: DraftQuestion[];
}

/** Claves: "title", "description", "questions", "q.0.prompt", "q.0.options", "q.0.o.1". */
export type DraftErrors = Record<string, string>;

export type ParseResult = { ok: true; draft: GameDraft } | { ok: false; errors: DraftErrors };

export function newQuestion(type: LiveQuestionType): DraftQuestion {
  const options: DraftOption[] =
    type === "vf"
      ? VF_LABELS.map((text, i) => ({ text, correct: i === 0 }))
      : type === "nube"
        ? []
        : [
            { text: "", correct: type === "quiz" },
            { text: "", correct: false },
          ];
  return { type, prompt: "", timeLimit: type === "nube" ? 30 : 20, options };
}

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null;
const str = (v: unknown) => (typeof v === "string" ? v.trim() : "");
const isType = (v: unknown): v is LiveQuestionType =>
  v === "quiz" || v === "vf" || v === "encuesta" || v === "nube";

/**
 * Valida y normaliza un borrador. Recorta espacios y fuerza las reglas de cada tipo
 * (la encuesta nunca tiene correctas, V/F siempre tiene sus dos opciones fijas).
 */
export function parseGameDraft(input: unknown): ParseResult {
  const errors: DraftErrors = {};
  if (!isRecord(input)) return { ok: false, errors: { title: "Datos inválidos." } };

  const title = str(input.title);
  if (!title) errors.title = "Ponle un nombre al juego.";
  else if (title.length > LIMITS.title) errors.title = `Máximo ${LIMITS.title} caracteres.`;

  const description = str(input.description);
  if (description.length > LIMITS.description) errors.description = `Máximo ${LIMITS.description} caracteres.`;

  const companyId =
    input.companyId === null || input.companyId === undefined
      ? null
      : Number.isInteger(input.companyId)
        ? (input.companyId as number)
        : NaN;
  if (Number.isNaN(companyId)) errors.companyId = "Empresa inválida.";

  const rawQuestions = Array.isArray(input.questions) ? input.questions : [];
  if (rawQuestions.length > LIMITS.questions) errors.questions = `Máximo ${LIMITS.questions} preguntas.`;

  const questions: DraftQuestion[] = rawQuestions.slice(0, LIMITS.questions).map((raw, qi) => {
    const q = isRecord(raw) ? raw : {};
    const type: LiveQuestionType = isType(q.type) ? q.type : "quiz";
    if (!isType(q.type)) errors[`q.${qi}.type`] = "Tipo de pregunta inválido.";

    const prompt = str(q.prompt);
    if (!prompt) errors[`q.${qi}.prompt`] = "Escribe la pregunta.";
    else if (prompt.length > LIMITS.prompt) errors[`q.${qi}.prompt`] = `Máximo ${LIMITS.prompt} caracteres.`;

    const timeLimit = Number(q.timeLimit);
    const validTime = (TIME_LIMITS as readonly number[]).includes(timeLimit);
    if (!validTime) errors[`q.${qi}.timeLimit`] = "Tiempo inválido.";

    const rawOptions = Array.isArray(q.options) ? q.options : [];
    let options: DraftOption[] = rawOptions.map((o) => ({
      text: str(isRecord(o) ? o.text : ""),
      correct: isRecord(o) && o.correct === true,
    }));

    if (type === "nube") {
      options = [];
    } else if (type === "vf") {
      // Los textos son fijos; solo importa cuál está marcada como correcta.
      const trueIsCorrect = options[1]?.correct !== true;
      options = VF_LABELS.map((text, i) => ({ text, correct: i === 0 ? trueIsCorrect : !trueIsCorrect }));
    } else {
      if (type === "encuesta") options = options.map((o) => ({ ...o, correct: false }));

      if (options.length < LIMITS.minOptions || options.length > LIMITS.maxOptions) {
        errors[`q.${qi}.options`] = `Usa entre ${LIMITS.minOptions} y ${LIMITS.maxOptions} opciones.`;
      } else if (type === "quiz" && !options.some((o) => o.correct)) {
        errors[`q.${qi}.options`] = "Marca al menos una respuesta correcta.";
      }
      options.forEach((o, oi) => {
        if (!o.text) errors[`q.${qi}.o.${oi}`] = "Escribe la opción.";
        else if (o.text.length > LIMITS.option) errors[`q.${qi}.o.${oi}`] = `Máximo ${LIMITS.option} caracteres.`;
      });
      const seen = new Set<string>();
      options.forEach((o, oi) => {
        const k = o.text.toLowerCase();
        if (k && seen.has(k)) errors[`q.${qi}.o.${oi}`] = "Opción repetida.";
        seen.add(k);
      });
    }

    return { type, prompt, timeLimit: validTime ? timeLimit : 20, options };
  });

  if (Object.keys(errors).length > 0) return { ok: false, errors };
  return { ok: true, draft: { title, description, companyId, questions } };
}
