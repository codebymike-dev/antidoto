// Qué hay en cada zona de la trilladora: el riesgo que se pregunta al tocarla o, si ahí
// todo está bien, un mensaje. Los ids de riesgo son los de src/lib/experiences/catalog.ts.

import type { Moment, SceneMap } from "./types.ts";

export const TRILLADORA_MOMENTS: { id: Moment; label: string; hint: string }[] = [
  { id: 1, label: "Recibir", hint: "Fabio recibe los sacos y los arruma en la bodega." },
  { id: 2, label: "Trillar", hint: "Fabio trabaja junto a la trilladora en marcha." },
  { id: 3, label: "Destrabar", hint: "La salida de la trilladora se atascó." },
];

/** Zona de la escena → riesgo, por momento. Una zona sin riesgo cae en TRILLADORA_OK. */
export const TRILLADORA_RISK_ZONES: Record<Moment, Record<string, string>> = {
  1: { saco: "saco", espalda: "saco", arrume: "arrume", montacargas: "montacargas" },
  2: { orejas: "ruido", cara: "polvo", polvo: "polvo", correa: "guarda", mano: "guarda", arrume: "arrume", montacargas: "montacargas" },
  3: { brazo: "bloqueo", tablero: "bloqueo", salida: "bloqueo", orejas: "ruido", cara: "polvo", correa: "guarda", arrume: "arrume" },
};

/** Zonas donde todo está bien. */
export const TRILLADORA_OK: Record<string, string> = {
  puerta: "La puerta de cargue: por aquí entra el pergamino de las fincas.",
  trilladora: "La trilladora le quita la cáscara al pergamino y deja el café verde.",
  tolva: "La tolva recibe el café pergamino que se va a trillar.",
  ventana: "Buena luz natural en la bodega. Aquí no hay riesgo.",
  tablero: "El tablero eléctrico de la trilladora, cerrado y señalizado.",
  extintor: "El extintor, a la vista y sin nada que lo tape. Eso está bien.",
};

export const TRILLADORA_ZONE_LABELS: Record<string, string> = {
  saco: "Saco",
  espalda: "Espalda de Fabio",
  arrume: "Arrume de sacos",
  montacargas: "Montacargas",
  orejas: "Orejas de Fabio",
  cara: "Cara de Fabio",
  polvo: "Polvo",
  correa: "Correa y poleas",
  mano: "Mano de Fabio",
  brazo: "Brazo de Fabio",
  salida: "Salida del café",
  tablero: "Tablero eléctrico",
  puerta: "Puerta de cargue",
  trilladora: "Trilladora",
  tolva: "Tolva",
  ventana: "Ventana",
  extintor: "Extintor",
};

export const TRILLADORA_MAP: SceneMap = {
  moments: TRILLADORA_MOMENTS,
  riskZones: TRILLADORA_RISK_ZONES,
  ok: TRILLADORA_OK,
  zoneLabels: TRILLADORA_ZONE_LABELS,
  miss: "Aquí no hay nada raro. Mira a Fabio, la máquina y lo que pasa en la bodega.",
  start: "Toca donde veas un error. Cambia de momento en la barra de abajo.",
  place: "Fabio trabaja en la bodega de una trilladora de café, con la máquina, sacos y un montacargas.",
  speaker: "fabio",
};
