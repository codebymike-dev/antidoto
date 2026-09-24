# Investigación UX: Habbo Hotel y Genially para las escenas interactivas

Base de diseño del módulo de experiencias interactivas (la biblioteca tipo Genially) y
de su primera escena: la **Ruta del café, estación 1: la finca**, para la Semana de la
Salud de Juan Valdez. Investigado el 2026-09-23.

## 1. Qué tomamos de Genially

Genially organiza su biblioteca de plantillas por **tipo de contenido** (presentaciones,
microlearning, imágenes interactivas, juegos, escape rooms, quiz) y por **uso** (e-learning,
recursos humanos, empresa). Las mecánicas de juego que más se repiten son:

- **Imagen interactiva**: una escena con puntos que se tocan y abren información.
- **Encuentra las diferencias / los errores**: tocar lo que está mal en una ilustración.
- **Quiz sobre imagen** y **revelar respuestas**.
- **Escape room** con estaciones que se desbloquean.

Lo que adoptamos:

1. Una **biblioteca** en el admin con tarjetas, vista previa y uso por empresa (código de
   actividad), como el catálogo de plantillas.
2. La mecánica **encuentra los errores**: el participante toca la escena donde ve un
   error y luego **elige qué está mal** entre 3 opciones (decisión del usuario del
   2026-09-23). Así se califica y se explica la buena práctica.
3. **Todo clic responde**: tocar algo que está bien (el sombrero, el canasto) también da
   un mensaje, como en las imágenes interactivas. Tocar el vacío muestra una lupa.
4. **Estaciones** que se desbloquean: la ruta del café crece escena por escena
   (finca, transporte y conducción, y lo que siga).

## 2. Lenguaje visual de Habbo

### Proyección y píxel

- **Isométrica 2:1**: cada línea diagonal avanza 2 px en horizontal por 1 px en vertical.
- Baldosa de **64x32 px** a escala completa y **32x16** en el zoom lejano. El piso tiene
  grosor visible (unos 8 px) con los lados más oscuros que la cara superior.
- Pixel art **sin antialias**, colores planos con 2 o 3 tonos por material y contorno
  oscuro de 1 px (no negro puro en los objetos: un tono más oscuro del mismo color).
- **Luz desde la izquierda**: cara superior más clara, cara izquierda media, cara derecha
  más oscura. Así se leen todos los muebles ("furni").

### Avatar

- Cabeza grande (cerca de un tercio de la altura), torso corto, piernas cortas. La
  imagen del avatar mide 64x110 px a escala completa.
- 8 direcciones (0 a 7). Las poses nativas son pocas: de pie, caminar, sentarse, acostarse,
  saludar y **llevar un objeto** (`crr`). No existen posturas de agacharse o levantar
  peso: las nuestras son propias, dibujadas con el mismo lenguaje.
- Sombra elíptica semitransparente en el piso.
- El chat usa el color de la camisa del avatar para el borde de su burbuja y el fondo de su
  cabecita.

### Interfaz

- **Burbujas de chat** blancas con borde oscuro, la cabecita del que habla en un cuadro del
  color de su camisa, el nombre en negrita y el texto en la fuente pixel. Aparecen sobre
  el que habla y **suben** a medida que llegan otras.
- **Ventanas** con encabezado de color, título en negrita, botón de cerrar rojo con una X,
  cuerpo claro y borde oscuro de 1 px con esquinas redondeadas.
- **Barra de herramientas** oscura abajo con iconos pixel.
- **Monedero** arriba a la derecha (créditos, duckets) en una caja oscura translúcida.
- **Notificaciones** en burbujas oscuras que entran por la esquina.
- **Insignias** (badges) de logros y **misiones** (quests) con seguimiento de avance.
- Fuente **Volter (Goldfish)**, diseñada por Sulake.

## 3. Qué no copiamos

Habbo es de Sulake (Azerion). No usamos su nombre, logo, la fuente Volter, sprites ni
sonidos. Todo el arte se dibuja por código píxel a píxel, la fuente es **Pixelify Sans**
(licencia OFL, Google Fonts, se sirve desde el propio dominio con `next/font`) y los
sonidos se sintetizan con Web Audio, igual que en el módulo en vivo.

Tampoco usamos el personaje de Juan Valdez ni su logo: el recolector es un personaje propio
(Ramiro) con otra ropa.

## 4. Cómo se traduce al juego

| Habbo | En la escena |
| --- | --- |
| Monedero (créditos) | Granos de café ganados y riesgos encontrados (3/7) |
| Misiones con seguimiento | Panel de riesgos: los encontrados como insignia, los demás como "???" |
| Insignia de logro | Insignia final "Recolector seguro" |
| Burbuja de chat | Ramiro comenta lo que hace; los mensajes de la escena |
| Ventana | La pregunta de 3 opciones y la explicación |
| Barra inferior | Momentos de la escena, repetir, pista, zonas, sonido |
| Notificación | "¡Riesgo detectado! +100" |

Decisiones técnicas:

- Lienzo interno de **400x250** px, baldosa de **40x20** y avatar de unos 58 px: la
  misma relación avatar/baldosa de Habbo (1,4 anchos de baldosa). Se escala sin suavizado
  (`image-rendering: pixelated`) y a múltiplos enteros cuando cabe.
- El avatar es un **esqueleto posable** (caderas, rodillas, hombros, codos) dibujado con
  contorno y relleno. Así las posturas incorrectas y correctas se interpolan y las próximas
  estaciones (sentarse al volante) no requieren dibujar sprites nuevos.
- La escena se divide en **momentos** (agarrar, subir, llevar), como diapositivas: el
  personaje queda quieto en cada postura para poder tocarla con calma, también en celular.
- Accesibilidad: además del clic, un botón **Zonas** lista las partes de la escena (con
  zonas sin riesgo incluidas, para no regalar las respuestas) y funciona con teclado.

## 5. Escenario de la estación 1

Finca cafetera de ladera en el Eje Cafetero:

- Fondo: cordillera azulada, lomas con **cafetales en surcos**, **palmas de cera**,
  guadua y sombrío de plátano; cielo de mañana con nubes.
- Casa campesina de **bahareque** blanca con puertas, ventanas y barandas de colores y
  techo de teja de barro: el beneficiadero adonde va el café.
- Piso isométrico de pasto con un **camino de barro** con charcos, cafetos con cereza roja
  y amarilla, costales de fique, un canasto y una **mula con enjalma** amarrada a un poste.

## 6. Contenido de seguridad y salud en el trabajo

Siete errores, todos visibles en la escena:

| Riesgo | Tipo (GTC 45) | Dato de respaldo |
| --- | --- | --- |
| Espalda doblada con las piernas rectas | Biomecánico | La espalda doblada es la postura más frecuente en recolectores (82 %) y la lumbalgia su trastorno más común. |
| Carga lejos del cuerpo | Biomecánico | Ecuación de NIOSH: alejar la carga de 25 a 50 cm reduce a la mitad el peso recomendado. |
| Bulto demasiado pesado | Biomecánico | Resolución 2400 de 1979, art. 392: 25 kg de carga compacta para hombres y 12,5 kg para mujeres. |
| Girar la cintura con la carga | Biomecánico | NIOSH: una torsión de 90° reduce casi un 30 % el peso recomendado. |
| No usar la mula (ayuda mecánica) | Biomecánico | En ladera el café se lleva al hombro al beneficiadero; la ayuda disponible evita esa carga. |
| Chanclas en terreno con barro | Locativo | Caídas en terreno irregular y resbaloso; botas de caucho con suela labrada. |
| Bulto sobre la nuca con el cuello torcido | Biomecánico | Postura forzada del cuello; las recolectoras reportan más riesgo de dolor cervical. |

Los textos de cada riesgo (título, pregunta, opciones, respuesta correcta, explicación y
buena práctica) se editan desde la biblioteca del admin (solo superadmin). La ubicación de
cada riesgo en la escena queda en código porque depende del dibujo.

## 7. Fuentes

- Genially, catálogo de plantillas: https://genially.com/es/plantillas/
- Volter (Goldfish), fuente de Sulake: https://github.com/eonu/goldfish
- Habborator, consejos y arte: https://habborator.org/tips/index.html
- Avatar de Habbo por capas: https://dev.to/trickstival/habbo-avatar-rendering-basics-4cg6
- Baldosas isométricas de Habbo en HTML5: https://codepen.io/veltix/pen/ZrjPYv
- Resolución 2400 de 1979 (ARL SURA): https://www.arlsura.com/files/resolucion_2400_1979.pdf
- Riesgos disergonómicos en recolectores de café: https://revistas.udec.cl/index.php/Ergonomia_Investigacion/article/view/8487
- Condiciones de trabajo y desórdenes musculoesqueléticos en recolectores (Andes, Antioquia): https://scielo.isciii.es/scielo.php?script=sci_abstract&pid=S3020-11602017000200127
- Recolectora de café más ergonómica, Agencia UNAL: https://agenciadenoticias.unal.edu.co/detalle/recolectora-de-cafe-mas-ergonomica

## 8. Estación 2: transporte y conducción

Investigado el 2026-09-24. Decisiones del usuario: un **Willys (yipao)**, el campero que saca
el café de las fincas del Eje Cafetero; conducción **animada**, sin minijuego de manejo; y
**Ramiro al volante**, el mismo recolector de la estación 1. La estación se juega con el
mismo código de la finca y se desbloquea al terminarla.

### Escenario

- Carretera destapada de montaña que baja en diagonal: talud sembrado de café y plátano a
  un lado, barranco sin defensa al otro y el valle de cafetales abajo.
- El yipao baja de frente hacia la izquierda, así se ve el lado del conductor. Proyección
  isométrica con pendiente: lo que se dibuja sobre la vía queda inclinado como ella.
- La vía, el talud y el barranco se pintan píxel a píxel con coordenadas del mundo: al
  manejar, la vía corre por debajo y el yipao queda quieto en pantalla (se puede tocar con
  calma). La vía se repite cada 520 unidades para correr sin fin.
- Tres momentos: **salir** (en la finca, con la carga ya montada), **manejar** (la cámara se
  acerca 2x a la cabina para que se lean la cara, el celular y el pecho de Ramiro) y
  **descargar** (frente a la cooperativa, con el yipao rodándose en la bajada).
- Toño, el ayudante, viaja sentado encima de los bultos mirando hacia atrás.
- Final correcto: revisa la llanta en cuclillas, carga baja y amarrada, Toño en la cabina,
  cinturón, celular guardado, pausa si hay sueño, y freno de mano, cambio y tacos al llegar.

### Riesgos

| Riesgo | Tipo (GTC 45) | Respaldo |
| --- | --- | --- |
| Carga por encima de la carrocería y sin amarrar | Tránsito | Ley 769 de 2002, art. 131, C.21: no asegurar la carga. |
| Un pasajero encima de la carga | Tránsito | Ley 769, art. 83 (nada de pasajeros fuera de la cabina ni en estribos) y art. 131, C.37. |
| Llanta lisa y desinflada | Tránsito | Ley 769, art. 28 (llantas en buen estado); inspección preoperacional del PESV, Resolución 40595 de 2022. |
| Celular al volante | Tránsito | Ley 769, art. 131, C.38: solo con manos libres. |
| Sin cinturón de seguridad | Tránsito | Ley 769, art. 82 (obligatorio para conductor y pasajeros de adelante) y art. 131, C.6. |
| Maneja con sueño | Psicosocial | Resolución 40595 de 2022: controlar horas de conducción, descansos y pausas. |
| En bajada sin freno de mano ni tacos | Tránsito | Ley 769, art. 30: todo vehículo lleva dos tacos para bloquearlo. |

### Fuentes

- Ley 769 de 2002, Código Nacional de Tránsito (Función Pública): https://www.funcionpublica.gov.co/eva/gestornormativo/norma.php?i=5557
- Resolución 40595 de 2022, metodología del PESV: https://normograma.mincultura.gov.co/mincultura/compilacion/docs/resolucion_mintransporte_40595_2022.htm

## 9. Estación 3: la trilladora

Investigado el 2026-09-24. Decisión del usuario: la ruta tiene **cinco estaciones** (finca,
transporte, trilladora, tostión y tienda) y la tercera es la trilladora, donde el pergamino
se trilla y sale el café verde en sacos de 70 kg.

### Escenario

- La bodega es una **sala de Habbo**: piso de baldosas de concreto con su espesor, dos
  paredes con ventanas altas y zócalo, flotando sobre fondo oscuro.
- Pared izquierda: la puerta de cargue abierta a la luz del día. Rincón del fondo: el arrume
  de sacos. Pared derecha: la trilladora (tolva, salida con el saco que se llena, correa y
  poleas al frente, motor al lado), el tablero eléctrico y el extintor.
- Un montacargas con conductor recorre la bodega. En la versión correcta hay franjas
  amarillas: carril del montacargas, paso peatonal y recuadro del almacenamiento.
- Protagonista nuevo: **Fabio**, operario, con gorra. Ramiro aparece al inicio entregando su
  café. En la versión correcta Fabio usa orejeras y tapabocas (piezas nuevas del avatar).
- Momentos: **recibir** (plano abierto), **trillar** y **destrabar** (la cámara se acerca 2x
  a la máquina, como en el transporte).

### Riesgos

| Riesgo | Tipo (GTC 45) | Respaldo (Resolución 2400 de 1979) |
| --- | --- | --- |
| Saco de 70 kg al hombro | Biomecánico | Art. 392: 25 kg de carga compacta para hombres y 12,5 kg para mujeres. |
| Arrume alto y ladeado | Locativo | Art. 396: arrumes estabilizados con esquineros amarrados; nada apilado frente a extintores o salidas. |
| Montacargas sin carril marcado | Mecánico | Art. 203: montacargas señalados en amarillo y áreas de trabajo y almacenamiento demarcadas con franjas. |
| Ruido sin protección auditiva | Físico | Art. 88: 85 decibeles como máximo para ruido continuo; art. 177: protectores auditivos. |
| Polvo de café sin tapabocas | Químico | Art. 177: respiradores contra polvo. Estudios en plantas de café: más síntomas respiratorios crónicos y asma ocupacional. |
| Correa sin guarda | Mecánico | Art. 267: guardas en los órganos móviles de las máquinas. |
| Destrabar la máquina encendida | Mecánico | Art. 128, parágrafo: prohibido reparar máquinas en funcionamiento. |

### Fuentes

- Resolución 2400 de 1979 (ARL SURA): https://www.arlsura.com/files/resolucion_2400_1979.pdf
- Exposición laboral a hongos en una planta de procesamiento de café (Medicina y Seguridad del Trabajo, 2008): https://scielo.isciii.es/scielo.php?script=sci_arttext&pid=S0465-546X2008000200005

## 10. Estación 4: la tostión

Investigado el 2026-09-24. Es la cuarta de las cinco estaciones de la ruta: el café verde
que sale de la trilladora se tuesta.

### Escenario

- La misma sala de Habbo de la trilladora, sin puerta de cargue, con paredes cálidas y
  zócalo de ladrillo. `drawRoom` de trilladora-art.ts quedó parametrizado para eso.
- Tostadora de tambor negra con frente de cobre, mirilla, quemador con llama, tolva de
  carga con café verde, ducto de humos hasta un extractor en la pared y ducto al ciclón
  (colector de cascarilla). Cilindro de propano color aluminio (art. 203) con su manguera.
- Bandeja de enfriamiento redonda con aspas que giran, molino sobre una mesa con una
  extensión regada por el piso, estante con café empacado y extintor.
- Si la tostadora está prendida sin extractor, el humo se acumula contra el techo.
- Protagonista nueva: **Luz**, maestra tostadora, con el pelo largo suelto. En la versión
  correcta lo lleva recogido con cofia y usa guantes para el calor.
- Momentos: **preparar** (plano abierto), **tostar** (cámara sobre la tostadora) y
  **enfriar** (cámara sobre la bandeja).

### Riesgos

| Riesgo | Tipo (GTC 45) | Respaldo |
| --- | --- | --- |
| Busca la fuga de gas con una llama | Tecnológico | Res. 2400 de 1979, art. 543 (fugas con agua jabonosa, nunca con llama) y art. 536 (cilindros ventilados y lejos de la llama). |
| Extensión regada por el piso | Eléctrico | Res. 2400, art. 125 (evitar cables dispersos en el piso) y art. 121 (aislamiento eficaz). |
| Cascarilla acumulada junto al fuego | Tecnológico | Res. 2400, art. 29 (no se permite acumular polvo, basuras y desperdicios). |
| Humo de la tostión sin extracción | Químico | Res. 2400, art. 161 (ventilación o extracción de humos y gases); NIOSH midió monóxido de carbono y diacetilo sobre sus límites en tostadoras. |
| Saca la muestra sin guantes | Físico | Res. 2400, art. 177 g (guantes, mitones y mangas resistentes al calor). |
| Pelo suelto sobre las aspas | Mecánico | Res. 2400, art. 177 b (cofias para cabello largo cerca de maquinaria) y art. 171 (nada suelto cerca de piezas en movimiento). |
| Granos regados en el piso | Locativo | Res. 2400, art. 32 (pisos libres de desperdicios y de lo que los haga resbaladizos). |

### Fuentes

- Resolución 2400 de 1979 (ARL SURA): https://www.arlsura.com/files/resolucion_2400_1979.pdf
- NIOSH, exposiciones en tostadoras de café y cafés (diacetilo, 2,3-pentanodiona y otros): https://pmc.ncbi.nlm.nih.gov/articles/PMC7531227/
- NIOSH, evaluación de una tostadora de café (monóxido de carbono): https://www.cdc.gov/niosh/hhe/reports/pdfs/2018-0071-3342.pdf

## 11. Estación 5: la tienda (cierre de la ruta)

Investigado el 2026-09-24. Última de las cinco estaciones: el café llega a la taza.

### Escenario

- La misma sala de Habbo, con la puerta abierta a la calle, paredes claras y zócalo de
  madera. Al fondo, el mesón con el lavaplatos (agua con espuma) y la regleta; arriba, el
  tablero del menú y el estante de vasos. Adelante, la barra con la caja, la vitrina de
  postres, el molino y la máquina de espresso con su lanceta de vapor.
- Protagonista nueva: **Sara**, barista. En la hora pico llega una fila de cuatro clientes;
  el primero grita (burbuja roja) y Sara suda. En la versión correcta la acompaña un
  compañero en la caja.
- Momentos: **abrir** (trapea del lado de los clientes, así se le ven los pies), **preparar**
  (cámara sobre la máquina y el lavaplatos) y **atender** (fila y butaco alto al final de
  la barra, a la vista).
- El resumen de la última estación dice que se completó la ruta y la biblioteca ya no
  muestra la tarjeta de estación en construcción.

### Riesgos

| Riesgo | Tipo (GTC 45) | Respaldo |
| --- | --- | --- |
| Chanclas para trapear | Locativo | Res. 2400 de 1979, art. 176 (protección según el riesgo); OSHA: resbalones y quemaduras entre las lesiones más comunes en restaurantes. |
| Piso mojado sin aviso | Locativo | Res. 2400, art. 32 (piso no encharcado ni resbaladizo); OSHA: señalizar las zonas de piso mojado. |
| Regleta mojada junto al lavaplatos | Eléctrico | Res. 2400, art. 121; OSHA: no conectar equipos con las manos mojadas ni sobre superficies húmedas. |
| La mano bajo el vapor | Físico | OSHA: las máquinas de café y espresso causan quemaduras; Res. 2400, art. 177 (protección contra quemaduras). |
| Cuchillo escondido en el lavaplatos | Mecánico | OSHA: no dejar cuchillos en el lavaplatos; Res. 2400, art. 365 (fundas para guardarlos). |
| Se sube a un butaco | Locativo | Res. 2400, arts. 642 y 643 (escaleras portátiles en buen estado y con bases antirresbaladizas). |
| Sola en la hora pico | Psicosocial | Res. 2646 de 2008: identificar y prevenir factores psicosociales como la carga de trabajo, la jornada y las condiciones de la tarea. |

### Fuentes

- Resolución 2400 de 1979 (ARL SURA): https://www.arlsura.com/files/resolucion_2400_1979.pdf
- Resolución 2646 de 2008 (compilación ICBF): https://www.icbf.gov.co/cargues/avance/compilacion/docs/resolucion_minproteccion_2646_2008.htm
- OSHA, Young Worker Safety in Restaurants, limpieza: https://www.osha.gov/etools/young-workers-restaurant-safety/clean-up
- OSHA, Young Worker Safety in Restaurants, cocina: https://www.osha.gov/etools/young-workers-restaurant-safety/cooking
