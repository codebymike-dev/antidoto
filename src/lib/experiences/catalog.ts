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
  enter: "Entrar a la finca",
  badge: "Recolector seguro",
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
        practice:
          "Pies separados al ancho de los hombros, flexiona rodillas y cadera, espalda recta y sube con la fuerza de las piernas.",
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
        practice:
          "Si lo cargas tú, que sea poco peso, pegado al cuerpo y con la cabeza erguida. Mejor aún: que lo lleve la mula.",
      },
    },
  ],
};

// Fuentes: Ley 769 de 2002 (Código Nacional de Tránsito) y Resolución 40595 de 2022 del
// Ministerio de Transporte (metodología del PESV). Detalle en docs/investigacion-ux-habbo.md.
export const RUTA_CAFE_TRANSPORTE: ExperienceDef = {
  key: "ruta-cafe-transporte",
  scene: "transporte",
  tag: "SEMANA DE LA SALUD",
  series: "Ruta del café",
  station: 2,
  title: "El transporte: al volante",
  description:
    "Ramiro lleva el café pergamino en su yipao por una carretera de montaña hasta la cooperativa. Encuentra los errores del viaje: antes de salir, al volante y al descargar.",
  character: "Ramiro",
  enter: "Subir al yipao",
  badge: "Conductor seguro",
  minutes: "5 a 8 min",
  risks: [
    {
      id: "sobrecarga",
      category: "Tránsito",
      defaults: {
        title: "Carga alta y sin amarrar",
        prompt: "Mira la carga del yipao. ¿Qué está mal?",
        options: [
          "Los bultos son de fique y no de plástico",
          "Los bultos pasan por encima de la carrocería y van sueltos, sin amarrar",
          "La carga va en la parte de atrás",
        ],
        correct: 1,
        explanation:
          "Apilar por encima de la carrocería sube el centro de gravedad: en una curva de montaña el yipao se puede voltear, y un bulto suelto que cae a la vía causa otro accidente. El Código de Tránsito (Ley 769 de 2002, art. 131, C.21) sanciona no asegurar la carga.",
        practice:
          "Respeta la capacidad del vehículo, no apiles por encima de la carrocería y amarra la carga con lazos o una carpa antes de salir.",
      },
    },
    {
      id: "pasajero",
      category: "Tránsito",
      defaults: {
        title: "Un pasajero encima de la carga",
        prompt: "¿Qué pasa con Toño, el ayudante?",
        options: [
          "Viaja sentado encima de los bultos, fuera de la cabina",
          "No se quitó el sombrero",
          "Va mirando el paisaje",
        ],
        correct: 0,
        explanation:
          "Encima de la carga no hay nada que lo sujete: un frenazo, un hueco o una curva lo tiran a la vía o al barranco. La Ley 769 de 2002 prohíbe llevar pasajeros fuera de la cabina o en los estribos (art. 83) y sobre la plataforma de un vehículo de carga (art. 131, C.37).",
        practice: "Todos viajan dentro de la cabina, sentados y con cinturón. Si no hay cupo, Toño se va en el siguiente viaje.",
      },
    },
    {
      id: "llanta",
      category: "Tránsito",
      defaults: {
        title: "Llanta lisa y desinflada",
        prompt: "Mira la llanta delantera. ¿Qué ves?",
        options: [
          "Está sucia de barro",
          "Tiene el rin pintado de otro color",
          "Está lisa y bajita de aire: nadie revisó el vehículo antes de salir",
        ],
        correct: 2,
        explanation:
          "Una llanta lisa no agarra en la tierra mojada ni frena a tiempo, y una desinflada se puede reventar con el peso. La Ley 769 de 2002 (art. 28) exige llantas en buen estado, y el PESV (Resolución 40595 de 2022) pide una inspección preoperacional antes de salir.",
        practice:
          "Antes de arrancar revisa llantas (aire y labrado), frenos, luces, dirección y fluidos. Si algo falla, no sales hasta arreglarlo.",
      },
    },
    {
      id: "celular",
      category: "Tránsito",
      defaults: {
        title: "Habla por celular al manejar",
        prompt: "Mira las manos de Ramiro. ¿Qué error ves?",
        options: [
          "Lleva el reloj en la mano izquierda",
          "Maneja con una sola mano porque con la otra habla por celular",
          "Agarra el volante con mucha fuerza",
        ],
        correct: 1,
        explanation:
          "Hablar por teléfono le quita la atención a la vía y deja una sola mano en el volante, justo en una carretera de curvas y huecos. La Ley 769 de 2002 (art. 131, C.38) prohíbe usar el celular al conducir, salvo con manos libres.",
        practice:
          "Guarda el celular mientras manejas. Si tienes que contestar, orilla el vehículo en un lugar seguro y detente.",
      },
    },
    {
      id: "cinturon",
      category: "Tránsito",
      defaults: {
        title: "Sin cinturón de seguridad",
        prompt: "Fíjate en el pecho de Ramiro. ¿Qué le falta?",
        options: ["El cinturón de seguridad", "Una chaqueta para el frío", "El carné de la cooperativa"],
        correct: 0,
        explanation:
          "En un volcamiento o un choque, sin cinturón el cuerpo sale disparado contra el volante, el vidrio o fuera del vehículo. Es obligatorio para el conductor y los pasajeros de adelante en todas las vías (Ley 769 de 2002, art. 82).",
        practice:
          "Abróchate el cinturón antes de encender, aunque el viaje sea corto: una banda cruzada por el pecho y el hombro, y la otra por la cadera.",
      },
    },
    {
      id: "fatiga",
      category: "Psicosocial",
      defaults: {
        title: "Maneja con sueño",
        prompt: "Mira la cara de Ramiro. ¿Qué te dice?",
        options: [
          "Está contento porque ya va a llegar",
          "El sombrero le queda apretado",
          "Bosteza y se le cierran los ojos: maneja cansado",
        ],
        correct: 2,
        explanation:
          "Ramiro recoge café desde las 4 de la mañana y ahora maneja. Con sueño se reacciona tarde y hasta llegan microsueños de unos segundos, suficientes para salirse de la vía. El PESV (Resolución 40595 de 2022) pide controlar las horas de conducción, los descansos y las pausas.",
        practice:
          "Descansa bien antes de manejar. Si te da sueño, detente en un lugar seguro, baja, camina y toma una pausa. Después de una jornada larga, que maneje otro.",
      },
    },
    {
      id: "freno",
      category: "Tránsito",
      defaults: {
        title: "En bajada sin freno ni tacos",
        prompt: "Ramiro se bajó a descargar. ¿Qué hizo mal con el yipao?",
        options: [
          "Lo dejó mirando hacia la cooperativa",
          "Lo dejó en la bajada sin freno de mano ni tacos, y se está rodando",
          "Apagó el radio",
        ],
        correct: 1,
        explanation:
          "En pendiente, un vehículo sin freno de mano ni cambio puesto se puede rodar y atropellar a quien descarga o pasa por la vía. Por eso la Ley 769 de 2002 (art. 30) exige llevar dos tacos para bloquear las llantas.",
        practice:
          "Apaga, pon el freno de mano y un cambio, gira las llantas hacia la orilla y calza con los tacos antes de bajarte.",
      },
    },
  ],
};

export const EXPERIENCES: ExperienceDef[] = [RUTA_CAFE_FINCA, RUTA_CAFE_TRANSPORTE];

export function getExperience(key: string): ExperienceDef | null {
  return EXPERIENCES.find((e) => e.key === key) ?? null;
}

/**
 * Las estaciones que se juegan con el mismo código, desde `def` hasta el final de su
 * serie: al terminar una se desbloquea la siguiente. Los ids de riesgo son únicos en toda
 * la serie, así las respuestas de todas las estaciones caben en la misma participación.
 */
export function seriesFrom(def: ExperienceDef): ExperienceDef[] {
  return EXPERIENCES.filter((e) => e.series === def.series && e.station >= def.station).sort((a, b) => a.station - b.station);
}

/** La primera estación de la serie: la única que se asigna a una empresa con un código. */
export function seriesEntry(def: ExperienceDef): ExperienceDef {
  return EXPERIENCES.filter((e) => e.series === def.series).sort((a, b) => a.station - b.station)[0];
}

/** Id fijo de la misión que representa a cada experiencia en actividades y códigos. */
export function experienceMissionId(key: string): string {
  return `exp-${key}`;
}
