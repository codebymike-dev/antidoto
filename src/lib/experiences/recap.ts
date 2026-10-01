// Resumen personal de quien terminó una ruta: cómo le fue y qué se lleva a su turno.
// Puro (sin base de datos) para poder probarlo; los datos los arma experience-data.ts.

import { riskTexts, score, type AnswerRow, type TextOverrides } from "./texts.ts";
import type { ExperienceDef, RiskCategory } from "./types.ts";

/** Cómo terminó un riesgo: a la primera, encontrado pero con otra opción, o revelado al rendirse. */
export type RecapStatus = "primera" | "otra" | "revelado";

export interface RecapRisk {
  id: string;
  title: string;
  category: RiskCategory;
  status: RecapStatus;
  /** Lo que eligió; nulo si se reveló sin encontrarlo. */
  yours: string | null;
  correct: string;
  explanation: string;
  practice: string;
}

export interface RecapStation {
  key: string;
  station: number;
  title: string;
  badge: string;
  character: string;
  /** Aciertos a la primera de la estación. */
  correct: number;
  risks: RecapRisk[];
}

export interface Recap {
  stations: RecapStation[];
  total: number;
  /** Riesgos encontrados (no cuenta los revelados). */
  found: number;
  correct: number;
  grains: number;
  /** Prácticas de lo que no salió a la primera: lo más útil para llevar al turno. */
  takeaways: { id: string; title: string; practice: string; station: number }[];
}

/** Cuántas prácticas se destacan al cierre; el resto se consulta en el repaso. */
export const MAX_TAKEAWAYS = 3;

export function buildRecap(stations: ExperienceDef[], overrides: Map<string, TextOverrides>, rows: AnswerRow[]): Recap {
  const byRisk = new Map(rows.map((r) => [r.risk_id, r]));
  const total = stations.reduce((n, d) => n + d.risks.length, 0);
  const s = score(rows, total);

  const out: RecapStation[] = stations.map((def) => {
    const risks: RecapRisk[] = [];
    for (const risk of def.risks) {
      const row = byRisk.get(risk.id);
      if (!row) continue;
      const t = riskTexts(risk, overrides.get(def.key) ?? new Map());
      risks.push({
        id: risk.id,
        title: t.title,
        category: risk.category,
        // La calificación guardada manda, igual que en el jugador.
        status: row.option_index === null ? "revelado" : row.is_correct === 1 ? "primera" : "otra",
        yours: row.option_index === null ? null : (t.options[row.option_index] ?? null),
        correct: t.options[t.correct],
        explanation: t.explanation,
        practice: t.practice,
      });
    }
    return {
      key: def.key,
      station: def.station,
      title: def.title,
      badge: def.badge,
      character: def.character,
      correct: risks.filter((r) => r.status === "primera").length,
      risks,
    };
  });

  // Primero lo que ni siquiera encontró, luego lo que encontró con otra opción.
  const rank: Record<RecapStatus, number> = { revelado: 0, otra: 1, primera: 2 };
  const takeaways = out
    .flatMap((st) => st.risks.map((r) => ({ r, station: st.station })))
    .filter(({ r }) => r.status !== "primera")
    .sort((a, b) => rank[a.r.status] - rank[b.r.status])
    .slice(0, MAX_TAKEAWAYS)
    .map(({ r, station }) => ({ id: r.id, title: r.title, practice: r.practice, station }));

  return {
    stations: out,
    total,
    found: s.answered - s.revealed,
    correct: s.correct,
    grains: s.grains,
    takeaways,
  };
}
