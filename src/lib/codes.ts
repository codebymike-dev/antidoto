// Forma corta de los códigos de actividad. Antes se generaban como MISIÓN-EMPRESA-XXXXXX
// (MI-JUAN-SJAN3E); ahora son solo los 6 caracteres aleatorios. Los largos que ya se
// repartieron siguen sirviendo: se reconocen por su último tramo.

/** Largo de un código nuevo. */
export const CODE_LENGTH = 6;

/** Lo que teclea o pega el participante, sin espacios y en mayúsculas. */
export function cleanCode(raw: string): string {
  return raw.toUpperCase().replace(/\s+/g, "");
}

/**
 * La forma corta de un código: el último tramo de uno largo generado por el portal, que
 * siempre termina en 6 caracteres. Un código hecho a mano con otro final queda igual.
 */
export function shortCode(raw: string): string {
  const clean = cleanCode(raw);
  const tail = clean.slice(clean.lastIndexOf("-") + 1);
  return clean.includes("-") && tail.length === CODE_LENGTH ? tail : clean;
}
