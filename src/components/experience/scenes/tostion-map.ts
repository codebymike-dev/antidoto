// Qué hay en cada zona de la tostión: el riesgo que se pregunta al tocarla o, si ahí
// todo está bien, un mensaje. Los ids de riesgo son los de src/lib/experiences/catalog.ts.

import type { Moment, SceneMap } from "./types.ts";

export const TOSTION_MOMENTS: { id: Moment; label: string; hint: string }[] = [
  { id: 1, label: "Preparar", hint: "Luz alista la tostadora antes de prenderla." },
  { id: 2, label: "Tostar", hint: "Luz tuesta y saca una muestra del tambor." },
  { id: 3, label: "Enfriar", hint: "El café tostado se enfría en la bandeja." },
];

/** Zona de la escena → riesgo, por momento. Una zona sin riesgo cae en TOSTION_OK. */
export const TOSTION_RISK_ZONES: Record<Moment, Record<string, string>> = {
  1: { encendedor: "gas", cilindro: "gas", cable: "cable", colector: "cascarilla", cascarilla: "cascarilla" },
  2: { humo: "humo", extractor: "humo", mano: "quemadura", muestra: "quemadura", colector: "cascarilla", cilindro: "gas" },
  3: { pelo: "pelo", aspas: "pelo", granos: "granos", humo: "humo", cable: "cable" },
};

/** Zonas donde todo está bien. */
export const TOSTION_OK: Record<string, string> = {
  tostadora: "La tostadora de tambor: aquí el café verde se vuelve café tostado.",
  molino: "El molino, sobre su mesa. Aquí no hay riesgo.",
  estante: "Café tostado empacado y bien ordenado en el estante.",
  extintor: "El extintor, a la vista y a la mano. Eso está bien.",
  bandeja: "La bandeja de enfriamiento: las aspas revuelven el grano para que se enfríe parejo.",
  luz: "Luz, la maestra tostadora, alista la tanda del día.",
  ventana: "Buena luz natural en la planta. Aquí no hay riesgo.",
};

export const TOSTION_ZONE_LABELS: Record<string, string> = {
  encendedor: "Mano de Luz",
  cilindro: "Cilindro de gas",
  cable: "Cable eléctrico",
  colector: "Colector de cascarilla",
  cascarilla: "Cascarilla en el piso",
  humo: "Aire de la planta",
  extractor: "Extractor",
  mano: "Mano de Luz",
  muestra: "Cuchara de muestreo",
  pelo: "Pelo de Luz",
  aspas: "Aspas de la bandeja",
  granos: "Piso",
  tostadora: "Tostadora",
  molino: "Molino",
  estante: "Estante",
  extintor: "Extintor",
  bandeja: "Bandeja de enfriamiento",
  luz: "Luz",
  ventana: "Ventana",
};

export const TOSTION_MAP: SceneMap = {
  moments: TOSTION_MOMENTS,
  riskZones: TOSTION_RISK_ZONES,
  ok: TOSTION_OK,
  zoneLabels: TOSTION_ZONE_LABELS,
  miss: "Aquí no hay nada raro. Mira a Luz, las máquinas y el aire de la planta.",
  start: "Toca donde veas un error. Cambia de momento en la barra de abajo.",
  place: "Luz trabaja en una planta de tostión de café con la tostadora de tambor, el gas y la bandeja de enfriamiento.",
  speaker: "luz",
};
