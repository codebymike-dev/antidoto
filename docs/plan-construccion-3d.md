# Plan: juego de construcción con ladrillos 3D

Plan por fases del módulo de ladrillos 3D. La investigación que lo sustenta está en
`docs/investigacion-construccion-3d.md` (las referencias "§" apuntan a sus secciones).

Redactado el 2026-10-06. Nombre comercial pendiente (ver "Decisiones"); en el código el módulo
se llama `bricks` y la ruta pública `construir`.

## Decisiones del usuario (2026-10-06)

| Tema | Decisión |
|---|---|
| Tipo de juego | **Construcción libre y retos** |
| Participación | **Individual y por equipos** |
| Dispositivos | **Celular y computador** (el computador también hace de pantalla del anfitrión en equipos) |
| Dónde vive | **En la biblioteca** de experiencias |
| Stud | **Liso** |
| Piezas especiales | **Todas las propuestas**: inclinadas, ventanas y puertas, cilindros y redondas, translúcidas |
| Nombre | Propuesto "Lego Serious-Play". **Pendiente de confirmar** por riesgo de marca (§8) |

Restricciones que heredan del proyecto: todo en capa gratuita (Vercel Hobby, Turso, Ably free),
sin marca LEGO en el producto, sonidos sintetizados, una actividad es una sola tarjeta en los
listados, y si hay tablas nuevas se migra producción antes de desplegar.

## Cómo encaja en la biblioteca

Hoy la biblioteca solo conoce experiencias de "encontrar riesgos" (`ExperienceDef` con
`scene` y `risks`). El juego de ladrillos entra como un **segundo tipo de actividad** de la
misma biblioteca, sin forzarlo dentro de `ExperienceDef`:

- `src/lib/bricks/catalog.ts` define las actividades de construcción (`BuildDef`): retos,
  piezas y colores permitidos, tiempo, presupuesto, textos. Igual que los riesgos, los textos de
  fábrica viven en código y el superadmin los edita desde la biblioteca.
- La biblioteca lista ambos tipos con un filtro por tipo. Cada actividad es una tarjeta.
- **Individual**: se asigna con código de actividad y se juega por el flujo `/mision`, como la
  Ruta del café. La obra se guarda y queda en la galería.
- **Equipos**: se lanza en vivo desde el admin con PIN, pantalla del anfitrión en el computador
  y celulares, reutilizando los patrones del módulo en vivo (`src/lib/live-engine.ts`,
  `src/app/api/live`, `useLiveChannel.ts`), con canales Ably por equipo (§7.8).

## Fases

Cada fase termina con algo que se puede ver y probar. Al cerrar cada una se actualizan los
documentos de ingeniería en `/admin/docs`.

### Fase 1: banco de pruebas de render

Objetivo: validar el look y el rendimiento antes de invertir en lo demás (§9.2, fase A).

- Dependencias: `three`, `postprocessing`, `n8ao`. **Sin React Three Fiber** (cambio frente a la
  investigación, 2026-10-06): las reglas del React Compiler que usa el lint del proyecto prohíben
  mutar objetos de three desde hooks, que es justo como trabaja R3F. El motor es una clase de
  three puro (`src/components/bricks/lab/engine.ts`) y React solo pinta la interfaz, que es además
  el patrón que pedía la investigación (§7.1: el modelo vive fuera de React).
- Ruta oculta para super (`/admin/escena/ladrillos`) con modelos pregenerados de 500, 1.500 y
  3.000 ladrillos.
- Geometría procedural biselada, stud liso instanciado con descarte de los tapados,
  `BatchedMesh`, `RoomEnvironment`, una sombra, N8AO en reposo, tone mapping Neutral, render por
  demanda y overlay de FPS, draw calls y triángulos.
- Material de plástico con los valores de §4.4 y la paleta de 23 colores de §4.3.
- **Criterio de paso**: 1.500 ladrillos a 50 FPS o más orbitando en un Android de gama media y
  un iPhone 11 o 12, 40 draw calls o menos, chunk 3D de 350 KB gz o menos, primera imagen en
  menos de 3 s en 4G. Medición también en un Galaxy A0x como piso.
- Sin tablas nuevas.

**Estado (2026-10-06)**: hecho en local y verificado en Chromium con GPU por software, donde
los FPS no significan nada. Cifras de un cuadro normal (sin el de las sombras):

| Nivel | Ladrillos | Draw calls | Triángulos | Presupuesto (§7.6) |
|---|---|---|---|---|
| Bajo | 1.500 | 8 | 310.238 | 150k con 500 ladrillos |
| Medio | 500 | 20 | 117.878 | 400k con 1.500 |
| Medio | 1.500 | 22 | 356.270 | 400k con 1.500 |
| Medio | 3.000 | 20 | 795.338 | (3.000 es el objetivo de alto) |
| Alto | 1.500 | 21 | 968.821 | 1M con 3.000: hay que bajarlo |
| Ultra | 1.500 | 23 | 2.109.529 | 3M con 10.000; la refracción del cristal dibuja la escena dos veces |

Chunk 3D: 296 KB gzip (meta 350 KB), solo lo baja esa ruta. Los studs de la base son la mayoría
de los triángulos; en el juego real la base es de 16x16 a 32x32 y pesarán menos. El mapa de
sombras se calcula una vez por modelo (luz y modelo quietos durante la órbita), así que las
sombras no cuestan nada al girar. **Falta para cerrar la fase**: medir FPS y primera imagen en un
Android de gama media, un iPhone 11 o 12 y un Galaxy A0x reales.

### Fase 2: motor de construcción

Lógica pura en `src/lib/bricks/`, sin React ni three, con tests `*.test.mts`.

- Tipos, catálogo de piezas y paleta.
- **Piezas con máscara por celda**: cada pieza declara qué celdas de su huella tienen stud arriba
  y qué celdas reciben encaje abajo. Así las inclinadas (stud solo en la fila alta), las tejas
  (sin studs) y las redondas encajan con la misma regla de grilla, sin un sistema general de
  conectores (§7.3).
- Ocupación por voxel, rayo DDA, `proposePlacement`, apoyo, grafo de conectividad con detección
  de grupos flotantes, operaciones con deshacer y rehacer, codec binario.

**Estado (2026-10-06)**: hecho, con 13 tests en `src/lib/bricks/engine.test.mts`.

- `parts.ts`: 38 piezas (ladrillos, placas, tejas, 4 inclinadas, redondas, cilindro, ventanas y
  puerta) con máscara de studs arriba y abajo por celda. El `id` es lo que se serializa.
- `world.ts`: `BrickWorld` con ocupación por celda, choques, apoyo (base, encima o colgando
  debajo), encajes y piezas sueltas tras quitar algo. Rotación en cuartos de vuelta que gira la
  pieza dentro de su caja con la esquina mínima fija.
- `ray.ts`: rayo DDA por la grilla con la base como plano.
- `place.ts`: propuesta para el fantasma (arriba, de lado, por debajo, con ancla bajo el dedo y
  subida de hasta dos ladrillos si choca), siempre con motivo si no cabe.
- `ops.ts`: operaciones con deshacer y rehacer; un lote (mover) es todo o nada; en equipo, un
  deshacer que ya no aplica se descarta.
- `codec.ts`: formato binario versión 1, 6 bytes de cabecera más 9 por pieza.

La geometría de cada pieza especial llega en la fase 4; el motor ya las entiende. Al hacer la
vista (fase 3) hay que fijar con un test que la rotación del dibujo coincide con `localCell`.

### Fase 3: constructor individual jugable

El corazón del producto. Se prueba con 5 personas sin explicación antes de seguir.

- Controles de celular y escritorio de §3.4 y §3.5, cámara con límites y "Centrar", fantasma
  con sombra e histéresis, offset sobre el dedo y lupa condicional.
- Bandeja inferior en celular (bottom sheet) y lateral en escritorio; fila esencial de colores.
- Encaje con clic sintetizado, microrrebote y vibración en Android (§5).
- Primer minuto guiado, pistas por inactividad, deshacer sin confirmaciones (§3.7).
- Accesibilidad: teclado, `aria-live`, reduced motion, válido e inválido por forma (§3.8).
- Botón de silencio y modo foto básico.

**Estado (2026-10-06)**: hecho en local en `/admin/escena/construir` (vista previa para
admins, nada se guarda). Verificado en Chromium sin tarjeta gráfica, en celular emulado
(390x844) y escritorio (1280x800). Falta la prueba con 5 personas y en celulares reales.

- `src/components/bricks/stage.ts`: escenario común (render, luz, cámara, postproceso, dibujo
  por demanda, foto). El banco de pruebas también lo usa ahora.
- `builder/engine.ts`: controlador fuera de React, leído con `useSyncExternalStore`. Se crea
  antes del lienzo y se monta y desmonta (modo estricto, cambio de nivel).
- `builder/view.ts`: cuerpos en BatchedMesh incremental, studs recalculados por cambio,
  fantasma (color real y contorno sólido si cabe; gris, discontinuo y motivo si no), sombra bajo
  el fantasma, contorno doble de selección, caída con rebote de 140 ms (sin ella con reduced
  motion), piezas sueltas aclaradas.
- Gestos: dedo sobre el fantasma mueve la pieza; en el vacío gira la cámara; toque lejos del
  fantasma lo mueve ahí; toque sobre el fantasma o "Colocar" coloca; mantener 450 ms levanta
  una pieza; arrastrar desde la bandeja con el fantasma 56 px sobre el dedo. Ratón: el fantasma
  sigue al cursor y el clic coloca. Teclado completo (R, flechas, Enter, Ctrl+Z, Supr, Ctrl+D,
  Esc, F, ?).
- `sound.ts`: clic de plástico sintetizado (ruido con pasabanda más golpe grave, ±7 % de tono,
  más agudo arriba), sonidos de coger, girar, no cabe, quitar y deshacer; vibración de 10 ms en
  Android; silencio recordado.
- Interfaz: bandeja con miniaturas 3D en el color activo (ladrillos, placas, tejas), 12 colores
  esenciales y panel por familias, barra de acciones que cambia con la selección (girar,
  pintar, mover, duplicar, eliminar), aviso con "Deshacer", guía de 3 pasos, pista a los 20 s de
  inactividad, ayuda de controles, foto PNG, `aria-live` en cada acción.
- Peso: unos 318 KB gzip con el motor 3D.

No se hizo todavía: la lupa para piezas diminutas (decidir tras probar en celular real) y la
prueba con 5 personas.

### Fase 4: catálogo completo de piezas

- Básicas: ladrillos 1x1 a 2x8, placas 1x1 a 8x8, tejas lisas.
- Inclinadas: 45° de 2x1, 2x2 y 2x4, invertidas y esquinas.
- Redondas: ladrillo y placa redonda 1x1 y 2x2, cilindro 2x2 alto.
- Ventanas y puertas: marcos con vidrio translúcido.
- Translúcidas: Cristal y Cristal Celeste en las formas que lo admitan; en celular, opacidad con
  mapa de entorno en lugar de refracción real.
- Miniaturas 3D en la bandeja generadas con el mismo motor.
- Se vuelve a medir el banco de pruebas con el catálogo completo.

**Estado (2026-10-06)**: hecho en local y verificado en Chromium (escritorio y celular emulado).

- `src/components/bricks/part-geometry.ts`: inclinadas como perfil extruido con canto biselado
  (fila alta plana con studs, rampa hasta un labio de una placa), redondas y cilindro torneados
  con bordes redondeados, ventanas y puerta como marco con vidrio aparte (la puerta con hoja,
  travesaño y manija). Todo indexado, como exige el BatchedMesh.
- `src/lib/bricks/rotation.ts`: el giro del dibujo, con un test que lo compara contra
  `localCell` en las 38 piezas y las 4 rotaciones.
- El vidrio va siempre en Cristal Celeste en la capa translúcida, sea cual sea el color del
  marco. En celular es opacidad más reflejo; en ultra, refracción real.
- La bandeja suma Inclinadas, Redondas y Ventanas, con miniaturas de la geometría real.
- Mejora del motor encontrada al probar: al tocar el costado de una pieza donde no hay apoyo,
  la pieza nueva cae hasta el primer lugar donde encaja, en vez de quedar "sin apoyo".

Queda para después: el rayo choca con la caja completa de cada celda, así que tocar el aire
sobre la rampa de una inclinada cuenta como tocar la inclinada.

### Fase 5: biblioteca y modo individual

- `BuildDef` y catálogo de actividades de construcción. Tipos de reto: libre, tema con tiempo,
  presupuesto de piezas, replicar un modelo y metáfora (pregunta, título y frase, §6.2).
- Biblioteca con los dos tipos de actividad y edición de textos por el superadmin.
- Asignación por código de actividad y juego por `/mision`, con la ficha del participante que
  ya existe.
- Guardar la obra en Turso, imagen final y galería personal (§7.7).
- **Tablas nuevas**: obras y textos editables de los retos. Requiere migrar producción antes de
  desplegar.

### Fase 6: modo equipos en vivo

- Sesión en vivo desde el admin: PIN, pantalla del anfitrión en el computador, celulares.
- Equipos de 3 a 5 con canal Ably propio, operaciones con autoridad del servidor, lotes cada
  150 a 250 ms, sin cursores remotos (§7.8).
- Modos: La Torre, Obra en Equipo (parcelas), Relevo, Teléfono Roto (§6.2).
- Pantalla del anfitrión: consigna, temporizador, bases creciendo en vivo, recorrido de cámara.
- Medición real de mensajes Ably por sesión, sumada al consumo del módulo en vivo.
- Tablas nuevas para sesiones, equipos y operaciones: migrar producción antes de desplegar.

### Fase 7: galería, votación y reportes

- Galería de Cierre: mural, votación por categorías con obra anónima hasta votar, podio por
  categoría sin últimos, opción de no mostrar la propia (§6.3).
- Imagen de cada obra para el participante y mural descargable como entregable para la empresa.
- Reporte en el admin.

### Fase 8: pulido

- Niveles de calidad automáticos, modo foto Ultra, recorrido de la guía de §5 completo.
- Revisión legal de nombre y arte antes del lanzamiento público.

## Decisiones que quedan abiertas

1. **Nombre comercial** (bloquea solo la fase 8, no el desarrollo).
2. **Retos de fábrica**: qué retos y temas trae el catálogo inicial, y si alguno es para un
   cliente concreto como la Ruta del café.
3. **Votación**: si el anfitrión puede saltarla en eventos cortos.
