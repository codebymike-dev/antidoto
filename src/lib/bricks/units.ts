// Medidas del ladrillo (docs/investigacion-construccion-3d.md, sección 7.2).
// Unidades internas enteras: x y z en studs, y en placas (un ladrillo = 3 placas).
// En el mundo 3D, 1 unidad = 1 paso entre studs (8 mm). Toda conversión pasa por aquí, así que
// estilizar la proporción más adelante es cambiar este archivo.

export const MM = 1 / 8;

/** Alto de una placa en unidades de mundo (3,2 mm). */
export const PLATE_H = 3.2 * MM;
/** Holgura por cara: un 1x1 mide 7,8 mm, no 8. */
export const GAP = 0.1 * MM;
export const STUD_R = 2.4 * MM;
export const STUD_H = 1.7 * MM;

/** Placas que ocupa cada tipo de pieza. */
export const PLATES_PER_BRICK = 3;
