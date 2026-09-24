// Catálogo de experiencias de la biblioteca. Los textos de aquí son los de fábrica: el
// superadmin los puede editar desde /admin/biblioteca y la edición se guarda en
// experience_risk_texts. Este archivo trae las respuestas correctas: solo lo importa el
// servidor (el navegador del participante recibe PublicRisk, sin la respuesta).
//
// Fuentes del contenido en docs/investigacion-ux-habbo.md, sección 6.

import type { ExperienceDef } from "./types";

export const RUTA_CAFE_FINCA: ExperienceDef = {
  key: "ruta-cafe-finca",
  scene: "finca",
  tag: "SEMANA DE LA SALUD",
  series: "Ruta del café",
  station: 1,
  title: "La finca: recolección",
  description:
    "Ramiro, recolector, sube un bulto de café cereza al beneficiadero. Obsérvalo y encuentra los errores en su forma de trabajar que ponen en riesgo su cuerpo.",
  character: "Ramiro",
  minutes: "5 a 8 min",
  risks: [
    {
      id: "espalda",
      category: "Biomecánico",
      defaults: {
        title: "Espalda doblada, piernas rectas",
        prompt: "¿Qué está mal en la forma en que Ramiro se agacha?",
        options: [
          "Se agacha demasiado despacio",
          "Dobla la espalda con las piernas rectas, en vez de flexionar las rodillas",
          "Debería levantar el bulto con una sola mano para no cansarse",
        ],
        correct: 1,
        explanation:
          "Al agacharse doblando la cintura, todo el peso cae sobre los discos de la zona lumbar. Es la postura más común entre los recolectores y la lumbalgia es su lesión más frecuente.",
        practice: "Pies separados al ancho de los hombros, flexiona rodillas y cadera, espalda recta y sube con la fuerza de las piernas.",
      },
    },
    {
      id: "carga-lejos",
      category: "Biomecánico",
      defaults: {
        title: "Carga lejos del cuerpo",
        prompt: "Mira sus brazos y el bulto. ¿Qué error ves?",
        options: [
          "Agarra el bulto con los brazos estirados, lejos del cuerpo",
          "Tiene las manos sucias de tierra",
          "Usa las dos manos para agarrarlo",
        ],
        correct: 0,
        explanation:
          "Cuanto más lejos del cuerpo está la carga, más trabaja la espalda. Según la ecuación de levantamiento de NIOSH, alejarla de 25 a 50 cm reduce a la mitad el peso que se puede levantar con seguridad.",
        practice: "Acércate hasta tener el bulto entre los pies y levántalo pegado al cuerpo.",
      },
    },
    {
      id: "sobrepeso",
      category: "Biomecánico",
      defaults: {
        title: "Bulto demasiado pesado",
        prompt: "Fíjate en el bulto. ¿Cuál es el problema?",
        options: [
          "El costal es de fique y no de plástico",
          "Tiene cereza madura mezclada con verde",
          "Está lleno a tope: pesa más de lo que una persona debe levantar sola",
        ],
        correct: 2,
        explanation:
          "La Resolución 2400 de 1979 (art. 392) fija en 25 kg la carga compacta máxima que puede levantar un hombre y en 12,5 kg la de una mujer. Un costal lleno de café cereza supera con facilidad ese límite.",
        practice: "Divide la carga en bultos de máximo 25 kg (12,5 kg si eres mujer) o levántala entre dos.",
      },
    },
    {
      id: "torsion",
      category: "Biomecánico",
      defaults: {
        title: "Gira la cintura con la carga",
        prompt: "Al subir el bulto, ¿qué hace mal con su cuerpo?",
        options: [
          "Mira hacia donde va a llevar el bulto",
          "Gira la cintura con el bulto en las manos en vez de mover los pies",
          "Respira mientras hace fuerza",
        ],
        correct: 1,
        explanation:
          "Torcer el tronco con peso encima suma dos esfuerzos sobre la columna. En la ecuación de NIOSH, girar 90° reduce casi un 30 % el peso que se puede levantar con seguridad. Y hacerlo de un tirón puede desgarrar un músculo.",
        practice: "Primero levanta y después gira dando pasos cortos: nariz, pecho y pies miran al mismo lado.",
      },
    },
    {
      id: "mula",
      category: "Biomecánico",
      defaults: {
        title: "No usa la ayuda disponible",
        prompt: "En la finca hay algo que le podría ayudar. ¿Qué pasa?",
        options: [
          "La mula está descansando a la sombra",
          "Debería cargar dos bultos a la vez para terminar rápido",
          "Tiene una mula para llevar el bulto y no la usa",
        ],
        correct: 2,
        explanation:
          "Las ayudas mecánicas existen para que la espalda no haga el trabajo: la mula, la garrucha, el cable aéreo o una carretilla. En ladera, cargar al hombro hasta el beneficiadero es de lo que más desgasta.",
        practice: "Usa la mula o la ayuda que tengas; si no hay ninguna, pide la mano de un compañero y levanten entre dos.",
      },
    },
    {
      id: "calzado",
      category: "Locativo",
      defaults: {
        title: "Chanclas en terreno con barro",
        prompt: "Mira sus pies y el suelo. ¿Qué riesgo ves?",
        options: [
          "Usa chanclas en una ladera con barro: puede resbalar y caer con el bulto",
          "Tiene los pies muy separados",
          "Pisa el pasto en vez del camino",
        ],
        correct: 0,
        explanation:
          "En una finca de ladera el barro y las raíces vuelven cada paso un riesgo de caída, y con un bulto encima una caída puede terminar en esguince o fractura. Las chanclas no agarran ni protegen el pie.",
        practice: "Usa botas de caucho con suela labrada: agarran el terreno y protegen de golpes, picaduras y mordeduras.",
      },
    },
    {
      id: "cuello",
      category: "Biomecánico",
      defaults: {
        title: "Carga sobre la nuca",
        prompt: "Mira cómo lleva el bulto. ¿Qué está mal?",
        options: [
          "Camina muy despacio",
          "Lo lleva sobre la nuca con el cuello doblado y sin ver bien el camino",
          "Se seca el sudor con la mano",
        ],
        correct: 1,
        explanation:
          "Llevar el peso sobre la nuca obliga al cuello a doblarse durante todo el trayecto: contracturas y dolor cervical. Además le tapa la vista del camino justo donde más se resbala.",
        practice: "Si lo cargas tú, que sea poco peso, pegado al cuerpo y con la cabeza erguida. Mejor aún: que lo lleve la mula.",
      },
    },
  ],
};

export const EXPERIENCES: ExperienceDef[] = [RUTA_CAFE_FINCA];

export function getExperience(key: string): ExperienceDef | null {
  return EXPERIENCES.find((e) => e.key === key) ?? null;
}

/** Id fijo de la misión que representa a cada experiencia en actividades y códigos. */
export function experienceMissionId(key: string): string {
  return `exp-${key}`;
}
