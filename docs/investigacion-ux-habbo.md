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
