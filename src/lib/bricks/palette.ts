// Paleta de ladrillos de Bricks Serious Play. Sale de docs/investigacion-construccion-3d.md
// (sección 4.3): 23 colores en familias, con la familia Antídoto completa y nombres
// colombianos. Las notas de daltonismo de cada color están en ese documento.
//
// Los hex no se cambian una vez publicados: las obras guardadas los delatarían (lección del
// cambio de grises de LEGO en 2004). El índice del arreglo es lo que se serializa.

export type BrickFamily = "Neutros" | "Antídoto" | "Cálidos" | "Rosas" | "Verdes" | "Tierras" | "Especiales";
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
  { name: "Blanco Nube", hex: "#F4F4F4", family: "Neutros", finish: "abs", essential: true },
  { name: "Gris Neblina", hex: "#A0A5A9", family: "Neutros", finish: "abs", essential: true },
  { name: "Gris Asfalto", hex: "#5B6168", family: "Neutros", finish: "abs", essential: false },
  { name: "Noche", hex: "#1A242B", family: "Neutros", finish: "abs", essential: true },
  { name: "Cielo Antídoto", hex: "#80DCFF", family: "Antídoto", finish: "abs", essential: false },
  { name: "Celeste Antídoto", hex: "#3BC8F3", family: "Antídoto", finish: "abs", essential: true },
  { name: "Azul Antídoto", hex: "#1C99CA", family: "Antídoto", finish: "abs", essential: false },
  { name: "Abismo Antídoto", hex: "#0C5C7D", family: "Antídoto", finish: "abs", essential: true },
  { name: "Rojo Volcán", hex: "#C91A09", family: "Cálidos", finish: "abs", essential: true },
  { name: "Mandarina", hex: "#F57A12", family: "Cálidos", finish: "abs", essential: true },
  { name: "Girasol", hex: "#FAC80A", family: "Cálidos", finish: "abs", essential: true },
  { name: "Guayaba", hex: "#FF6D77", family: "Rosas", finish: "abs", essential: false },
  { name: "Pitaya", hex: "#D3359D", family: "Rosas", finish: "abs", essential: false },
  { name: "Orquídea", hex: "#A06EB9", family: "Rosas", finish: "abs", essential: true },
  { name: "Limoncillo", hex: "#C2E15A", family: "Verdes", finish: "abs", essential: false },
  { name: "Verde Cafetal", hex: "#00852B", family: "Verdes", finish: "abs", essential: true },
  { name: "Musgo Andino", hex: "#5E7E6E", family: "Verdes", finish: "abs", essential: false },
  { name: "Arena Caribe", hex: "#D7BA8C", family: "Tierras", finish: "abs", essential: false },
  { name: "Panela", hex: "#AA7D55", family: "Tierras", finish: "abs", essential: false },
  { name: "Café Tinto", hex: "#5F3109", family: "Tierras", finish: "abs", essential: false },
  { name: "Oro Muisca", hex: "#AA7F2E", family: "Especiales", finish: "metal", essential: false },
  { name: "Cristal", hex: "#FCFCFC", family: "Especiales", finish: "trans", essential: false },
  { name: "Cristal Celeste", hex: "#9FE3FA", family: "Especiales", finish: "trans", essential: false },
];

/** Índice de un color por nombre; falla en desarrollo si el nombre no existe. */
export function colorIndex(name: string): number {
  const i = BRICK_COLORS.findIndex((c) => c.name === name);
  if (i < 0) throw new Error(`Color de ladrillo desconocido: ${name}`);
  return i;
}
