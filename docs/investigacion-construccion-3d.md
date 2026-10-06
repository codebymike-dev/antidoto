# Investigación: juego de construcción con ladrillos 3D

Referencia para diseñar y construir el módulo de ladrillos 3D de Antídoto (piezas que encajan,
estilo juguete de construcción, sin la marca LEGO) en celular, computador y proyector. Reúne
usabilidad, interacción 3D, psicología del juego, color, dirección de arte, lógica de juego,
arquitectura técnica y riesgos legales.

Investigado el 2026-10-06 en cinco frentes paralelos y consolidado aquí. Todavía no hay código:
este documento es la base para el plan por fases. Cada dato indica de dónde sale:

- **[estudio]**: investigación revisada por pares o medición empírica.
- **[guía]**: Apple HIG, Material, Nielsen Norman Group, WCAG.
- **[oficial]**: documento del fabricante o del dueño del método o la marca.
- **[docs]**: documentación técnica (three.js, R3F, Ably, LDraw, Next).
- **[entrevista]**: declaraciones de los desarrolladores (GDC, podcasts, prensa especializada).
- **[prensa]**: reseñas y artículos de medios.
- **[usuarios]**: foros, Steam, Reddit, tiendas de apps.
- **[legal]**: sentencias y normas.
- **[industria]**: práctica documentada del sector.
- **[opinión]**: criterio propio derivado de lo anterior.

> Aviso legal: se imita el **principio** del juguete de construcción, no la marca. Nada de la
> palabra LEGO en el producto, ni logo en los studs, ni minifigura, ni el estilo de las
> instrucciones oficiales. Detalle en la sección 8. Sonidos propios o sintetizados, como en el
> resto del proyecto.

---

## 0. Las decisiones que salen de la investigación

Resumen para quien no va a leer todo. Cada punto se desarrolla más abajo.

1. **No es un CAD, es un diorama.** Base acotada (16x16 a 32x32 studs), 12 a 16 piezas
   rectangulares, rotación solo de 90° en el eje vertical. La altura se infiere, no se manipula.
   Así un problema 3D difícil queda en "apuntar y soltar" (secciones 2 y 3).
2. **Un gesto, ida y vuelta.** Arrastrar desde la bandeja y soltar encaja, en todas las
   plataformas. Alternativa obligatoria sin arrastre: tocar la pieza y tocar el destino (WCAG
   2.5.7). Nunca "clic para coger, mantener para soltar" (sección 3).
3. **Dedo que toca pieza mueve pieza, dedo que toca vacío gira la cámara.** Se decide en el
   primer contacto. Dos dedos: zoom y desplazamiento (sección 3.3).
4. **Fantasma con sombra.** Pieza translúcida en la posición de encaje más una sombra vertical
   sobre la superficie de destino. Válido e inválido se distinguen por forma (contorno sólido o
   discontinuo con ícono), no solo por color (secciones 3.6 y 4.6).
5. **El clic es la mitad de la experiencia.** Sonido de encaje con variación de tono, microrrebote
   de 80 a 120 ms y vibración corta en Android. El sonido va antes que las partículas
   (sección 5).
6. **Deshacer siempre visible y sin confirmaciones.** Borrar se hace con un toast de "Deshacer".
   El miedo a equivocarse es la barrera principal de un adulto en un evento (sección 3.7).
7. **Nunca destruir una obra.** El efecto IKEA desaparece si se desarma. Toda construcción
   termina en galería, imagen y entregable para la empresa (sección 1).
8. **Nada de puntos por cantidad o velocidad** en los modos creativos. Reconocimiento por
   votación de categorías y sin mostrar a los últimos (sección 6.3).
9. **Paleta de 23 colores con la familia Antídoto**, con 10 a 12 visibles por defecto, nombres
   colombianos y parejas débiles para daltonismo identificadas (sección 4.3).
10. **Plástico realista por imperfección, no por brillo.** Bisel en las aristas, ruido fino de
    superficie, variación por pieza, Khronos PBR Neutral como tone mapping para no deformar los
    azules de marca (sección 4.4).
11. **three.js + React Three Fiber 9 sobre WebGL2, render por demanda.** WebGPU queda para una
    v2. Estado del modelo fuera de React, 2 a 4 draw calls para todo el modelo (sección 7).
12. **Multijugador por equipos, con autoridad del servidor.** Canales Ably por equipo, nunca uno
    por sala grande, porque la capa gratuita no aguanta el fan-out (sección 7.8).
13. **Identidad propia de pieza.** Stud con el isotipo de Antídoto o liso, proporciones
    ligeramente estilizadas, nombre propio. Revisión de un abogado antes del lanzamiento
    público (sección 8).

---

## 1. Por qué funciona construir (psicología)

### 1.1 Teorías con evidencia

- **Efecto IKEA** (Norton, Mochon y Ariely 2012, cuatro experimentos, uno con sets de
  ladrillos): la gente valora más lo que armó ella misma. **El efecto desaparece si la obra se
  desarma o queda sin terminar** [estudio]. Mochon et al. (2012): se debe a la sensación de
  competencia [estudio]. Consecuencia directa: conservar y mostrar todas las obras.
- **Autodeterminación** (Deci y Ryan): autonomía = elegir qué y cómo construir; competencia =
  encaje fiable, deshacer y primera victoria rápida; relación = construir con otros y contar la
  historia [estudio + opinión].
- **Flujo**: la relación entre equilibrio reto-habilidad y flujo tiene forma de U invertida
  (Engeser y Rheinberg 2008) [estudio]. En un evento hay niveles mezclados, así que el reto debe
  ser **elástico**: que se pueda resolver con 5 piezas o con 200 [opinión].
- **Restricciones y creatividad**: la revisión de Acar, Tarakci y van Knippenberg (2019, 145
  estudios) encontró que una dosis sana de restricciones beneficia la creatividad, también en
  U invertida [estudio]. Tiempo, tema, presupuesto de piezas y paleta reducida son buenas
  palancas, pero **combinar como máximo dos a la vez** [opinión]. Builder's Journey y Bricktales
  llegaron a lo mismo por experiencia: limitar el diorama "liberó muchísimo la creatividad"
  [entrevista].
- **Recompensas** (metaanálisis de Deci, Koestner y Ryan 1999, 128 estudios): las recompensas
  tangibles y esperadas bajan la motivación intrínseca (por participar d = -0,40, por completar
  d = -0,36, por desempeño d = -0,28). La retroalimentación verbal informativa la sube. Las
  recompensas inesperadas no tuvieron el efecto negativo [estudio].
- **Seguridad psicológica** (Edmondson 1999, 51 equipos): la creencia de que el equipo es seguro
  para correr riesgos interpersonales se asocia con conductas de aprendizaje [estudio]. Mostrar
  algo "feo" frente al jefe es un riesgo interpersonal, y el diseño tiene que abaratarlo.

### 1.2 Digital frente a físico

- En 198 niños de 7 a 9 años, entrenar con ladrillos físicos o digitales mejoró la habilidad de
  construcción. En lo físico pesó más la rotación mental, en lo digital no [estudio].
- "From Brick to Click" (2025): en construcción libre, los adultos prefirieron la versión
  virtual con "superpoderes" (deshacer, duplicar, piezas infinitas) sobre la física [estudio].
- **Conclusión** [opinión]: no imitar lo físico. Aprovechar lo que solo lo digital permite
  (deshacer sin culpa, piezas sin límite, galería instantánea en el proyector) y compensar la
  falta de tacto con game feel.

### 1.3 LEGO Serious Play: el método sí, la marca no

- Núcleo de 4 pasos: (1) desafío sin respuesta correcta obvia, (2) cada persona construye,
  (3) cada persona cuenta la historia de su modelo, (4) el grupo reflexiona. Antes va un
  calentamiento de habilidades (torre, metáfora, contar la historia) [oficial].
- Principios útiles: "todos construyen, todos cuentan", "el modelo es de quien lo construyó" (se
  pregunta por el significado, no se critica la forma), "construye primero, piensa después"
  [oficial].
- Evidencia: buena para participación, conversación y flujo; débil para impacto duradero en
  desempeño [estudio + opinión].
- **Licencia**: la guía de 2010 es CC BY-SA 3.0. Se pueden usar los principios con fines
  comerciales citando la guía y compartiendo lo derivado con la misma licencia [oficial].
- **Marca**: las guías de 2017 prohíben usar "LEGO SERIOUS PLAY" en nombres de productos,
  sitios, dominios o identidad, y declaran como marcas la minifigura y "la configuración
  ladrillo-y-perilla" [oficial]. En el producto de Antídoto no aparecen "LEGO", "Serious Play"
  ni "LSP".

---

## 2. Qué hacen los productos existentes

### 2.1 Tabla comparativa (condensada)

| Producto | Cómo se coloca | Rotación | Lo más elogiado | Lo más criticado |
|---|---|---|---|---|
| **BrickLink Studio** (escritorio, oficial de LEGO) | La pieza sigue al cursor, clic o Espacio fija, Esc la devuelve [oficial] | Flechas 90°, Shift 45° [oficial] | Chequeo de conectividad (tiñe en rosa los grupos sueltos), colisión que vuelve transparente la pieza que choca, render realista [oficial] | "Sorprendentemente complejo"; cae por encima de 5.000 piezas [prensa] |
| **Mecabricks** (web, WebGL) | Snap por rejilla [prensa] | Tecla M alterna mover y rotar [prensa] | Cero instalación, render con arañazos y huellas [prensa] | En móvil arrastra la UI de escritorio [usuarios] |
| **LEGO Digital Designer** (retirado en 2022) | Encaje estricto: solo conexiones legales [usuarios] | Bisagra con flechas de eje [usuarios] | El encaje automático [usuarios] | Rígido para técnicas avanzadas [usuarios] |
| **LEGO Worlds** | Cursor libre en 3D [usuarios] | Botones | Herramienta amplia [prensa] | Controles "quisquillosos", cámara "terrible", undo tardío [prensa][usuarios] |
| **LEGO Builder's Journey** (nació en iOS) | Mantener = la pieza "hace clic" y sigue al dedo [entrevista] | Un toque gira en el eje vertical [entrevista] | Mejor juego móvil Golden Joystick 2020; mejor audio y visual en Spilprisen [oficial] | En PC: "coger con clic, soltar manteniendo contradice toda lógica" [usuarios] |
| **LEGO Bricktales** | Cursor con predicción de intención y sombra de profundidad [entrevista] | Botón | Puzzles físicos, prueba de estabilidad [prensa] | "La pieza salta a un lado de donde la quieres" [prensa] |
| **LEGO Fortnite** | Plano fantasma que se confirma [oficial] | Botones, snap desactivable [oficial] | Más amable que Worlds [prensa] | Al lanzar no se podía mover ni borrar [prensa] |
| **LEGO Builder app** (instrucciones) | Paso a paso animado [oficial] | Gestos de órbita | 4,8/5, más de 12,5 M de descargas; "Build Together" reparte pasos entre jugadores con un PIN [oficial][usuarios] | Pocas quejas |
| **Minecraft** | Raycast a la cara apuntada, contorno del bloque objetivo [observado] | Implícita | Inmediatez | En móvil se colocan o rompen bloques por accidente [usuarios] |
| **Townscaper** | Tocar añade, el algoritmo decide la forma [entrevista] | No existe | "Cada toque viene con un pop y un clic encantadores" [prensa] | Sin música propia [prensa] |

### 2.2 Patrones que funcionan

1. **El clic sonoro es la mitad de la sensación.** Light Brick: "un sonido tan sutil y
   satisfactorio que solo podría venir de LEGO" [entrevista]. Townscaper logra lo mismo con pop,
   clic y haptics [prensa].
2. **El agarre también responde**, no solo el encaje: en Builder's Journey la pieza hace clic al
   cogerla [entrevista].
3. **Sombra proyectada como pista de profundidad.** ClockStone: "una de las primeras cosas que
   hicimos fue poner sombras para decirle al jugador que el ladrillo está en este eje, a esta
   distancia" [entrevista].
4. **Predecir la intención**, no mapear el cursor en crudo: ClockStone usa la velocidad y la
   posición previa del ratón [entrevista]. Hace falta histéresis y suavizado.
5. **Restringir espacio y cantidad.** Bricktales bajó a un máximo de 96 studs; puzzles de 100 a
   150 ladrillos "cansan" [entrevista].
6. **Que siempre se vea que es un ladrillo**: escala de diorama de mesa [entrevista].
7. **Imperfección física en el material**: arañazos, huellas, translucidez, sangrado de color.
   Light Brick hizo tres niveles de calidad para PC [entrevista].
8. **Física trucada para que sea juego**: con la fuerza real de encaje todo aguantaba, y
   tuvieron que exagerar masas [entrevista].
9. **Un solo eje de rotación en táctil** [entrevista].
10. **Validar sin bloquear**: Studio tiñe lo desconectado en lugar de impedirlo [oficial].
11. **Deshacer generoso**: Townscaper deshace a toda velocidad si se mantiene pulsado [oficial].
12. **Interacción mínima, el sistema embellece** (Townscaper) [entrevista].
13. **Colaboración por turnos con PIN** (Builder app), que encaja con el modelo de sesión en vivo
    de Antídoto [oficial].
14. **Gestos ocultos fracasan**: Light Brick descartó "presionar más fuerte para asentar" con 3D
    Touch porque nadie lo entendía, y añadió unas pocas guías escritas al principio
    [entrevista].

### 2.3 Antipatrones

1. Gestos distintos para coger y soltar [usuarios][prensa].
2. Un botón que hace tres cosas (rotar, coger, asentar): rotaciones accidentales [prensa].
3. Portar el esquema táctil al ratón sin adaptar, o al revés [usuarios].
4. Cámara que se resetea sola o con foco fijo [prensa][usuarios].
5. Sin borrar, mover o deshacer [prensa].
6. Cursor hipersensible [prensa].
7. Fallos de física sin explicación [prensa].
8. Ventana de construcción separada del mundo bonito (rompe la inmersión) [prensa].
9. Catálogo enorme y herramientas de CAD para público casual [prensa].
10. Ignorar el rendimiento móvil [prensa].
11. Teclas atadas a QWERTY: usar `event.code` [usuarios].

---

## 3. Interacción en celular y escritorio

### 3.1 Idea rectora: 2.5D, no 6 grados de libertad

La rejilla reduce el problema a posición X/Z en studs, altura Y inferida por apilamiento
(el rayo cae sobre la cara superior de lo que hay debajo) y rotación en pasos de 90°
[opinión]. La investigación en manipulación 3D táctil apunta igual: **separar y restringir
grados de libertad gana**. DS3 (Martinet, Casiez y Grisoni, 2010/2012), que separa traslación y
rotación, fue al menos un 22% más rápido que Sticky Tools [estudio]. Táctil no es peor que ratón
si la técnica está bien diseñada (Besançon et al., CHI 2017) [estudio].

Síntesis [opinión]: un dedo hace una sola cosa a la vez y la decide lo que toca primero; la
rotación es un botón; la altura no se manipula; la oclusión se resuelve con offset y lupa
condicional.

### 3.2 Ergonomía móvil

- **Agarre** (Hoober, 1.333 observaciones): 49% una mano con pulgar, 36% acunado, 15% dos
  pulgares [estudio]. El tercio inferior y el centro son cómodos; las esquinas superiores no.
- **Precisión por zona**: unos 7 mm en el centro, 9 mm en bordes, 12 mm en esquinas [estudio].
  La colocación precisa ocurre en el centro del canvas.
- **Tamaños**: HIG 44 pt, Material 48 dp, NN/g 1 cm, WCAG 2.5.8 mínimo 24 px [guía]; Parhi et al.
  midieron 9,2 a 9,6 mm para el pulgar [estudio]. **Propuesta**: herramientas de 48 px con 8 px
  de separación, botón primario de 56 a 64 px, celdas de bandeja de 56 px [opinión].
- **Vertical por defecto** [opinión]: en un evento la gente está de pie y no gira el teléfono.
  Canvas en el 55 a 65% superior, controles en el tercio inferior. Horizontal solo como layout
  adaptado para tablet.
- **Bottom sheet** con tres estados: colapsado (fila de recientes), medio (rejilla de piezas),
  expandido (colores y categorías). Expandido bloquea los gestos del canvas [guía].
- **Oclusión del dedo**: el fantasma se ancla bajo un punto 40 a 60 px por encima de la yema. Si
  la pieza proyectada mide menos de unos 7 mm, aparece una lupa (técnica Shift de Vogel y
  Baudisch: solo cuando hace falta) [estudio + opinión].
- **Safe areas**: `env(safe-area-inset-bottom)`; nada arrastrable a menos de unos 16 px del borde
  inferior (gesto de inicio del sistema) [guía].

### 3.3 Cámara

**Táctil** [opinión, sobre convención de OrbitControls y model-viewer]:
- La decisión se toma en `pointerdown` con un raycast: si el dedo cae sobre el fantasma o la pieza
  seleccionada, mueve la pieza; si cae en el vacío o en una pieza no seleccionada, orbita.
- Umbral de arrastre de 8 a 10 px (Android usa 8 dp de touch slop [guía]): por debajo es toque,
  por encima es órbita. Es el conflicto que sufre Minecraft Bedrock [usuarios].
- `touch-action: none` en el canvas y `setPointerCapture`.
- Límites: ángulo polar entre unos 10° y 85°, distancia acotada al tamaño del modelo, pan acotado
  al bounding box. Nunca perder el modelo de vista.
- Botón "Centrar" siempre visible y doble toque sobre una pieza para enfocarla y hacerla pivote.
- Inercia suave, desactivada con `prefers-reduced-motion`.

**Ratón y trackpad**: seguir a BrickLink Studio y Tinkercad, el público más cercano [producto]:

| Producto | Orbitar | Pan | Zoom | Encuadrar |
|---|---|---|---|---|
| BrickLink Studio | Botón derecho | Central, o Shift/Espacio + botón | Rueda | F |
| Tinkercad | Botón derecho | Central | Rueda | F |
| Blender | Central | Shift + central | Rueda | Inicio |

En trackpad, la pinza llega como `wheel` con `ctrlKey` (zoom); dos dedos orbitan y con Shift
desplazan. Alternativa sin botón derecho: Alt/Option + arrastre izquierdo, porque muchos
portátiles corporativos se usan solo con trackpad [opinión].

### 3.4 Esquema de controles en celular

| Gesto | Dónde empieza | Acción |
|---|---|---|
| Arrastre 1 dedo | Desde la bandeja o sobre el fantasma | Mueve el fantasma con offset sobre la yema; soltar en un destino válido encaja |
| Toque | Pieza de la bandeja | La pone "en mano" (alternativa sin arrastre) |
| Toque | Superficie, con pieza en mano | Mueve el fantasma a ese stud (no coloca) |
| Toque | Sobre el fantasma, o botón "Colocar" | Confirma la colocación |
| Arrastre 1 dedo | Vacío o pieza no seleccionada (más de 8 a 10 px) | Orbita la cámara |
| Toque | Pieza colocada, sin pieza en mano | La selecciona: barra con rotar, color, duplicar, eliminar |
| Mantener 450 ms | Pieza colocada | La levanta para moverla (háptico de agarre) |
| Pinza 2 dedos | Cualquier punto | Zoom hacia el punto medio |
| Arrastre 2 dedos | Cualquier punto | Pan acotado |
| Doble toque | Pieza | La encuadra y la hace pivote |
| Botón ↻ | Barra | Rota 90° la pieza en mano o seleccionada |
| Botón ⌖ | Esquina del canvas | Reencuadra todo |
| Botones ↶ ↷ | Barra | Deshacer, rehacer (mantener = repetir rápido) |

Nota de reconciliación: el benchmark pide "un solo gesto de arrastrar y soltar" y la
investigación de usabilidad pide "tocar y tocar" para evitar colocaciones accidentales. Los dos
caben: arrastrar y soltar es el camino rápido, y tocar-tocar con confirmación es la alternativa
accesible que exige WCAG 2.5.7. Lo que no se admite es mezclar gestos distintos para coger y
soltar.

### 3.5 Controles de escritorio

| Entrada | Acción |
|---|---|
| Mover el ratón con pieza en mano | Fantasma con snap |
| Clic izquierdo | Colocar (la pieza sigue en mano para repetir) o seleccionar |
| Arrastre izquierdo sobre una pieza | Moverla |
| Shift + arrastre izquierdo en el vacío | Selección por rectángulo |
| Arrastre derecho / Alt + arrastre izquierdo | Orbitar |
| Clic derecho sin arrastre | Menú contextual (duplicar, color, rotar, eliminar) |
| Arrastre central / Espacio + arrastre | Pan |
| Rueda / pinza de trackpad | Zoom hacia el cursor |
| R / Shift+R | Rotar 90° horario / antihorario |
| Supr o Retroceso | Eliminar |
| Ctrl/Cmd+Z, Ctrl/Cmd+Shift+Z | Deshacer, rehacer |
| Ctrl/Cmd+D | Duplicar |
| Alt+clic sobre una pieza | Cuentagotas (toma pieza y color) |
| 1 a 9 | Piezas recientes |
| F / Inicio | Encuadrar selección / todo |
| Flechas, RePág/AvPág, Enter | Cursor de rejilla accesible |
| Esc | Soltar la pieza en mano o deseleccionar |
| ? | Hoja de atajos |

Todas las teclas por `event.code`, y todas las acciones también con botón en pantalla.

### 3.6 Wireframes

Celular vertical:

```
+---------------------------------+
| (<)  Torre del equipo  [?][mute]|  zona difícil: solo lo secundario
|                                 |
|          . . . . . .            |
|        .  [##]  . . .           |
|       . [####][fant.]. .        |  CANVAS 3D (60%)
|        . . .|. . . .            |  fantasma con offset sobre el dedo,
|          . .|. . .              |  sombra vertical, studs resaltados
|             o  (dedo)           |
|                          [ ⌖ ] |  reencuadrar (48 px)
|---------------------------------|
|  [↶]   [↻]   [ COLOCAR ]   [↷]  |  barra de acción, primario 64 px
|---------------------------------|
|  ===== (asa del bottom sheet)   |
|  [2x4][2x2][1x4][1x2][1x1][>]   |  piezas recientes (56 px)
|  (o)(o)(o)(o)(o)(o)(o) colores  |
|  safe-area                      |
+---------------------------------+
Con pieza seleccionada: [↻] [color] [duplicar] [eliminar] [x]
```

Escritorio:

```
+--------------------------------------------------------------------------+
| Antídoto · Torre del equipo        [↶][↷]   [Ayuda ?] [Sonido]  [Enviar] |
+-----------+----------------------------------------------+---------------+
| Básicos v |                                              | SELECCIÓN     |
| [2x4][2x2]|              . . . . . . . .                 | Ladrillo 2x4  |
| [1x4][1x2]|            .  [####]  . . . .                | Color: Girasol|
| Placas  > |          . [######][fant.] . .               | (o)(o)(o)(o)  |
| Tejas   > |            . . . . . . . . .                 | [↻ Rotar  R]  |
|           |              . . . . . . .                   | [Duplicar ^D] |
| RECIENTES |                                     [⌖][+][-]| [Eliminar Del]|
| 1 2 3 4 5 |  Clic: colocar · Clic der.: girar · R: rotar | Piezas: 37    |
+-----------+----------------------------------------------+---------------+
```

La bandeja de escritorio no lleva buscador: con 12 a 16 piezas no hace falta [opinión].

### 3.7 Onboarding, carga cognitiva y deshacer

- **Los gestos son una interfaz oculta** con baja descubribilidad: cada gesto necesita un botón
  equivalente visible (NN/g) [guía].
- **Primeros 60 segundos** [opinión, sobre SDT y revelación progresiva]:
  - 0 a 10 s: entrar con código o QR y nombre, igual que el módulo en vivo.
  - 10 a 30 s: base con una pieza ya puesta y una mano animada que arrastra la primera. Clic,
    rebote, sonido. Primera victoria en menos de 20 s.
  - 30 a 60 s: tres gestos aprendidos haciendo: colocar, girar la cámara, deshacer.
  - Después, a demanda: colores al lograr la primera tarea; aviso de cámara a las 10 piezas;
    multiselección y duplicar detrás de "Más".
- **Pista por inactividad**: tras unos 6 a 20 s sin colocar, sugerencia animada no modal.
- **Contra el lienzo en blanco**: plantillas de arranque (medio modelo para completar), tres
  ejemplos de interpretaciones distintas del tema y paleta inicial reducida (6 a 8 piezas, 4
  colores) [opinión + estudio de restricciones].
- **Deshacer como red de seguridad**: historial ilimitado en la sesión, sin diálogos de
  confirmación para borrar (borrar + toast "Deshacer" de 5 s) [guía NN/g].
- **Carga cognitiva**: una sola pieza en mano, recientes primero, siempre miniatura 3D con medida
  en studs, nunca solo "2x4" [opinión].

### 3.8 Accesibilidad

- **Teclado completo** con cursor de rejilla visible (WCAG 2.1.1 y 2.4.7) [guía].
- **Lector de pantalla**: el canvas es opaco. Región `aria-live="polite"` que anuncia cada acción
  ("Ladrillo 2 por 4 Girasol colocado, fila 3, columna 5, nivel 2"); bandeja con botones HTML
  reales y `aria-label` (WCAG 4.1.3) [guía].
- **`prefers-reduced-motion`**: sin inercia, encuadres por corte o fundido, sin rebotes ni
  partículas (WCAG 2.3.3) [guía].
- **Daltonismo**: válido e inválido por forma, contorno de selección doble (claro y oscuro) que
  se ve sobre cualquier color (WCAG 1.4.1 y 1.4.11) [guía]. Detalle en la sección 4.6.
- **Motricidad**: tocar-tocar en lugar de arrastrar (2.5.7) y botones de zoom en lugar de pinza
  (2.5.1) [guía].

---

## 4. Color y dirección de arte

### 4.1 Psicología del color: qué está probado

- **Color-in-context** (Elliot y Maier 2012, 2014): un color puede tener efectos opuestos según
  el contexto. Los propios autores reconocen que los datos del campo son "inconsistentes,
  rozando lo contradictorio" [estudio].
- **Mito**: "el azul hace más creativo y el rojo más detallista" (Mehta y Zhu 2009). La réplica
  directa de Steele (2014), con más del triple de participantes, no encontró el efecto. Las
  réplicas del efecto del rojo en rendimiento también fallaron (Collabra 2020; Psychonomic
  Bulletin & Review 2020) [estudio].
- **Lo robusto**: las asociaciones entre color y emoción son bastante universales. Jonauskaite
  et al. (2020), 4.598 personas de 30 países **incluida Colombia**: similitud media r = .88; el
  negro y el rojo son los más emocionales, el marrón el que menos [estudio].
- **Implicación** [opinión]: ninguna paleta va a hacer más creativa a la gente. Se eligen colores
  porque se distinguen, tienen carácter de marca y da gusto construir con ellos. El riesgo real
  es la monotonía del modelo, no el azul de la interfaz.

### 4.2 Lo que enseña la paleta de LEGO

- Pasó de rojo, amarillo y azul a más de 100 colores a comienzos de los 2000. En 2004 (crisis
  financiera) se depuró a 16 sólidos y 6 translúcidos como base fija [industria].
- **El cambio de grises de 2004** (gris cálido a gris azulado, marrón a marrón rojizo) fue la
  decisión de paleta más polémica: los tonos nuevos no combinaban con los viejos en un mismo
  modelo [industria]. **Lección**: no cambiar un tono una vez publicado, porque los modelos
  guardados delatan la diferencia.
- **Los neutros dominan**: negro, grises y blanco suman más del 50% de las piezas producidas
  [industria]. Los neutros son estructura; los saturados, acentos. Las sugerencias y plantillas
  deben apoyarse en neutros.
- **El "negro" no es negro** (LDraw usa #1B2A34) ni el blanco es blanco (#F4F4F4), para conservar
  detalle en sombras y luces [industria].
- Los translúcidos son de policarbonato (otro índice de refracción); los metálicos llevan acabado
  perlado [industria].

### 4.3 Paleta propia: 23 colores

**Cuántos**: Hick-Hyman crece en log2(n+1), así que pasar de 16 a 24 opciones apenas suma 0,55
bits, y baja mucho con buen agrupamiento [estudio]. La "paradoja de la elección" tiene un efecto
medio cercano a cero (Scheibehenne et al. 2010), pero aparece con presión por decidir rápido
(Chernev et al. 2015), que es justo el caso de un evento [estudio]. **Decisión**: 23 colores en
total, una fila "esencial" de 10 a 12 visible y el resto en un panel por familias [opinión].

**Organización**: por familia, de claro a oscuro, en posición fija (la memoria espacial acelera
la búsqueda) [opinión].

**Marca sin monotonía**: los cuatro azules entran como "familia Antídoto". Ni el fondo ni la base
son azules, para que los ladrillos azules destaquen [opinión].

Paleta simulada para deuteranopía, protanopía y tritanopía (matrices de Machado 2009, severidad
1,0) con distancias ΔE76 en CIELAB. Mandarina, Limoncillo y Musgo se ajustaron frente a LDraw
para eliminar colisiones graves.

| # | Nombre | Hex | Familia | Material | Nota de daltonismo (ΔE simulado) |
|---|---|---|---|---|---|
| 1 | Blanco Nube | `#F4F4F4` | Neutros | ABS | Seguro |
| 2 | Gris Neblina | `#A0A5A9` | Neutros | ABS | Seguro |
| 3 | Gris Asfalto | `#5B6168` | Neutros | ABS | Cerca de Musgo en deuteranopía (12,4) |
| 4 | Noche | `#1A242B` | Neutros | ABS | Seguro. Es el `#0F181D` de marca aclarado para conservar sombreado |
| 5 | Cielo Antídoto | `#80DCFF` | Antídoto | ABS | **Débil con Celeste para todos** (11,4 normal, 6,1 tritanopía) |
| 6 | Celeste Antídoto | `#3BC8F3` | Antídoto | ABS | Ver Cielo |
| 7 | Azul Antídoto | `#1C99CA` | Antídoto | ABS | **Cerca de Orquídea en deuteranopía (7,8)** |
| 8 | Abismo Antídoto | `#0C5C7D` | Antídoto | ABS | Seguro |
| 9 | Rojo Volcán | `#C91A09` | Cálidos | ABS | Cerca de Oro en deuteranopía (11,1), el material los separa |
| 10 | Mandarina | `#F57A12` | Cálidos | ABS | Cerca de Guayaba en tritanopía (7,5) |
| 11 | Girasol | `#FAC80A` | Cálidos | ABS | Cerca de Limoncillo en protanopía (13,5), aceptable |
| 12 | Guayaba | `#FF6D77` | Rosas | ABS | **Cerca de Arena en deuteranopía (9,2)** |
| 13 | Pitaya | `#D3359D` | Rosas | ABS | Cerca de Orquídea en protanopía (9,5) |
| 14 | Orquídea | `#A06EB9` | Rosas y violetas | ABS | Ver Azul Antídoto y Pitaya. Flor nacional de Colombia |
| 15 | Limoncillo | `#C2E15A` | Verdes | ABS | Corregido |
| 16 | Verde Cafetal | `#00852B` | Verdes | ABS | **Cerca de Oro en protanopía (3,8)**, lo resuelve el metal |
| 17 | Musgo Andino | `#5E7E6E` | Verdes | ABS | Ver Gris Asfalto |
| 18 | Arena Caribe | `#D7BA8C` | Tierras | ABS | Ver Guayaba |
| 19 | Panela | `#AA7D55` | Tierras | ABS | **Casi igual a Oro en tritanopía (2,7)**, lo resuelve el metal |
| 20 | Café Tinto | `#5F3109` | Tierras | ABS | Seguro |
| 21 | Oro Muisca | `#AA7F2E` | Especiales | Metálico perlado | Se distingue por el brillo metálico |
| 22 | Cristal | `#FCFCFC` | Especiales | Translúcido | Se distingue por la transparencia |
| 23 | Cristal Celeste | `#9FE3FA` | Especiales | Translúcido | Se distingue por la transparencia |

**Parejas a reforzar**: Cielo/Celeste (separarlas en el selector), Azul Antídoto/Orquídea,
Guayaba/Arena. Recursos: nombre visible o en tooltip, glifo pequeño por familia sobre la muestra,
y un modo accesible opcional con patrón en relieve sutil (normal map) en la cara superior según
la familia. Los especiales ya tienen redundancia por material.

**Prevalencia**: 2,4 a 2,5% de daltonismo rojo-verde en hombres de dos pueblos andinos
colombianos (1979); 6,7% con Ishihara en escolares de Bogotá; cerca de 1 de cada 12 hombres en el
mundo [estudio]. En un evento de 100 personas habrá varias.

### 4.4 Plástico realista

**Cómo se ve un ladrillo real** [industria: Stefan Müller, Mecabricks, Animal Logic]:
- Dieléctrico de brillo medio-alto cuyo reflejo se rompe por microrrelieve.
- IOR medido de 1,59 a 1,61, pero en render 1,5 a 1,55 se ve igual o mejor. Translúcidos: 1,58.
- Roughness 0,2 a 0,3 **con ruido de alta frecuencia**; una superficie perfecta a 0,4 queda
  "demasiado lisa".
- Subsurface sutil en blancos y amarillos: "si se ve el SSS, probablemente es demasiado".
- Lo más importante: **ondulación de baja frecuencia distinta por pieza** (deformación del molde),
  rayones finos, marcas de molde, huellas como segundo lóbulo especular.
- **Bisel**: sin él, el ladrillo parece de CAD.

**Referentes**:
- *The LEGO Movie* (Animal Logic): path tracing, SSS trazado y 81.854 texturas de rayones,
  suciedad y huellas; todo modelado como ladrillos reales [industria].
- *Builder's Journey*: diseño minimalista con luz ultrarrealista. Diseñaron los niveles en gris y
  añadieron el color al final. La lección es la **sobriedad**: pocas piezas, luz preciosa
  [industria].

**Valores para three.js** [opinión]:

| Parámetro | Sólidos ABS | Translúcidos | Metálicos |
|---|---|---|---|
| roughness | 0,28 a 0,35 | 0,05 a 0,1 | 0,3 a 0,4 |
| metalness | 0 | 0 | 0,8 a 1 (perlado 0,6 con algo de iridiscencia) |
| ior | 1,5 | 1,58 | n/a |
| clearcoat / roughness | 0,3 a 0,5 / 0,08 a 0,12 (solo nivel alto) | 0 | 0,2 / 0,15 |
| transmission | 0 | 0,9 a 1 (en celular: opacity + env map) | 0 |
| normal | ruido fino tileable 0,03 a 0,05 | igual | igual |

- Variación por pieza de ±1 a 2% de luminosidad y rotación del ruido según el ID.
- Bisel geométrico de 0,2 a 0,4 mm a escala real (algo exagerado para que se lea en pantalla
  chica) o normal map horneado.
- **Tone mapping Khronos PBR Neutral**: ACES y AgX desaturan y corren el tono, y los hex de marca
  dejarían de coincidir [industria][docs].

### 4.5 Escena e interfaz

- **Fondo de valor medio**, ni negro ni blanco: sobre `#0F181D` desaparecen Noche y Abismo; sobre
  blanco, Blanco Nube y Cielo. Propuesta: gradiente radial de `#2A3B46` a `#16222A` [opinión].
- **Base** en gris neutro o gris azulado propio, nunca verde ni azul, con sombra de contacto.
- **Luz de estudio** (vende "objeto premium") en lugar de exterior (vende "diorama"): entorno
  suave, luz clave direccional y contraluz fría tenue en Celeste de marca. Modo "hora dorada"
  opcional para la foto final [opinión].
- **Interfaz oscura** (`#0F181D` al 85 a 92%, sólida) con acentos en `#3BC8F3`: el 3D queda como
  la fuente de luz de la pantalla. Viewport de al menos el 70% de la pantalla [opinión].
- **Glassmorphism con criterio**: `backdrop-filter` sobre un canvas WebGL recompone el desenfoque
  en cada frame y castiga la gama media. Paneles sólidos semiopacos con borde de 1 px y sombra;
  el blur solo en modales estáticos [industria].
- **UI diegética** opcional: la bandeja como una bandeja física de piezas con luz propia.
- **El color activo se muestra como ladrillo 3D en miniatura**, no como un círculo plano.
- **Premium y no juguete barato**: pocos saturados a la vez, microimperfecciones, sombras de
  contacto, clic con varias tomas, Cal Sans solo en títulos y Poppins en la interfaz.
  **Evitar**: contornos negros de caricatura, bloom exagerado, cielos con nubes y cards con
  franja lateral de color (para destacar, punto de color junto al título o tinte de marca en
  hover).

### 4.6 Contraste (WCAG 2.2)

| Combinación | Contraste | Veredicto |
|---|---|---|
| `#80DCFF` sobre `#0F181D` | 11,64:1 | AAA |
| `#3BC8F3` sobre `#0F181D` | 9,19:1 | AAA |
| `#1C99CA` sobre `#0F181D` | 5,53:1 | AA texto normal |
| **`#0C5C7D` sobre `#0F181D`** | **2,43:1** | **Falla**: solo fondo o decoración |
| `#3BC8F3` sobre blanco | 1,95:1 | Falla |
| `#0C5C7D` sobre blanco | 7,39:1 | AAA |
| `#0F181D` sobre botón `#3BC8F3` | 9,19:1 | CTA principal recomendado |

**Fantasma**: válido = color real de la pieza al 40 a 60% con contorno sólido claro; inválido =
tinte neutro, contorno discontinuo e ícono ⊘. Nunca solo verde o rojo [guía + opinión]. Si un
reto pide "algo rojo", aceptar la familia o mostrar el nombre del color.

---

## 5. Game feel y sonido

Referencias: Steve Swink, *Game Feel* (2009); Jonasson y Purho, "Juice it or lose it" (2012);
Jan Willem Nijman, "The art of screenshake" (2013) [industria].

**Receta del encaje** [opinión derivada de esas referencias y del benchmark]:

1. **Fantasma** mientras se arrastra, con histéresis: no salta entre celdas vecinas por un píxel.
2. **Imán generoso**: el último tramo lo completa el sistema en 80 a 120 ms con ease-out.
3. **Microrrebote**: la pieza baja 2 a 3 mm de más y vuelve (squash vertical del 3 al 5%,
   unos 100 ms). GSAP ya está en el repo.
4. **Clic**: corto y seco, variación de tono de ±5 a 8%, 3 a 5 variantes. Un poco más agudo al
   apilar hacia arriba (sensación de progreso), volumen según tamaño de pieza.
5. **Sonido distinto y más suave al coger**, grave para lo inválido, "whoosh" inverso al
   deshacer (deshacer debe sentirse como jugar, no como error).
6. **Partículas mínimas**: 4 a 6 motas o un anillo de polvo. El confeti se reserva para hitos.
7. **Sacudida de cámara casi nula**; solo 2 a 3 px en piezas grandes o al terminar. En celular el
   screenshake constante marea.
8. **Háptica** de 8 a 15 ms con `navigator.vibrate` en Android. iOS Safari no la soporta; desde
   iOS 18 existe el truco del `<input type="checkbox" switch>`, pero desde 18.4 exige un clic real
   y caduca en un segundo [docs][producto]. Nunca como único canal.
9. **Hitos**: 10, 50 y 100 piezas con una pequeña fanfarria; foto final con flash.
10. **En el proyector**, cada pieza colocada en un celular produce un "pop" sutil en la vista del
    equipo: la actividad colectiva se ve.

**Síntesis del clic** (coherente con `src/components/experience/sound.ts` y
`src/components/live/sound.ts`, sin archivos ni licencias) [opinión]: ráfaga de ruido de 8 a
15 ms con band-pass de 2,5 a 4 kHz más un golpe senoidal de 120 a 180 Hz con caída de 40 ms.
Disparar en `pointerdown`/encaje, no en `click`. Reutilizar `SceneSound` (mute persistente). Si
la síntesis no convence, grabar plástico real o usar CC0.

**Botón de silencio visible**: 200 teléfonos sonando en un salón es ruido. Respetar el switch de
silencio de iOS.

---

## 6. Modos de juego para eventos

### 6.1 Valor y riesgo de cada formato

| Modo | Emoción | Duración | Riesgos |
|---|---|---|---|
| Construcción libre | Calma, orgullo | 5 a 8 min | Lienzo en blanco, nada que mostrar |
| Reto con tema y tiempo | Tensión lúdica, risa | 3 a 6 min por ronda | Ansiedad si el tiempo es corto |
| Replicar un modelo | Competencia | 2 a 4 min | Se vuelve test espacial |
| Equipo en tiempo real | Pertenencia, caos divertido | 6 a 10 min | Conflictos de edición, alguien acapara |
| Relevos | Suspenso | 5 a 8 min | Esperas, presión de ser observado |
| Teléfono roto | Comunicación, risa | 4 a 6 min por par | Necesita buen cierre |
| Galería y votación | Reconocimiento | 2 a 4 min | Concurso de popularidad, humillación del último |

### 6.2 Propuestas

**La Torre** (rompehielos, 3 a 4 min). Proyector: QR y consigna "la torre más alta con 15 piezas
en 90 segundos". Celular: tutorial integrado y construcción. Proyector: skyline en vivo con todas
las torres; se revelan las 3 más altas y una categoría sorpresa. Objetivo: aprender los controles
sin presión.

**Metáfora** (15 a 20 min, el más cercano a un taller facilitado). El anfitrión plantea una
pregunta configurable por la empresa ("¿cómo se ve un buen día en este equipo?"). Cada persona
construye con 30 piezas y escribe título y frase. Proyector: contador de quienes terminaron, sin
revelar obras. Se comparte en mesas y luego una galería aleatoria con opción de exclusión. Cierre
con preguntas de reflexión preparadas.

**Obra en Equipo** (8 a 12 min). Equipos de 3 a 5 con una base dividida en parcelas y bordes que
hay que conectar con los vecinos. Proyector: todas las bases creciendo en vivo con "pops".
Recorrido de cámara por cada obra y votación. Las parcelas evitan conflictos y acaparamiento; las
conexiones obligan a negociar.

**Teléfono Roto** (8 a 10 min, dos rondas). En parejas: el arquitecto ve un modelo secreto de 8 a
12 piezas y lo describe en voz alta; el constructor solo ve la base. Proyector: original y
resultado lado a lado, con un porcentaje de coincidencia solo como curiosidad. Se cambian roles.
Objetivo: comunicación clara entre áreas. La culpa compartida da risa, no vergüenza.

**Relevo de Constructores** (6 a 8 min). Modelo compartido por equipo, turnos de 45 s; a mitad
aparece una consigna sorpresa ("agreguen un puente"). Final con "créditos" de qué agregó cada
persona (efecto IKEA en autoría compartida). Es el patrón "Build Together" de la Builder app.

**Galería de Cierre** (5 a 8 min, siempre al final). Mural con todas las obras, votación por 3 o
4 categorías, podio por categoría sin mostrar a los últimos, extracción de 3 principios guía con
la sala. Cada persona recibe la imagen de su obra y el mural queda como entregable para la
empresa.

**Bloque recomendado de 40 min**: La Torre → Metáfora u Obra en Equipo → Teléfono Roto o Relevo
→ Galería de Cierre [opinión].

Regla del proyecto: aunque tenga rondas o modos internos, en los
listados es **una sola tarjeta**.

### 6.3 Reconocimiento sin matar la creatividad

- Sin puntos por cantidad ni velocidad en modos creativos [estudio]: empujan a construir rápido y
  feo, y Townscaper lo evita a propósito ("cuando puedes ganar, juegas a ganar y dejas de mirar
  lo que construyes") [entrevista].
- Votación por categorías múltiples ("la más ingeniosa", "la mejor historia", "la que más se
  arriesgó", "mejor uso de pocas piezas"): gana más gente y se premian virtudes distintas a la
  destreza.
- Votar con la obra anónima hasta después del voto, para evitar "todos votan al gerente".
- Insignias sorpresa no anunciadas ("constructor de puentes" si conectaste con otra parcela).
- Nunca mostrar el último lugar, igual que el podio del módulo en vivo.
- Botón "no quiero mostrar la mía" en la galería.
- El facilitador muestra primero un modelo propio deliberadamente simple para bajar el costo de
  exponerse.

### 6.4 Facilitación

- **El proyector es el escenario y el celular es el taller**, igual que el módulo en vivo:
  consigna, temporizador grande, actividad agregada en vivo y galería.
- Avisos a mitad de tiempo y a los 30 s finales, con música que sube.
- En grupos grandes se comparte en mesas de 4 a 6 y luego 3 o 4 ejemplos en el proyector, para
  conservar "todos cuentan".
- El cierre conecta con el objetivo del cliente (valores, colaboración, innovación, onboarding):
  "¿qué pieza de tu modelo representa algo que hoy nos falta?".

---

## 7. Arquitectura técnica y lógica de juego

### 7.1 Stack

- **three.js r186** (sep 2026). `WebGPURenderer` cae solo a WebGL2 [oficial].
- **WebGPU**: activo por defecto en Chrome, Edge, Firefox y Safari 26 (iOS 26). En Android,
  Qualcomm y ARM con Android 12+; **Samsung Xclipse (Exynos) sigue en progreso**, así que un
  Galaxy A con Exynos cae a WebGL2 [oficial].
- **React Three Fiber 9.x** es la línea estable para React 19 (el repo usa 19.2.8); drei funciona
  con v9. **R3F v10 (WebGPU de primera clase) está en alpha** [docs][oficial].
- `postprocessing` de pmndrs (N8AO, tone mapping) es solo WebGL [docs].
- **Decisión** [opinión]: WebGLRenderer + R3F 9 + drei + postprocessing para la v1. Encapsular el
  renderer y los materiales (`createRenderer(tier)`, `makeBrickMaterial(tier)`) para migrar a
  WebGPU cuando R3F v10 sea estable. El cuello de botella son draw calls y fill-rate, que se
  resuelven con instancing y DPR, no con WebGPU.

| Opción | A favor | En contra |
|---|---|---|
| three + R3F | Encaja con React/Next, ecosistema enorme | El "motor" (estado, input) se arma a mano |
| three vanilla | Control total | El HUD sería React igual |
| Babylon.js | Motor completo, WebGPU maduro | Bundle más pesado, integración React menos natural |
| PlayCanvas | Buen rendimiento móvil | Otro paradigma (editor/ECS) |

**Patrón clave**: no hacer un componente React por ladrillo. El modelo vive en una clase fuera de
React (`BrickWorld`) y unos pocos componentes escriben directo en los buffers de instancia. React
maneja la UI y la cámara. Esto también permite reconstruir la GPU tras `webglcontextlost` en iOS.

**Integración con Next 16**: `dynamic(..., { ssr: false })` solo funciona dentro de un Client
Component (`node_modules/next/dist/docs/01-app/02-guides/lazy-loading.md`) [docs].
- `src/app/construir/[key]/page.tsx` (Server Component) carga datos de Turso.
- `src/components/bricks/BuilderShell.tsx` (`"use client"`) hace el `dynamic` con skeleton.
- `Builder.tsx` importa three y R3F, así three queda en un chunk que solo baja esa ruta.
- Meta: **≤ 350 KB gz** para el chunk 3D; `RoomEnvironment` procedural pesa 0 KB [opinión].
- Si algún día se agrega CSP: permitir `worker-src blob:`.

### 7.2 Medidas

| Medida | mm | LDU (0,4 mm) |
|---|---|---|
| Paso entre studs | 8,0 | 20 |
| Alto de ladrillo (sin stud) | 9,6 | 24 |
| Alto de placa | 3,2 | 8 |
| Diámetro de stud | 4,8 | 12 |
| Alto de stud | 1,7 a 1,8 | 4 |
| Holgura por cara | 0,1 | 0,25 |

Proporciones: ladrillo/paso = 1,2; ladrillo = 3 placas [docs]. **Unidades internas enteras**:
`x, z` en studs, `y` en placas; un ladrillo ocupa 3 capas. A mundo se convierte una sola vez.

Si se estiliza la proporción por identidad propia (sección 8), cambia solo esta conversión.

### 7.3 Modelo de datos

```ts
// src/lib/bricks/types.ts
export type Rot = 0 | 1 | 2 | 3;                 // cuartos de vuelta en Y
export interface PartDef {
  id: number;                                     // u16 estable (se serializa)
  key: string;                                    // "brick-2x4", "plate-1x2", "tile-2x2"
  w: number; d: number; h: number;                // studs, studs, placas (3 = ladrillo)
  studsTop: boolean;                              // false para tejas lisas
  antiStudsBottom: boolean;
}
export interface Brick {
  id: string;                                     // uid corto (clientId + contador)
  part: number; color: number;                    // índice en la paleta propia
  x: number; y: number; z: number; rot: Rot;      // esquina mínima ya rotada
  by?: string;                                    // autor (multijugador, créditos)
}
export const key = (x: number, y: number, z: number) =>
  ((x + 512) << 20) | ((z + 512) << 10) | (y & 1023);

export function footprint(p: PartDef, rot: Rot) {
  return rot % 2 === 0 ? { w: p.w, d: p.d } : { w: p.d, d: p.w };
}
```

**Conectividad**: LDraw no la trae en su especificación base; LDCad agregó metas `SNAP_CYL` y
similares, y aun así hay casos de studs que no encajan [docs]. Con piezas rectangulares y 90°,
**la conectividad sale de la grilla**: A y B conectan si una celda superior de A está justo bajo
una celda inferior de B, A tiene `studsTop` y B `antiStudsBottom` [opinión].

**Colisiones**: ocupación por voxel en un `Map<CellKey, brickId>`, exacta para piezas en grilla.
AABB y BVH (three-mesh-bvh) solo si llegan piezas no rectangulares [opinión].

**Dentro de la v1**: ladrillos 1x1 a 2x8, placas 1x1 a 8x8, tejas lisas, base grande, 12 a 16
referencias. **Fuera**: pendientes, redondas, bisagras, Technic, studs laterales, minifiguras.
Las pendientes son las primeras candidatas para la v2: el benchmark las incluye en un catálogo
curado de 10 a 20 formas.

### 7.4 Colocación

El rayo de la cámara recorre la grilla con DDA (Amanatides-Woo): da celda y cara en
microsegundos, sin depender del número de ladrillos. El suelo es el plano `y = 0`.

```ts
// src/lib/bricks/place.ts
export function proposePlacement(world: BrickWorld, hit: Hit, part: PartDef, rot: Rot,
                                 anchor: [number, number]) {
  let [cx, cy, cz] = hit.cell;
  const [nx, ny, nz] = hit.normal;
  let y: number;
  if (ny === 1) y = cy + 1;                       // cara superior: apilar encima
  else if (ny === -1) y = cy - part.h;            // cara inferior: colgar debajo
  else { cx += nx; cz += nz; y = cy - (cy % 3); } // lateral: misma capa
  const x = cx - anchor[0], z = cz - anchor[1];
  for (let lift = 0; lift <= 6; lift++) {         // si choca, buscar hueco cercano
    const yy = y + (ny === -1 ? -lift : lift);
    if (yy < 0) break;
    if (!world.collides(part, rot, x, yy, z))
      return { x, y: yy, z, ok: world.isSupported(part, rot, x, yy, z) };
  }
  return { x, y, z, ok: false, reason: "ocupado" };
}
```

- El `anchor` (celda de la huella bajo el dedo) se conserva al rotar, para que la pieza gire
  alrededor del dedo.
- Histéresis: el fantasma cambia de celda solo si el punto pasa un umbral dentro de la nueva, y
  se anima con un lerp corto (lección de Bricktales).
- **Apoyo**: una pieza está apoyada si toca la base o encaja arriba o abajo con otra.
- **Grafo de conectividad**: `Map<brickId, Set<brickId>>`, actualizado solo con las celdas de
  arriba y abajo de la huella. Al borrar, BFS desde las piezas con `y === 0`; lo inalcanzable
  es un grupo flotante. **Política v1**: permitir el borrado y teñir el grupo flotante con un
  pulso y un aviso, como el chequeo de conectividad de Studio (informar, no impedir).

**Deshacer con patrón command** (las mismas operaciones sirven para red y persistencia):

```ts
type Op =
  | { t: "add"; brick: Brick }
  | { t: "remove"; brick: Brick }
  | { t: "paint"; id: string; from: number; to: number };
const invert = (op: Op): Op =>
  op.t === "add" ? { t: "remove", brick: op.brick }
  : op.t === "remove" ? { t: "add", brick: op.brick }
  : { ...op, from: op.to, to: op.from };
// En multijugador: deshacer solo ops propias; si el inverso ya no es válido
// (alguien apoyó algo encima), se descarta con aviso.
```

### 7.5 Render

- **Geometría procedural propia**: cuerpo biselado de 100 a 300 triángulos; caras inferiores y
  tubos solo si la cámara puede ver debajo (en la v1 no baja del plano).
- **Studs en un `InstancedMesh` global** con color por instancia; **los studs tapados no se
  instancian** (en un modelo compacto, del 60 al 90% menos). LOD lejano: menos segmentos o
  normal map de studs.
- **`BatchedMesh`** con todos los cuerpos (varias geometrías en un draw call) + el `InstancedMesh`
  de studs = **2 a 4 draw calls para todo el modelo** [docs][opinión].
- `MeshStandardMaterial` en niveles bajo y medio; `MeshPhysicalMaterial` con clearcoat solo en
  alto [opinión].
- Entorno `RoomEnvironment` + `PMREMGenerator`. Sombra direccional ajustada al bounding box;
  `ContactShadows` en celular; `AccumulativeShadows` solo en el modo foto [docs].
- AO con N8AO a media resolución en el nivel medio y solo en reposo [docs].
- **La palanca más grande: `frameloop="demand"`**. Un constructor pasa casi todo el tiempo quieto.
  Se baja la calidad durante la órbita (`performance.regress()`) y se re-renderiza con AO y
  sombras completas al soltar. Ahorra batería y calor, que es lo que tumba los FPS a los 10
  minutos [docs][opinión].
- **Escalado automático**: `PerformanceMonitor` y `AdaptiveDpr` de drei; nivel inicial por
  heurística (WebGPU, núcleos, memoria, renderer de GPU) guardado en localStorage.

### 7.6 Presupuesto por nivel (a validar en el prototipo)

Hardware de referencia: el Galaxy A06 fue el celular más vendido de Latinoamérica en 2025 (Helio
G85, GPU Mali-G52 MC2, pantalla 720p). En Colombia dominan también Moto G04s, Galaxy A05 y Redmi
Note 13 4G [prensa]. Ese es el piso.

| Nivel | Equipo típico | DPR | Sombras | AO | Material | Ladrillos | Draw calls | Triángulos | FPS en interacción |
|---|---|---|---|---|---|---|---|---|---|
| Bajo | Galaxy A0x, Exynos sin WebGPU | 1,0 | ContactShadows estática | No | Standard | 500 | ≤ 20 | ≤ 150k | 30 |
| Medio | Redmi Note, Galaxy A5x, iPhone 11 a 12 | 1,5 | Shadow map 1024 | N8AO media res. en reposo | Standard | 1.500 | ≤ 40 | ≤ 400k | 60 (30 aceptable) |
| Alto | iPhone 14+, Pixel 8, portátil | 2,0 | 2048 suave | N8AO en reposo | Physical + clearcoat | 3.000 | ≤ 60 | ≤ 1M | 60 |
| Ultra | Escritorio con GPU dedicada | nativo | PCSS + acumulativa en foto | N8AO siempre | Physical + clearcoat | 10.000 | ≤ 100 | ≤ 3M | 60+ |

**Carga**: interactivo en menos de 3 s en 4G. La UI llega en el HTML; mientras baja el motor se
ve un póster estático y una barra de progreso real (bytes), no un spinner infinito. Las piezas
básicas primero, el resto después; precacheo con service worker al entrar por QR, antes de que
empiece la dinámica.

### 7.7 Persistencia

- **Binario de 9 bytes por ladrillo** (part u16, x/y/z i16, rot+color u8): 2.000 ladrillos ≈
  18 KB, menos de 8 KB con `CompressionStream`. `BLOB` en Turso con versión en el primer byte.
- Tablas sugeridas: `brick_models(id, owner, activity_key, data, brick_count, updated_at)` y,
  para colaboración, `brick_ops(room, seq, op, by, at)` con compactación a snapshot.
  **Tablas nuevas: migrar producción antes de desplegar**.
- **Foto**: no usar `preserveDrawingBuffer` (cuesta siempre). Al pulsar "foto", render en el
  mismo tick y `canvas.toBlob()`, opcionalmente en calidad Ultra. Sirve también de miniatura.

### 7.8 Multijugador con Ably

Límites de la capa gratuita [docs]:

| Límite | Valor |
|---|---|
| Mensajes/mes | 6.000.000 |
| Conexiones concurrentes | 200 |
| Canales concurrentes | 200 |
| Publicación por canal | 50 msg/s |
| Tamaño de mensaje | 64 KiB |
| Historial | 24 h |

**La cuenta que manda** [opinión]: Ably cobra cada mensaje entregado a cada suscriptor. Una sala
de 40 personas colocando una pieza cada 3 s durante 20 minutos gasta unos **650.000 mensajes por
sesión** (más del 10% del mes) y roza los 50 msg/s por canal. Con **equipos de 5 en canales
separados** baja a unos 80.000. Reglas:
- Canales por equipo; el proyector se suscribe a los que necesita.
- Lotes de operaciones cada 150 a 250 ms.
- Nada de cursores o fantasmas remotos en tiempo real (máximo 2 Hz o solo al soltar).
- Presence de Ably en lugar de latidos propios.
- La cuota es compartida con el módulo en vivo.

**Autoridad en el servidor, no CRDT**: Yjs resuelve estructuras libres, pero aquí el conflicto es
semántico (dos piezas en la misma celda, apoyos que desaparecen) y no hay un provider Yjs-Ably
maduro. Mismo patrón que `src/app/api/live` y `src/lib/live-engine.ts`:
1. El cliente aplica la operación de forma optimista y hace POST `{op, clientSeq}`.
2. La API valida contra el estado, asigna `seq`, persiste y publica por Ably REST.
3. Los clientes aplican en orden de `seq`. Si hay rechazo o choque, rollback local con animación
   de "rebote". En la misma celda gana el primer `seq`.
4. Al reconectar, se piden las operaciones desde `seq N` a Turso, sin depender del historial de
   24 h de Ably.

### 7.9 Encaje en el repo

No hay nada 3D hoy. `SceneCanvas.tsx` es un canvas 2D pixel. Es un **módulo hermano** de las
experiencias, no otra `scene`:
- `src/lib/bricks/{types,grid,place,graph,ops,codec}.ts` con tests `*.test.mts` (como
  `live-engine`).
- `src/components/bricks/{BuilderShell,Builder,BrickInstances,Ghost,Hud,sound}.tsx`.
- `src/app/construir/[key]/page.tsx` y, si es colaborativo, `src/app/api/bricks/...`.
- Esquema en `db/schema.sql`.

---

## 8. Legal y marca

- **Patentes** del ladrillo con tubos (1958, US 3,005,282 de 1961): expiradas hace décadas
  [legal].
- **Forma del ladrillo como marca en la UE**: el TJUE anuló la marca 3D del ladrillo en *Lego
  Juris v OAMI* (C-48/09 P, 2010) porque sus características cumplen una función técnica [legal].
  Aun así, las guías de marca de LEGO siguen declarando como suya "la configuración
  ladrillo-y-perilla" [oficial]. La posición de LEGO es más amplia que lo que ganó en tribunales.
- **Minifigura**: marcas 3D confirmadas (T-395/14 y T-396/14 en 2015, y de nuevo en 2023)
  [legal]. **No hacer nada parecido**: cabeza cilíndrica con stud, manos en C, torso trapezoidal.
- **Diseño del ladrillo 2x2**: diseño comunitario registrado en 2010 bajo la excepción de
  sistemas modulares, **validado** en T-537/22 (2024). Puede durar hasta unos 2035 [legal].
- **Novedad de 2025**: desde el 1 de mayo de 2025 (Reglamento UE 2024/2822) los diseños UE
  cubren también productos no físicos, como objetos de videojuegos. Un 2x2 idéntico renderizado
  podría caer dentro [legal]. Antídoto opera en Colombia (Decisión 486 andina), donde ese
  registro UE no aplica directo, pero no conviene ser una copia exacta [opinión].
- **LDraw**: piezas nuevas en CC BY 4.0 (o CC0), antiguas en CCAL 2.0; exige atribución. Sus
  primitivas de stud con logo reproducen el logotipo LEGO y habría que excluirlas [docs]. **v1
  con geometría propia**; LDraw solo como referencia de medidas y, en una v2, como fuente de
  pendientes y redondas convertidas offline con atribución.

**Qué evitar**: la palabra LEGO en nombre o marketing ("tipo LEGO", "compatible con LEGO"), logo
en los studs, el rojo LEGO como color del juego, la minifigura, cajas o instrucciones en el estilo
oficial, "Serious Play".

**Qué ayuda a tener identidad propia**: nombre propio (por definir), stud con el isotipo de
Antídoto en relieve o liso, la paleta propia con la familia Antídoto, bisel y proporción
ligeramente estilizados, mascota propia que no sea minifigura. Mecabricks y otros constructores
de fans funcionan sin marca y evitan logos.

**Antes del lanzamiento público, un abogado revisa nombre y arte.**

---

## 9. Riesgos y prototipo vertical

### 9.1 Riesgos

1. **UX táctil**: precisión con el dedo y conflicto entre colocar y orbitar. Es el riesgo de
   producto más alto.
2. **Fill-rate y temperatura en celular**: se mitiga con render por demanda, DPR ≤ 1,5 y efectos
   solo en reposo.
3. **Navegadores dentro de apps** (WhatsApp, Instagram), desde donde llega mucha gente por QR:
   WebGL2 como base obligatoria.
4. **Cuota de Ably** compartida con el módulo en vivo.
5. **Parecido legal excesivo**.
6. **Pérdida del contexto WebGL** en iOS al cambiar de app: reconstruir desde `BrickWorld`.
7. **Peso de carga** con red móvil de evento saturada.

### 9.2 Prototipo vertical (validar antes de invertir en todo lo demás)

- **Fase A, banco de pruebas** (2 a 3 días). Ruta oculta con `admin-guard`, modelos
  pregenerados de 500, 1.500 y 3.000 ladrillos, geometría procedural, BatchedMesh y studs
  instanciados con descarte de tapados, RoomEnvironment, una sombra, N8AO en reposo, Neutral
  tone mapping y overlay de FPS, draw calls y triángulos. **Criterio de paso**: en un Android
  de gama media real y un iPhone 11 o 12, 1.500 ladrillos a ≥ 50 FPS orbitando con DPR 1,5,
  ≤ 40 draw calls, chunk ≤ 350 KB gz, primera imagen en menos de 3 s en 4G. Probar también en un
  Galaxy A0x como piso.
- **Fase B, se siente bien** (3 a 4 días). `src/lib/bricks/` con tests, fantasma con sombra e
  histéresis, gestos táctiles, clic sintetizado y animación de encaje. **Prueba con 5 personas
  sin explicación.**
- **Fase C, persistencia**: codec binario, tabla en Turso (migrar producción primero), foto y
  miniatura.
- **Fase D, colaboración**: canal por equipo, autoridad en API route y medición real de mensajes
  Ably por sesión.
- **Fase E, modos de juego y proyector**: La Torre y Galería de Cierre primero.
- **Fase F, pulido**: niveles automáticos, modo foto Ultra, revisión legal, documentación en
  `/admin/docs`.

---

## 10. Decisiones abiertas para el usuario

1. **Construcción libre, retos o ambos** en la primera versión.
2. **Individual, por equipos en tiempo real, o los dos.**
3. **Dispositivo principal**: celular (lo más probable en eventos), computador o pantalla grande.
4. **Dónde vive**: dentro de la biblioteca de experiencias o como actividad independiente.
5. **Nombre del juego y diseño del stud** (isotipo de Antídoto en relieve o liso).
6. **Qué piezas especiales entran pronto** (pendientes, ventanas, cilindros, translúcidos).

---

## 11. Fuentes

### Psicología y juego
- Guía open source de LSP (CC BY-SA 3.0): https://www.lego.com/cdn/cs/set/assets/blt8ec1d6ff766ddfd4/LEGO_SERIOUS_PLAY_OpenSource_14mb.pdf
- Guías de marca de LSP 2017: https://www.lego.com/cdn/cs/set/assets/bltaa1b18977a46a9f0/LEGO_SERIOUS_PLAY_Trademark_Guidelines_version_2017.pdf
- Alcance de la licencia open source: https://seriousplaypro.com/about/open-source/
- Las 7 técnicas de aplicación: https://www.strategicplay.com/article/what-are-the-7-applications--8680.asp
- LSP y capacidad de investigación: https://www.nature.com/articles/s41599-024-03930-5
- LSP vs VR para Scrum: https://arxiv.org/pdf/2407.00334
- Efecto IKEA (Norton, Mochon, Ariely): https://dash.harvard.edu/bitstreams/7312037d-2473-6bd4-e053-0100007fdf3b/download
- Competencia y efecto IKEA: https://www.sciencedirect.com/science/article/abs/pii/S0167811612000584
- Restricciones y creatividad (Acar et al. 2019): https://journals.sagepub.com/doi/abs/10.1177/0149206318805832
- Deci, Koestner y Ryan 1999: https://home.ubalt.edu/tmitch/642/articles%20syllabus/Deci%20Koestner%20Ryan%20meta%20IM%20psy%20bull%2099.pdf
- Edmondson 1999: https://journals.sagepub.com/doi/10.2307/2666999
- Engeser y Rheinberg 2008: https://www.uni-trier.de/fileadmin/fb1/prof/PSY/PGA/bilder/Engeser___Rheinberg_2008.pdf
- Ladrillos físicos vs digitales en niños: https://onlinelibrary.wiley.com/doi/10.1111/desc.13432
- From Brick to Click: https://arxiv.org/pdf/2502.04525
- Físico vs virtual en arquitectura: https://drarch.org/index.php/drarch/article/view/349
- Game feel en la web: https://valdemird.com/blog/game-feel-on-the-web/
- The art of screenshake (recreación): https://github.com/colinbellino/screenshake

### Benchmark
- Light Brick Studio: https://www.brickamag.com/article/light-brick-studio-redefining-lego-play-through-emotion-and-design
- Mesa redonda Builder's Journey: https://ramblingbrick.com/2021/07/13/going-on-a-builders-journey-with-light-brick-studios-fan-media-round-table/
- Making of Builder's Journey: https://www.pocketgamer.biz/interview/72360/making-of-lego-builders-journey/
- Builder's Journey (Destructoid): https://www.destructoid.com/reviews/review-lego-builders-journey-pc-mobile-xbox-playstation-switch/
- Builder's Journey (Steam): https://steamcommunity.com/app/1544360/discussions/0/3053985636029388196/
- Light Brick y visionOS: https://80.lv/articles/light-brick-talks-lego-builder-s-journey-s-development-unity-s-visionos-support
- Bits n' Bricks, Bricktales con ClockStone: https://www.lego.com/cdn/cs/set/assets/blte84bc07b1bd5a6bf/bits_n_bricks_s05e50_feature_and_transcript.pdf
- Bricktales (The Sixth Axis): https://www.thesixthaxis.com/2022/10/11/lego-bricktales-review-switch/
- Bricktales (Gamereactor): https://www.gamereactor.eu/lego-bricktales-1214843/
- Studio, mover piezas: https://studiohelp.bricklink.com/hc/en-us/articles/5410338956695-Moving-parts
- Studio, conectividad: https://studiohelp.bricklink.com/hc/en-us/articles/6501624386071-Connectivity-check
- Studio, estabilidad: https://studiohelp.bricklink.com/hc/en-us/articles/6501498505111-Stability-check
- Studio, cámara: https://studiohelp.bricklink.com/hc/en-us/articles/5409213150487-Camera-control-in-the-viewport
- Studio, atajos: https://studiohelp.bricklink.com/hc/en-us/articles/5706320095255-Shortcuts
- Studio vs LDCad vs Mecabricks: https://theearlofbricks.com/blog-studio-vs-ldcad-mecabricks/
- Mecabricks (Brickset): https://brickset.com/article/52336/let-s-build-in-mecabricks!
- Fin de LDD: https://www.brothers-brick.com/2022/01/12/lego-fully-discontinuing-lego-digital-designer-in-favor-of-bricklink-studio/
- LEGO Worlds (Nintendo Life): https://www.nintendolife.com/reviews/nintendo-switch/lego_worlds
- LEGO Fortnite: https://primagames.com/news/lego-fortnite-players-agree-that-building-is-frustrating-and-the-weakest-part-of-the-game
- LEGO Builder app: https://www.lego.com/en-us/families/building-together/what-is-lego-builder
- Minecraft, controles: https://minecraft.wiki/w/Controls
- Minecraft, quejas de cámara táctil: https://feedback.minecraft.net/hc/en-us/community/posts/45279334876813-Improve-multi-touch-controls-and-add-camera-control-zones-for-mobile
- Cómo funciona Townscaper: https://www.gamedeveloper.com/game-platforms/how-townscaper-works-a-story-four-games-in-the-making
- Townscaper (PC Gamer): https://www.pcgamer.com/townscapers-developer-on-how-its-radically-casual-design-is-inspiring-a-new-wave-of-low-stress-builders-to-adapt-the-blueprint/
- Townscaper móvil (TouchArcade): https://toucharcade.com/2021/10/20/townscaper-mobile-review-iphone-android-ipad-icloud-controller-support-raw-fury/
- Brickit: https://eandt.theiet.org/2022/10/18/software-review-brickit-lego-modelling-app

### Interacción
- Shallow-depth 3D (CHI 2007): https://dl.acm.org/doi/10.1145/1240624.1240798
- DS3 (TVCG): https://doi.org/10.1109/tvcg.2011.129
- tBox (CHI 2011): https://inria.hal.science/inria-00567654
- Au, Tai, Fu 2012: https://onlinelibrary.wiley.com/doi/abs/10.1111/j.1467-8659.2012.03044.x
- Besançon et al. (CHI 2017): https://dl.acm.org/doi/10.1145/3025453.3025863
- Shift (Vogel y Baudisch): https://www.patrickbaudisch.com/publications/2007-Vogel-CHI07-Shift.pdf
- Hoober, agarres: https://alistapart.com/article/how-we-hold-our-gadgets/
- Hoober, precisión por zona: https://www.uxmatters.com/mt/archives/2017/07/design-for-fingers-touch-and-people-part-3.php
- NN/g, tamaño de objetivos: https://www.nngroup.com/articles/touch-target-size/
- Parhi, Karlson, Bederson 2006: https://dblp.org/rec/conf/mhci/ParhiKB06.html
- Nielsen y Norman sobre gestos: https://ignorethecode.net/blog/2010/05/30/nielsen_and_norman_on_gestures/
- WCAG 2.5.7: https://www.w3.org/WAI/WCAG22/Understanding/dragging-movements.html
- Tinkercad, atajos: https://assets.ctfassets.net/jl5ii4oqrdmc/7pcZdRfyxgELZ5Vl3kfFq1/3d66e21f311bd9b8a4f8ac8b8fc71989/Tinkercad_Keyboard_Shortcuts_Printable_fullpage-portrait_letter.pdf
- Háptica en iOS 18: https://github.com/samdenty/ios-vibrator-pro-max
- Estado de vibrate en iOS: https://github.com/mdn/browser-compat-data/issues/29166
- Galaxy A06, el más vendido de LATAM: https://www.enter.co/smartphones/galaxy-a06-celular-mas-vendido-latam-2025/
- Más vendidos en Colombia: https://www.portafolio.co/tecnologia/cuales-son-los-5-celulares-mas-vendidos-en-colombia-en-2025-segun-la-ia-631758

### Color y arte
- Réplica de Mehta y Zhu (Steele 2014): https://www.appstate.edu/~steelekm/documents/Steele2014-Color-M&Z.pdf
- Mehta y Zhu 2009: https://www.science.org/doi/abs/10.1126/science.1169144
- Revisión de Elliot y Maier: https://www.researchgate.net/publication/275049913_Color_and_psychological_functioning_a_review_of_theoretical_and_empirical_work
- Réplicas del efecto del rojo: https://online.ucpress.edu/collabra/article/6/1/3/113047/Processing-the-Word-Red-and-Intellectual
- Revisión 2020 del rojo: https://link.springer.com/article/10.3758/s13423-020-01772-1
- Jonauskaite et al. 2020: https://journals.sagepub.com/eprint/5G3HXWNGZTT6ZXFIHTDP/full
- Sobrecarga de elección (Chernev et al.): https://chernev.com/wp-content/uploads/2017/02/ChoiceOverload_JCP_2015.pdf
- Paleta de LEGO 1975-2014: https://www.brothers-brick.com/2015/10/14/the-changing-palette-of-lego-1975-2014/
- Cambio de color de 2004: https://brickwiki.org/wiki/Colour_change
- Brick Architect, colores: https://brickarchitect.com/color/
- LDConfig de LDraw: https://library.ldraw.org/library/official/LDConfig.ldr
- Material de LEGO (Stefan Müller): https://stefanmuller.com/exploring-lego-material-part-2/
- Animal Logic y Glimpse: https://www.fxguide.com/fxfeatured/a-glimpse-at-animal-logic/
- Ray tracing en Builder's Journey: https://www.nme.com/features/the-joy-of-lego-builders-journeys-emotional-raytracing-2995252
- Daltonismo en pueblos andinos: https://www.tandfonline.com/doi/abs/10.1080/03014467900003471
- Visión del color en Bogotá: https://www.researchgate.net/publication/291100913_Prevalencia_de_alteraciones_de_la_vision_al_color_y_de_alteraciones_visomotoras_en_tres_localidades_de_Bogota
- WCAG 2.2: https://www.w3.org/TR/WCAG22/

### Técnica y legal
- three.js r186: https://github.com/mrdoob/three.js/releases/tag/r186
- Estado de WebGPU: https://github.com/gpuweb/gpuweb/wiki/Implementation-Status
- WebGPU en Chrome: https://developer.chrome.com/docs/web-platform/webgpu/overview
- Migración a R3F v9: https://r3f.docs.pmnd.rs/tutorials/v9-migration-guide
- R3F, versiones: https://github.com/pmndrs/react-three-fiber/releases
- InstancedMesh vs BatchedMesh: https://discourse.threejs.org/t/how-to-choose-between-instancedmesh-and-batchedmesh/81221
- 100 consejos de rendimiento three.js: https://www.utsubo.com/blog/threejs-best-practices-100-tips
- N8AO: https://github.com/N8python/n8ao
- Tone mapping en pmndrs: https://discourse.threejs.org/t/pmndrs-post-processing-tone-mapping-guidance/59374/2
- Políticas de LDraw: https://www.ldraw.org/pt-policies.html
- Metas de LDCad: https://www.melkert.net/LDCad/tech/meta
- Límites de Ably: https://ably.com/docs/platform/pricing/limits
- Plan gratuito de Ably: https://ably.com/docs/platform/pricing/free
- T-537/22: https://ieu-monitoring.com/editorial/eu-general-court-judgment-in-case-t-537-22-delta-sport-handelskontor-v-euipo/426541
- Minifigura (T-395/14): https://www.noerr.com/en/insights/lego
- Minifigura 2023: https://ipkitten.blogspot.com/2023/12/general-court-maintains-validity-of.html
- Reforma de diseño UE: https://www.hsfkramer.com/notes/ip/2025-05/eu-design-reform-begins-key-provisions-of-eu-regulation-2024-2822-effective-from-1-may

**Notas de confianza**: varias páginas (Prima Games, PC Gamer, Brick Fanatics y dos estudios de
2025-2026) devolvieron 403; esos datos vienen de los fragmentos del buscador. Las convenciones de
Blender, SketchUp y Onshape y los valores de HIG y Material son conocimiento consolidado, no
reconsultado. Lo marcado [observado] no se verificó abriendo el producto. Los ΔE de daltonismo y
los contrastes se calcularon con scripts durante la investigación.
