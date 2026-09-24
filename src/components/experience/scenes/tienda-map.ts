// Qué hay en cada zona de la tienda: el riesgo que se pregunta al tocarla o, si ahí todo
// está bien, un mensaje. Los ids de riesgo son los de src/lib/experiences/catalog.ts.

import type { Moment, SceneMap } from "./types.ts";

export const TIENDA_MOMENTS: { id: Moment; label: string; hint: string }[] = [
  { id: 1, label: "Abrir", hint: "Sara alista la tienda antes de abrir." },
  { id: 2, label: "Preparar", hint: "Sara prepara las bebidas en la barra." },
  { id: 3, label: "Atender", hint: "Llega la hora pico." },
];

/** Zona de la escena → riesgo, por momento. Una zona sin riesgo cae en TIENDA_OK. */
export const TIENDA_RISK_ZONES: Record<Moment, Record<string, string>> = {
  1: { pies: "chanclas", charco: "piso", regleta: "enchufe" },
  2: { mano: "vapor", lanceta: "vapor", lavaplatos: "cuchillo", regleta: "enchufe" },
  3: { silla: "silla", sara: "silla", fila: "estres", cliente: "estres", charco: "piso" },
};

/** Zonas donde todo está bien. */
export const TIENDA_OK: Record<string, string> = {
  maquina: "La máquina de espresso: aquí el café llega a la taza.",
  vitrina: "La vitrina con los postres del día. Aquí no hay riesgo.",
  caja: "La caja registradora, lista para atender.",
  tablero: "El tablero con el menú del día.",
  puerta: "La entrada de la tienda.",
  extintor: "El extintor, a la vista y sin nada que lo tape. Eso está bien.",
  sara: "Sara, la barista, alista la barra.",
  balde: "El balde con el agua de trapear.",
  estante: "El estante de los vasos y las tazas.",
};

export const TIENDA_ZONE_LABELS: Record<string, string> = {
  pies: "Pies de Sara",
  charco: "Piso",
  regleta: "Regleta",
  mano: "Mano de Sara",
  lanceta: "Lanceta de vapor",
  lavaplatos: "Lavaplatos",
  silla: "Butaco",
  sara: "Sara",
  fila: "Fila de clientes",
  cliente: "Cliente",
  maquina: "Máquina de espresso",
  vitrina: "Vitrina",
  caja: "Caja",
  tablero: "Tablero del menú",
  puerta: "Puerta",
  extintor: "Extintor",
  balde: "Balde",
  estante: "Estante",
};

export const TIENDA_MAP: SceneMap = {
  moments: TIENDA_MOMENTS,
  riskZones: TIENDA_RISK_ZONES,
  ok: TIENDA_OK,
  zoneLabels: TIENDA_ZONE_LABELS,
  miss: "Aquí no hay nada raro. Mira a Sara, la barra y a los clientes.",
  start: "Toca donde veas un error. Cambia de momento en la barra de abajo.",
  place: "Sara trabaja en la barra de una tienda de café, con la máquina de espresso, el lavaplatos y los clientes.",
  speaker: "sara",
};
