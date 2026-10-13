// Paleta de ladrillos: los colores de LEGO, con sus nombres oficiales en español y los valores
// de pantalla de la referencia que usan BrickLink Studio, LDraw y Rebrickable (los RGB "de
// imprenta" de LEGO se ven apagados en pantalla). Pedido del usuario el 2026-10-13: que se vean
// como fichas de LEGO de verdad, no colores inventados.
//
// El índice del arreglo es lo que se serializa: no reordenar ni quitar, solo agregar al final.

export type BrickFamily = "Neutros" | "Azules" | "Cálidos" | "Rosas" | "Verdes" | "Tierras" | "Especiales";
export type BrickFinish = "abs" | "metal" | "trans";

export interface BrickColor {
  name: string;
  hex: string;
  family: BrickFamily;
  finish: BrickFinish;
  /** Va en la fila esencial que se ve sin abrir el panel completo. */
  essential: boolean;
}

export const BRICK_COLORS: readonly BrickColor[] = [
  { name: "Blanco", hex: "#F4F4F4", family: "Neutros", finish: "abs", essential: true },
  { name: "Gris piedra claro", hex: "#A0A5A9", family: "Neutros", finish: "abs", essential: true },
  { name: "Gris piedra oscuro", hex: "#6C6E68", family: "Neutros", finish: "abs", essential: false },
  { name: "Negro", hex: "#1B2A34", family: "Neutros", finish: "abs", essential: true },
  { name: "Azul celeste medio", hex: "#36AEBF", family: "Azules", finish: "abs", essential: false },
  { name: "Azul celeste oscuro", hex: "#078BC9", family: "Azules", finish: "abs", essential: false },
  { name: "Azul brillante", hex: "#0055BF", family: "Azules", finish: "abs", essential: true },
  { name: "Azul oscuro", hex: "#0A3463", family: "Azules", finish: "abs", essential: false },
  { name: "Rojo brillante", hex: "#C91A09", family: "Cálidos", finish: "abs", essential: true },
  { name: "Naranja brillante", hex: "#FE8A18", family: "Cálidos", finish: "abs", essential: true },
  { name: "Amarillo brillante", hex: "#FAC80A", family: "Cálidos", finish: "abs", essential: true },
  { name: "Coral", hex: "#FF698F", family: "Rosas", finish: "abs", essential: false },
  { name: "Magenta", hex: "#923978", family: "Rosas", finish: "abs", essential: false },
  { name: "Lavanda media", hex: "#AC78BA", family: "Rosas", finish: "abs", essential: false },
  { name: "Verde lima", hex: "#BBE90B", family: "Verdes", finish: "abs", essential: true },
  { name: "Verde", hex: "#237841", family: "Verdes", finish: "abs", essential: true },
  { name: "Verde arena", hex: "#A0BCAC", family: "Verdes", finish: "abs", essential: false },
  { name: "Beige", hex: "#E4CD9E", family: "Tierras", finish: "abs", essential: true },
  { name: "Turrón medio", hex: "#AA7D55", family: "Tierras", finish: "abs", essential: false },
  { name: "Marrón rojizo", hex: "#582A12", family: "Tierras", finish: "abs", essential: true },
  { name: "Oro perlado", hex: "#AA7F2E", family: "Especiales", finish: "metal", essential: false },
  { name: "Transparente", hex: "#FCFCFC", family: "Especiales", finish: "trans", essential: false },
  { name: "Azul claro transparente", hex: "#AEEFEC", family: "Especiales", finish: "trans", essential: false },
];

/** Índice de un color por nombre; falla en desarrollo si el nombre no existe. */
export function colorIndex(name: string): number {
  const i = BRICK_COLORS.findIndex((c) => c.name === name);
  if (i < 0) throw new Error(`Color de ladrillo desconocido: ${name}`);
  return i;
}
