// Qué hay en cada zona de la carretera: el riesgo que se pregunta al tocarla o, si ahí
// todo está bien, un mensaje. Los ids de riesgo son los de src/lib/experiences/catalog.ts.

import type { Moment, SceneMap } from "./types.ts";

export const TRANSPORTE_MOMENTS: { id: Moment; label: string; hint: string }[] = [
  { id: 1, label: "Salir", hint: "Ramiro alista el yipao para salir de la finca." },
  { id: 2, label: "Manejar", hint: "Ramiro maneja por la carretera de montaña." },
  { id: 3, label: "Descargar", hint: "Ramiro llega a la cooperativa." },
];

/** Zona de la escena → riesgo, por momento. Una zona sin riesgo cae en TRANSPORTE_OK. */
export const TRANSPORTE_RISK_ZONES: Record<Moment, Record<string, string>> = {
  1: { carga: "sobrecarga", tono: "pasajero", llanta: "llanta" },
  2: { celular: "celular", pecho: "cinturon", cara: "fatiga", carga: "sobrecarga", tono: "pasajero", llanta: "llanta" },
  3: { ruedas: "freno", yipao: "freno", llanta: "llanta", carga: "sobrecarga", tono: "pasajero" },
};

/** Zonas donde todo está bien. */
export const TRANSPORTE_OK: Record<string, string> = {
  ramiro: "Ramiro está listo para arrancar. Revisa bien todo lo que lleva el yipao.",
  yipao: "El yipao, el caballito de batalla de la montaña. Aquí no hay riesgo.",
  casa: "La finca de Ramiro: de aquí sale el café pergamino.",
  cafetal: "Cafetales sembrados en la ladera. Aquí no hay riesgo.",
  senal: "La señal avisa una curva peligrosa: toca bajar la velocidad. Eso está bien.",
  barranco: "La vía no tiene defensa contra el barranco: razón de más para ir con cuidado.",
  saludo: "Ramiro saluda en la cooperativa. ¿Y cómo dejó el yipao?",
  cooperativa: "La cooperativa, donde se entrega y se vende el café.",
};

export const TRANSPORTE_ZONE_LABELS: Record<string, string> = {
  carga: "Carga",
  tono: "Toño",
  llanta: "Llanta delantera",
  ruedas: "Llantas traseras",
  celular: "Mano de Ramiro",
  pecho: "Pecho de Ramiro",
  cara: "Cara de Ramiro",
  ramiro: "Ramiro",
  saludo: "Ramiro",
  yipao: "Yipao",
  casa: "Finca",
  cafetal: "Cafetal",
  senal: "Señal",
  barranco: "Barranco",
  cooperativa: "Cooperativa",
};

export const TRANSPORTE_MAP: SceneMap = {
  moments: TRANSPORTE_MOMENTS,
  riskZones: TRANSPORTE_RISK_ZONES,
  ok: TRANSPORTE_OK,
  zoneLabels: TRANSPORTE_ZONE_LABELS,
  miss: "Aquí no hay nada raro. Mira a Ramiro, el yipao y lo que lleva encima.",
  start: "Toca donde veas un error. Cambia de momento del viaje en la barra de abajo.",
  place: "Ramiro maneja un yipao cargado de café por una carretera destapada de montaña.",
};
