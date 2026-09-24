// Tipos del módulo de experiencias interactivas (la biblioteca tipo Genially).
// Una experiencia es una escena programada (arte, animación y dónde está cada riesgo) con
// textos que el superadmin puede editar desde la biblioteca.

export type RiskCategory = "Biomecánico" | "Locativo" | "Tránsito" | "Psicosocial" | "Físico" | "Químico" | "Mecánico" | "Tecnológico" | "Eléctrico";

/** Lo editable de cada riesgo. `correct` es el índice de la opción correcta. */
export interface RiskTexts {
  title: string;
  prompt: string;
  options: [string, string, string];
  correct: 0 | 1 | 2;
  explanation: string;
  practice: string;
}

export interface RiskDef {
  id: string;
  category: RiskCategory;
  defaults: RiskTexts;
}

export interface ExperienceDef {
  key: string;
  /** Qué escena dibuja el cliente (src/components/experience/scenes). */
  scene: "finca" | "transporte" | "trilladora" | "tostion" | "tienda";
  tag: string;
  series: string;
  station: number;
  title: string;
  description: string;
  character: string;
  /** Texto del botón para empezar la estación. */
  enter: string;
  /** Insignia que se gana al completar la estación. */
  badge: string;
  minutes: string;
  risks: RiskDef[];
}

/** Lo que recibe el navegador del participante antes de responder: sin la respuesta. */
export interface PublicRisk {
  id: string;
  category: RiskCategory;
  prompt: string;
  options: [string, string, string];
}

/** El resultado de un riesgo ya respondido (o revelado al rendirse). */
export interface RiskResult {
  id: string;
  category: RiskCategory;
  title: string;
  correct: boolean;
  /** Nulo si se reveló sin encontrarlo. */
  chosen: number | null;
  correctIndex: number;
  explanation: string;
  practice: string;
}

export interface PublicExperience {
  key: string;
  scene: ExperienceDef["scene"];
  tag: string;
  series: string;
  station: number;
  title: string;
  description: string;
  character: string;
  enter: string;
  badge: string;
  risks: PublicRisk[];
}
