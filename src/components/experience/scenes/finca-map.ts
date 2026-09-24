// Qué hay en cada zona de la finca: el riesgo que se pregunta al tocarla o, si ahí todo
// está bien, un mensaje (como en las imágenes interactivas de Genially, todo clic
// responde). Los ids de riesgo son los de src/lib/experiences/catalog.ts.

import type { Moment, SceneMap } from "./types.ts";

export const FINCA_MOMENTS: { id: Moment; label: string; hint: string }[] = [
  { id: 1, label: "Agarrar", hint: "Ramiro se agacha a agarrar el bulto." },
  { id: 2, label: "Subir", hint: "Ramiro sube el bulto hacia el hombro." },
  { id: 3, label: "Llevar", hint: "Ramiro lleva el bulto al beneficiadero." },
];

/** Zona de la escena → riesgo, por momento. Una zona sin riesgo cae en FINCA_OK. */
export const FINCA_RISK_ZONES: Record<Moment, Record<string, string>> = {
  1: { espalda: "espalda", piernas: "espalda", brazos: "carga-lejos", bulto: "sobrepeso", mula: "mula", pies: "calzado" },
  2: { cintura: "torsion", bulto: "sobrepeso", mula: "mula", pies: "calzado" },
  3: { cuello: "cuello", bulto: "cuello", mula: "mula", pies: "calzado", barro: "calzado" },
};

/** Zonas donde todo está bien. */
export const FINCA_OK: Record<string, string> = {
  sombrero: "El sombrero lo protege del sol todo el día. Eso está bien.",
  canasto: "El canasto de recolección está en su sitio. Aquí no hay riesgo.",
  cafetal: "Cafetos cargados de cereza madura. Aquí no hay riesgo.",
  casa: "La casa y el beneficiadero: allá tiene que llegar el café.",
};

/** Nombre de cada zona para el menú de zonas (teclado y pantallas pequeñas). */
export const FINCA_ZONE_LABELS: Record<string, string> = {
  espalda: "Espalda",
  piernas: "Piernas",
  brazos: "Brazos",
  cintura: "Cintura",
  cuello: "Cuello",
  bulto: "Bulto",
  pies: "Pies",
  barro: "Barro del camino",
  mula: "Mula",
  sombrero: "Sombrero",
  canasto: "Canasto",
  cafetal: "Cafetal",
  casa: "Casa",
};

export const FINCA_MAP: SceneMap = {
  moments: FINCA_MOMENTS,
  riskZones: FINCA_RISK_ZONES,
  ok: FINCA_OK,
  zoneLabels: FINCA_ZONE_LABELS,
  miss: "Aquí no hay nada raro. Mira a Ramiro, lo que carga y lo que lo rodea.",
  start: "Toca donde veas un error. Cambia de momento en la barra de abajo.",
  place: "Ramiro en una finca cafetera de ladera.",
};
