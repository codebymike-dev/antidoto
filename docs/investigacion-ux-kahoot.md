# Investigación: cómo Kahoot diseña la experiencia en vivo

Referencia para el pulido visual, sonoro y de animación del módulo en vivo de Antídoto
(pantallas del proyector y del celular). Se usa **después** de que todas las funciones
estén programadas: aquí no hay lógica nueva, solo cómo debe verse, sonar y sentirse.

Investigado el 2026-09-22 y contrastado con la implementación el mismo día (el estado
real está en las secciones 8 y 9). Fuentes al final. Cada dato indica de dónde sale:

- **[código]**: extraído de los bundles públicos de Kahoot (`kahoot.it`, app del jugador, y
  `play.kahoot.it`, app del host/proyector). Es lo que el producto hace hoy, no una opinión.
- **[oficial]**: guía de marca de Kahoot o su centro de ayuda.
- **[estudio]**: investigación académica (Wang y Lieberoth, NTNU).
- **[observado]**: comportamiento conocido del producto que no pude confirmar en el código.

> Aviso legal: se imita la **sensación** y los **principios**, no los activos. La música,
> los sonidos, las ilustraciones, la marca y los textos de Kahoot tienen derechos. Todo lo
> que se use en Antídoto tiene que ser propio, sintetizado o con licencia libre (CC0/MIT).

---

## 1. Por qué funciona (los principios detrás de todo)

1. **Es un programa de concurso de TV, no un examen.** El profesor Alf Inge Wang (creador del
   concepto, NTNU 2006) lo diseñó para convertir la clase en un *game show*: el anfitrión
   conduce, los participantes compiten. Cada decisión visual y sonora sirve a eso. [estudio]
2. **La gente mira hacia arriba, no hacia el celular.** La pregunta vive en la pantalla grande;
   el celular es solo un control remoto con 4 botones de color y forma. La emoción se comparte
   en la sala. [oficial]
3. **El audio es lo que más energía genera.** En el experimento de Wang con 593 estudiantes
   (4 grupos: completo / sin audio / sin puntos / sin nada), lo observado en sala fue: [estudio]
   - Completo: risas, gritos al acertar, discusiones fuertes entre preguntas, "algunos
     empezaron a bailar en sus asientos", muchas preguntas al profesor.
   - Sin audio: sala en silencio, concentrada, **sin festejos ni discusión**.
   - Sin puntos pero con audio: casi igual de animado que el completo.
   - Sin nada: "baja energía, totalmente en silencio".
   - Conclusión textual: *"el audio tuvo el mayor impacto en la dinámica de la sala"*. Los
     puntos suman, pero menos. **Si hay que priorizar, el sonido va antes que las animaciones.**
4. **El "momento fogata".** Tras cada pregunta hay una pausa donde todos miran el gráfico de
   respuestas y el anfitrión comenta. El diseño deja ese hueco a propósito. [oficial]
5. **Nadie queda afuera.** Mensajes de ánimo para quien falla, "fuiste el que más subió",
   rachas grupales. Valores de marca: *juguetón, curioso, inclusivo*. [oficial]
6. **Efecto desgaste.** Wang midió que la novedad se gasta con el uso repetido. Kahoot lo
   combate rotando música de lobby, temas y mensajes aleatorios (hay 12 variantes solo para
   "primer lugar"). Antídoto debería tener variedad desde el día uno. [estudio] [código]

---

## 2. Identidad visual

### 2.1 Colores de respuesta [código]

Mapa exacto del código del jugador (`shapeColor`):

| Forma | Color | Hex | Alto contraste |
|---|---|---|---|
| Triángulo | rojo | `#E21B3C` | `#880000` |
| Rombo | azul | `#1368CE` | `#001970` |
| Círculo | amarillo | `#D89E00` | `#794100` |
| Cuadrado | verde | `#26890C` | `#0D4100` |
| Pentágono (5ª opción) | teal | `teal2` | `#5B596C` |
| Embudo (6ª opción) | morado | `#864CBF` | `#4C6060` |

- **Verdadero/Falso** usa solo dos: `[rombo azul, triángulo rojo]` (verdadero = azul).
- Hay un modo **"Aumentar contraste"** (recomendado para proyector) que oscurece los fondos
  de respuesta para que el texto blanco se lea mejor. [oficial]

Otros tokens relevantes: morado de marca `#46178F` (fondo por defecto), morado oscuro
`#25076B`, texto por defecto `#333333`, verde acierto claro `#66BF39`, rojo `#FF3355`,
amarillo vivo `#FFA602`, azul claro `#45A3E5`.

### 2.2 Formas

Triángulo, rombo, círculo y cuadrado son **símbolos secundarios de marca**. Además de
identificar respuestas, decoran fondos lisos y espacios en blanco. Siempre planas, sin
trazo, sin textura, sin sombras suaves (a lo sumo una sombra dura). [oficial]

**Accesibilidad**: la forma existe para que nadie dependa del color (daltonismo). En el
celular, los botones muestran solo la forma, sin texto. [oficial]

### 2.3 Tipografía [oficial]

- Montserrat en 4 pesos: light, regular, bold, **black**.
- **Black para "gritar"** y para títulos. Bold para subtítulos. Regular para texto.
- Un toque de color puede resaltar una palabra clave en black.
- Los títulos del celular usan texto con sombra (`ShadowText`) para que se lean sobre
  fondos de color. [código]

### 2.4 Reglas de color de la marca [oficial]

- Sobre fondos de color o foto, **siempre texto blanco**. Nunca texto de color sobre color.
- Usar **2, máximo 3 colores** por pantalla para no ensuciar.
- Cumplir WCAG 2.1.
- Ilustraciones siempre positivas o con humor, **incluso en errores**.

### 2.5 Traducción a Antídoto

- **Tipografía**: Cal Sans cumple el rol de Montserrat Black (gritos, números grandes,
  PIN, puntajes, "¡Correcto!"). Poppins para todo lo demás. Modulus queda para marca.
- **Fondo del juego**: en vez del morado `#46178F`, el casi negro de marca `#0F181D` o el
  azul oscuro `#0C5C7D`, con formas geométricas grandes y translúcidas flotando lento
  (como los fondos de Kahoot). El proyecto ya tiene "blobs" animados en la landing que
  pueden reutilizarse.
- **Paleta de respuestas (decidida).** Se descartaron los 4 tonos de marca (todos azules,
  se confundían en un proyector lavado) y se eligieron **4 matices distintos**, como
  Kahoot. Viven en `src/components/live/AnswerShape.tsx`, en dos variantes:

  | Forma | `bg` (botón, texto encima) | `bright` (sobre fondo oscuro) |
  |---|---|---|
  | Triángulo | coral `#C94950`, texto blanco | `#F2545B` |
  | Rombo | azul `#197DA4`, texto blanco | cian de marca `#3BC8F3` |
  | Círculo | ámbar `#E8A33D`, texto `#0F181D` | `#E8A33D` |
  | Cuadrado | verde `#278458`, texto blanco | `#2FA66A` |

  Los `bg` salieron de mezclar el tono vivo con el casi negro de marca hasta contraste
  4.5:1 con su texto (el proyector lava los colores; Kahoot también usa tonos oscuros).
  Los `bright` tienen buen contraste sobre `#0F181D`: se usan como texto (nube de
  palabras) y en el confeti. Verdadero/Falso usa triángulo y rombo en ese orden; se
  decidió mantenerlo así aunque "Verdadero" quede coral.
- Confeti y celebraciones usan **los 4 colores de respuesta** (Kahoot hace exactamente eso).

---

## 3. Sonido (la prioridad número uno)

### 3.1 Arquitectura de audio de Kahoot [código]

- Librería: **Howler.js** en ambas apps. Formatos: `.webm` (Opus) con respaldo `.mp3`
  (Safari de escritorio recibe solo mp3).
- **Todo el sonido sale del proyector.** El celular del jugador casi no suena en el modo
  clásico: la sala escucha una sola fuente, no 50 celulares desincronizados.
- Precarga: los efectos de cada fase se cargan antes de necesitarlos (`bufferAudio`).
- Música del lobby: ~18 pistas elegibles (Classic, IndiePop, 8bit, 16bit, 80s, Disco,
  Funk, Reggae, Space, Fantasy, Beatbox, Dance, Miami, Glory, Adventure, Halloween,
  Christmas...), cada una con versión "preview" para escucharla en el selector. La clásica
  va a **120 BPM**, en loop, "ligeramente errática y repetitiva". Se puede silenciar y
  ajustar volumen desde el lobby.

### 3.2 La música de la pregunta: una pista por duración [código]

El hallazgo más importante. Kahoot **no** pone una canción en loop durante la pregunta:
tiene **una pista compuesta para cada duración de timer**, y el clímax coincide con el
final del tiempo.

```
DurationTracks = {
  5:   [answer_05sec, alt02, alt03],
  10:  [answer_10sec, alt02, alt03],
  15:  [alt01..alt05],
  20:  [answer_20sec, alt02, alt03],
  30:  [answer_30sec, alt02, alt03],
  45:  [alt01..alt05],
  60:  [answer_60sec, ...], 90: [...], 120: [...], 240: [...]
}
```

Hay 3 a 5 variantes por duración para no repetir siempre la misma. El compositor de la
versión 2016 (Eirik Myhr) la describe como *"una meditación de spa que se convierte en una
feroz escena de batalla"*: arranca tranquila y **acelera e intensifica** hacia el final.
Instrumentación: batería seca, sintetizadores "nerds" y glockenspiel, estilo indie pop.

**Para Antídoto**: los tiempos por pregunta deberían limitarse a una lista fija (por
ejemplo 5, 10, 20, 30, 60, 90, 120 s) para poder tener una pista por duración. Alternativa
más barata: una sola pista con capas (loop base + capa de tensión que entra en los últimos
5 s + tick acelerando), controlada con Web Audio.

### 3.3 Mapa de eventos sonoros del modo clásico [código]

Nombres internos reales del host y cuándo suenan:

| Momento | Sonido interno | Detalle |
|---|---|---|
| Jugador entra al lobby | `POP01..POP09` | Pops cortos variados |
| Lobby | `AUDIO_LOBBY_MUSIC` | Loop 120 BPM, volumen ajustable |
| Cuenta regresiva de inicio | `COUNTDOWN_3`, `COUNTDOWN_2`, `COUNTDOWN_1` | Un sample distinto por número |
| Fin de cuenta regresiva | `COUNTDOWN_WHOOSH_OUT` | Barrido de salida |
| Pregunta en curso | Pista según duración | Ver 3.2 |
| **Cada respuesta recibida** | `ANSWERED_SAMPLE` | Suena en el proyector por cada respuesta, con *throttle* de 60 ms, e ignora las tardías. Es el "tic-tic-tic" de la sala respondiendo |
| Se acaba el tiempo | `TIME_UP_SAMPLE` (archivo `TheEnd`) | Golpe tipo gong. También si todos respondieron |
| Barras de resultado creciendo | `TICK` | **El tono sube** mientras crecen: `rate = 0.8 + (1 - progreso)` |
| Barras terminan | `APPEAR` | 1 s después de terminar |
| Se revela la correcta | `QUIZ_ANSWER_REVEAL` | 250 ms después de `APPEAR` |
| Puntos sumando | `POINTS` | Volumen 0.25, se corta al terminar |
| Transición a marcador | `WHOOSH` | Volumen 0.25 |
| Encuesta: resultados | `POP01..03` | Con retrasos escalonados 1 s / 1.4 s / 1.8 s |
| Nube de palabras | `POP01..POP09` | Cada palabra con un pop, **de tono ascendente**; la palabra más votada suena con `PING` |
| Barridos varios | `SWOOSH1/2/3` | El número depende de la cantidad (menos de 4, menos de 8, más) |
| Podio | `PODIUM` | Pista de podio, sin loop |
| Otros | `TADA` (1.5 s después de un reveal), `FANFARE`, `FINAL_FANFARE`, `CROWD_CHEER`, `SHORT/LONG_SPOTLIGHT_RISE` | Celebraciones |

Técnicas que vale la pena copiar tal cual:

- **Pitch que sube con el progreso** (tick de barras, pops de la nube): da tensión
  creciente con un solo sample.
- **Pequeña variación aleatoria** de tono en sonidos repetidos (`0.95 + random * 0.1`)
  para que 30 "pops" seguidos no suenen robóticos.
- **Throttle** de sonidos por evento masivo (60 ms) para que 50 respuestas en 1 segundo
  no saturen.
- **Volúmenes relativos**: música de fondo alta, efectos de UI (puntos, whoosh) a 0.25.

### 3.4 Cómo conseguir los sonidos gratis (sin tocar los de Kahoot)

Respetando la regla de "todo en capa gratuita":

1. **Síntesis con Web Audio API** (recomendado para efectos): pops, ticks, whoosh, gong,
   acorde de acierto y "bloop" de error se generan en ~100 líneas sin archivos, sin
   licencias y sin peso de descarga. Permite el pitch variable de forma natural.
2. **Librerías CC0** para lo que no convenga sintetizar: Kenney.nl (packs de audio de UI y
   juegos, CC0), Freesound.org filtrando por licencia CC0, Pixabay Music/SFX (licencia
   propia, uso libre sin atribución).
3. **Música**: pistas libres de Pixabay o componer loops propios. Para la música por
   duración, una pista base + capas (ver 3.2) es lo más realista sin compositor.
4. **Reproducción**: Howler.js (MIT, ~7 KB gz) si se usan archivos; Web Audio directo si
   todo es sintetizado. Tone.js (MIT) si se quiere secuenciar música procedural.

### 3.5 Detalles técnicos que no se pueden olvidar

- **Política de autoplay**: el navegador bloquea audio hasta que el usuario interactúa. El
  botón del host "Abrir sala" o "Comenzar" debe **desbloquear el AudioContext**. Mostrar un
  aviso "Activa el sonido" si sigue suspendido.
- Controles del host siempre visibles: silenciar música, silenciar efectos, volumen.
  Kahoot los separa (música de lobby / efectos). [oficial]
- En el celular, en vez de sonido, **vibración corta** al responder y patrón distinto al
  acertar o fallar (`navigator.vibrate`, funciona en Android; iOS lo ignora sin error).
- Sincronía: el sonido del gong debe dispararse con el evento del servidor, no con el
  timer local, para que coincida con el corte real.

---

## 4. Animación y movimiento

### 4.1 Stack de Kahoot [código]

GSAP (tweens), Lottie y Rive (animaciones de ilustración), PixiJS (avatares en WebGL),
`react-confetti` (confeti del podio) y styled-components con `@keyframes` para lo demás.
Respetan `prefers-reduced-motion` en cada animación (`animation-name: none`).

### 4.2 El sello: easing con rebote [código]

Casi todas las curvas del código tienen **overshoot** (valores mayores que 1: el elemento
se pasa y vuelve). Es lo que hace que todo se sienta "elástico" y juguetón:

```
cubic-bezier(0.05, 0.48, 0.47, 1.28)   /* entrada del título de pregunta, 400 ms */
cubic-bezier(0.34, 1.56, 0.64, 1)      /* "easeOutBack" clásico, pop de elementos */
cubic-bezier(0.41, 0.52, 0.02, 1.49)
cubic-bezier(0.39, 0.5, 0.24, 1.53)
cubic-bezier(0.68, -0.55, 0.265, 1.55) /* anticipa hacia atrás y rebota: "easeInOutBack" */
cubic-bezier(0.54, 1.5, 0.38, 1.11)
```

Regla práctica: **entradas con rebote (200 a 500 ms), salidas rápidas y sin rebote.**
Animaciones con nombre en el código: `shake` (error), `pulse`, `debounce`, `slideDown`.

### 4.3 Coreografía exacta del podio [código]

Constantes `chartConstants` del jugador (segundos desde que empieza el podio):

| t (s) | Evento |
|---|---|
| 0 | Entra el título (intro 0.5 s) |
| 1.5 | El título se reacomoda (*snap back*) |
| **2.2** | Aparece la columna de **bronce** (pop-in 0.5 s) |
| 3.7 | Aparece el jugador de bronce, 4.8 "baila" (*groove* 1 s) |
| 6.2 | Bronce se reacomoda |
| **6.5** | Aparece la columna de **plata** |
| 7.7 | Aparece el jugador de plata, 8.8 baila |
| 9.2 | Plata se reacomoda |
| **9.5** | Aparece la columna de **oro** |
| 10.5 | **Entra un foco de luz** (dura 3.2 s): la pausa dramática |
| **13.2** | **Confeti** (dura 12 s) |
| 13.5 | Sale el foco |
| 13.7 | Aparece el ganador |
| 15.5 / 15.8 | Oro se reacomoda, el ganador baila |
| 17.2 | Aparecen los puestos 4 y 5 (4 s) y la barra inferior |

Claves: orden **3º → 2º → 1º**, unos 3 a 4 s entre medallas, y **3 s de suspenso con foco
antes del ganador**. Botones "Saltar animación" y "Repetir animación" para el host. Los
jugadores del podio ven una medalla en su celular; del 4º al 5º ven su puesto; del 6º en
adelante solo su puntaje. [oficial]

### 4.4 Confeti [código]

- Colores: los **4 colores de respuesta** (azul, rojo, amarillo, verde).
- Cae desde arriba a todo el ancho, 150 a 200 piezas, fricción 0.995, dura ~12 a 15 s.
- Temas especiales cambian la forma (copos de nieve, hojas, burbujas).
- Para Antídoto: `canvas-confetti` (MIT, ~6 KB gz) cumple igual y respeta reduced motion
  con `disableForReducedMotion: true`.

### 4.5 Otras animaciones clave

- **Barras de resultado**: crecen desde cero en paralelo, con el tick de tono ascendente;
  al terminar, las incorrectas se atenúan y la correcta queda con un check. [código]
- **Marcador (top 5)**: los nombres se reordenan deslizándose a su nuevo puesto; los
  puntos cuentan hacia arriba con sonido. Los usuarios de Kahoot extrañan cuando esta
  animación se simplificó: *"los estudiantes reciben un golpe de dopamina cuando el
  marcador anima y suena"*. [oficial, foro]
- **Timer**: número grande en un círculo; en Kahoot, a la izquierda de la pregunta, con el
  contador de respuestas a la derecha. [observado]
- **Botones de respuesta en el celular**: 4 cuadrantes grandes de color que ocupan toda la
  pantalla; al tocar, se hunden (escala 0.95) y el resto se desvanece. [observado]
- **Nube de palabras**: palabras aparecen una por una, tamaño según frecuencia, la más
  votada al final con `PING`. [código]
- **Error**: `shake` horizontal corto. **Acierto**: pop con rebote + check que se dibuja.

---

## 5. Flujo pantalla por pantalla

### 5.1 Proyector (host)

1. **Lobby**
   - Arriba, grande: "Únete en **antidoto.../jugar**" + **PIN** gigante + código QR.
   - Contador de jugadores y botón "Comenzar".
   - Los apodos aparecen como píldoras que "saltan" al entrar (pop + sonido).
   - El host puede tocar un apodo para expulsarlo. Bloquear la entrada muestra
     "La partida está cerrada. Nadie más puede unirse". [código]
   - Música de lobby sonando desde que abre.
2. **"Prepárate" / cuenta regresiva**: 3, 2, 1 con un sample por número y *whoosh* al salir.
3. **Intro de la pregunta**: la pregunta sola, grande, con el tipo arriba ("Quiz",
   "Verdadero o falso", "Encuesta", "Nube de palabras", "Puntos dobles") y una barra de
   carga que da tiempo de leer (~5 s) antes de mostrar las opciones. [código: existe
   `QuestionIntroLoadingBar`; duración observada, no extraída]. Antídoto usa 3 s
   (`QUESTION_INTRO_MS`), con la cuenta 3-2-1 al final.
4. **Pregunta activa**: pregunta arriba, imagen al centro, timer a la izquierda, contador
   "N respuestas" a la derecha, y las 4 opciones abajo en grilla 2x2 con forma + texto.
   Música por duración. Un sonido por cada respuesta que llega.
5. **Tiempo**: gong. Si todos respondieron antes, se corta igual.
6. **Resultados**: gráfico de barras por opción (color + forma + cantidad), tick
   ascendente, reveal de la correcta. Momento fogata: el host comenta.
7. **Marcador**: top 5 con puntaje total, reordenamiento animado, y **un mensaje de
   celebración** cuando corresponde (ver 6.3).
8. **Podio**: coreografía de 4.3 + confeti + botones "Saltar" / "Repetir".

### 5.2 Celular (jugador)

1. **Entrar**: PIN → apodo ("¡Vamos!"). Opcional: generador de apodos (adjetivo +
   sustantivo, 3 giros: "Girar (3)", "¡Último giro!"). [código]
2. **"¡Estás dentro!"** + "¿Ves tu apodo en la pantalla?" (lo manda a mirar arriba).
3. **"¡Prepárate!"** con "Pregunta 2 de 10".
4. **Responder**: 4 botones gigantes solo con forma (o con texto si la pregunta se muestra
   en el celular). Tocar da respuesta háptica.
5. **Esperando**: "Respuesta enviada" con animación de espera y algo de humor
   (Kahoot usaba "¿Fuiste demasiado rápido?").
6. **Resultado personal** (pantalla completa de color):
   - Acierto: fondo verde, "¡Correcto!", badge de **racha** con el número, píldora
     "+950".
   - Error: fondo rojo, "Incorrecto", mensaje de ánimo aleatorio, y si tenía racha,
     "Perdiste la racha".
   - Sin respuesta: "Se acabó el tiempo".
   - Abajo: "Vas en 4º lugar, **120 puntos detrás de {rival}**" o "¡Estás en el podio!".
     El "rival" (*nemesis*) es el jugador justo arriba: convierte el ranking en un duelo
     personal alcanzable. [código]
7. **Final**: medalla si está en el podio, puesto si está en el top 5, solo puntaje si no.
   Titular aleatorio según el puesto (ver 6.4).

---

## 6. Microcopy (textos reales de Kahoot y propuesta en español) [código]

Tono: informal, amistoso, juguetón, inclusivo, curioso. Nunca formal, condescendiente,
infantil ni distante. [oficial]

### 6.1 Resultado de la pregunta

| Kahoot | Propuesta Antídoto |
|---|---|
| Correct | ¡Correcto! |
| Incorrect | Incorrecto |
| Time's up | Se acabó el tiempo |
| Answer Streak | Racha |
| Answer Streak lost | Perdiste la racha |
| {points} points behind {nemesis} | A {points} puntos de {rival} |
| Tied with {nemesis} | Empatado con {rival} |
| You're in {rank} place | Vas en {rank}º lugar |
| You're on the podium! | ¡Estás en el podio! |
| Answer sent | Respuesta enviada |
| You're in! See your nickname on screen? | ¡Estás dentro! ¿Ves tu apodo en la pantalla? |
| Get Ready! / Ready… | ¡Prepárate! / Listos… |
| Starts in | Empieza en |

### 6.2 Ánimo tras un error (rotan al azar)

Greatness awaits! · Great try! · No one said it would be easy 😉 · We believe in you! ·
It's not over just yet! · You can still turn the tables! · We all have bad days ⛈

Propuesta: "¡Buen intento!", "Nadie dijo que sería fácil 😉", "Todavía no termina",
"Aún puedes dar vuelta el marcador", "Creemos en ti", "Todos tenemos días malos ⛈",
"Lo mejor está por venir".

### 6.3 Mensajes de celebración en el marcador del proyector

| Kahoot | Propuesta |
|---|---|
| Up {n} places - {name} is the highest climber! | ¡{nombre} subió {n} puestos! Es quien más escaló |
| {name} just hit Answer Streak {n}! | ¡{nombre} lleva una racha de {n}! |
| {n} in a row! {name} is back in the game! | ¡{n} seguidas! {nombre} volvió al juego |
| {count} participants have reached Answer Streak {n}! | ¡{count} jugadores tienen racha de {n}! |
| Incredible! Everyone hit Answer Streak {n} together! | ¡Increíble! Todos llevan racha de {n} |
| Tough round! {count} participants lost their Answer Streak of {n}! | ¡Ronda difícil! {count} perdieron su racha de {n} |
| Combo breaker! ... | ¡Se cortó el combo! ... |
| Unbelievable! {name} finishes the game with a perfect streak of {n}! | ¡Impresionante! {nombre} terminó con racha perfecta de {n} |

Solo se muestra **uno** por marcador, y no siempre ("ocasionalmente"). Priorizar: el que
más subió (si subió 3 o más), luego rachas grupales, luego racha individual. [oficial]

### 6.4 Titular final según el puesto (varias variantes cada uno, al azar)

- **1º**: Highest score! · First place! · Epic win! · Legendary! · Unbeatable! · Knowledge champ!
- **2º**: Awe-inspiring! · Masterfully played! · Top-notch! · Incredible!
- **3º**: Outstanding! · Kudos! · Well played! · You crushed it! · Luck or pure genius?
- **4º y 5º**: Beautifully played! · Awesome job! · High five! · Rising star!
- **6º a 10º**: The podium is within reach! · Nearly at the podium! · Keep up the momentum!
- **Resto**: Can you top it next time? · Never give up! · Rome wasn't built in a day.

Propuesta: 5 a 8 variantes en español por tramo, en el mismo espíritu ("¡Leyenda!",
"¡Imbatible!", "¡Qué nivel!", "¡Casi en el podio!", "La próxima es tuya", "Roma no se
construyó en un día").

### 6.5 Conexión

"Se perdió la conexión" · "Reconectando…" · "Hay demoras…" · "El anfitrión se desconectó".
Kahoot los muestra como *toast*, sin sacar al jugador de la pantalla.

---

## 7. Accesibilidad (Kahoot lo resuelve así) [oficial] [código]

- Forma + color en cada respuesta (daltonismo).
- Modo alto contraste para proyectores (paleta oscura de 2.1).
- `prefers-reduced-motion` desactiva animaciones decorativas; el confeti también.
- Controles de volumen y silencio separados para música y efectos.
- Etiquetas para lectores de pantalla en resultados: "correcto y seleccionado: {respuesta}".
- Zoom hasta 200% sin romper la interfaz.
- Opción de mostrar pregunta y opciones también en el celular (clave para quien no ve
  bien el proyector).
- Tiempo ilimitado en el modo de solo precisión (sin puntos por velocidad).

---

## 8. Estado de la implementación en Antídoto

Contrastado con el código el 2026-09-22, con todas las fases del módulo terminadas.

**Motor y protocolo** (`src/lib/live-engine.ts`, `src/lib/live-protocol.ts`):

| Necesidad de UX | Estado | Dónde |
|---|---|---|
| Puntaje por velocidad 500 a 1000 | Hecho | `basePoints`, fórmula idéntica a Kahoot |
| Bono de racha +100 por nivel, tope 500 | Hecho | `streakBonus` |
| Racha en el ranking | Hecho | `streak` en `LeaderboardEntry` |
| "+950", puesto y "A X puntos de {rival}" | Hecho | El reveal trae el ranking completo (todos los jugadores); `standingOf` en `live-player-view.ts` |
| "Subió N puestos" | Hecho | `movement` |
| ¿Acerté? | Hecho | `outcomeOf`: `reveal.correct` contra la opción guardada |
| Tiempos fijos por pregunta | Hecho | `TIME_LIMITS`: 5, 10, 20, 30, 60, 90, 120, 240 s |
| Ranking animado (antes y después) | Hecho | `leaderboardMotion` reconstruye el antes con `score - lastPoints` y `rank + movement`, sin datos extra |
| 1000 fijos si responde en menos de 0.5 s | Hecho | `FULL_POINTS_MS` en `basePoints` |
| Mensajes de "racha perdida" | Hecho | `lostStreak` en `LeaderboardEntry`; "¡Ronda difícil!" y "¡Se cortó el combo!" en `live-celebrations.ts` |

**Sonido** (`src/components/live/sound.ts`, sintetizado con Web Audio, solo en el proyector):
lobby a 120 BPM, música de pregunta que se tensa en los últimos 5 s, pops de entrada
escalonados (máximo 6 por foto), tic por respuesta (60 ms), pitidos 3-2-1, gong, tics
ascendentes en las barras, acorde de la correcta (solo quiz y VF), pops ascendentes y
ping en la nube, conteo de puntos y whoosh en el ranking, pasos y fanfarria en el podio.

**Diferencias deliberadas con Kahoot**:
- Podio más corto (~6 s en vez de ~17 s) y el foco de luz se reemplazó por el texto
  "Y el primer lugar es…".
- La música de pregunta es una sola pista sintetizada con capas, no una pista compuesta
  por cada duración.
- La intro de la pregunta dura 3 s en vez de ~5 s (decisión del cliente, 2026-09-22).

**Por verificar con parlantes reales**: los graves del gong y del pulso de la pregunta
(98 a 110 Hz) casi no suenan en parlantes de notebook o proyector. Ya se reforzaron con
parciales altos (el gong suma 220, 331 y 442 Hz; el pulso usa onda triangular más su
octava), pero conviene escucharlo en la sala antes del primer uso.

---

## 9. Checklist de implementación

**Sonido**
- [x] Módulo de audio único para el proyector, desbloqueo en el primer clic, música y
      efectos por separado.
- [x] Control de volumen en el pie de pantalla del host.
- [x] Música de lobby en loop.
- [x] Música de pregunta con tensión creciente hacia el final.
- [x] Pop al entrar cada jugador; tick por cada respuesta (throttle 60 ms).
- [x] Cuenta regresiva 3-2-1; gong de fin.
- [x] Tick de tono ascendente en barras; sonido de reveal según el tipo de pregunta.
- [x] Conteo de puntos y whoosh en el marcador.
- [x] Fanfarria del ganador (sin pista de música de podio).
- [x] Vibración en el celular al responder, acertar y fallar.

**Visual**
- [x] Paleta de respuestas (2.5), con contraste 4.5:1.
- [x] Fondo de juego oscuro de marca con formas geométricas animadas.
- [x] Cal Sans para números y gritos.
- [ ] Modo alto contraste para proyector.

**Movimiento**
- [x] Easing con overshoot (entradas de 350 a 800 ms).
- [x] Barras de resultado animadas; reordenamiento animado del marcador con conteo.
- [x] Coreografía del podio con confeti, "Saltar" y "Repetir".
- [x] Shake en error, pop en acierto.
- [x] Todo respetando `prefers-reduced-motion`.
- [x] Respuesta inmediata al tocar en el celular (se deshace si el servidor la rechaza).
- [x] Empates en el podio: cada columna toma color, altura y número del `rank` real.
- [x] Durante la intro de 3 s solo suenan los pitidos 3-2-1; la música entra con las opciones.

**Copy**
- [x] Textos de resultado, ánimo, celebración y titulares finales con variantes.
- [x] Mensaje "A X puntos de {rival}".

---

## 10. Fuentes

- Bundles públicos de Kahoot, descargados el 2026-09-22: app del jugador
  (`https://kahoot.it/`, `assets-cdn.kahoot.it/controller/v2/`) y app del host
  (`https://play.kahoot.it/v2/`, `assets-cdn.kahoot.it/player/v2/`). De ahí salen los
  colores, sonidos, tiempos, easing y textos marcados como [código].
- [Guía de marca de Kahoot (abril 2019, PDF)](https://kahoot.com/files/2017/08/Kahoot-BrandGuide-July2019.pdf)
- [Kahoot! brand guidelines](https://kahoot.com/library/kahoot-logo/) y
  [Kahoot! illustrations and colors](https://kahoot.com/library/kahoot-illustrations/)
- Wang, A. I. y Lieberoth, A. (2016). [The effect of points and audio on concentration, engagement, enjoyment, learning, motivation, and classroom dynamics using Kahoot!](https://folk.idi.ntnu.no/alfw/publications/ECGBL2016-Effect_of_points_and_audio_in_Kahoot.pdf) ECGBL 2016.
- Wang, A. I. (2015). [The wear out effect of a game-based student response system](https://www.researchgate.net/publication/269407880_The_wear_out_effect_of_a_game-based_student_response_system). Computers & Education.
- [NTNU Impact Case: Kahoot!](https://www.ntnu.edu/documents/139945/1377543114/Impact-Kahoot.pdf/c524a350-8ec6-184c-5b8e-898a2a6f2225?t=1755595438691)
- [Interview with Games Professor Alf Inge Wang (blog de Kahoot)](https://kahoot.com/blog/2016/02/17/meet-krew-interview-games-professor-alf-inge-wang/)
- [The Professor Who Told His Students to Take Out Their Phones](https://teachyourkids.substack.com/p/the-professor-who-told-his-students)
- [Music by Eirik Myhr - Kahoot!](https://eirikmyhr.no/kahoot) y
  [Tempo de la música de lobby (SongBPM)](https://songbpm.com/@kahoot/lobby-music-original-soundtrack)
- Centro de ayuda de Kahoot (leído vía su API pública de Zendesk):
  [How points work](https://support.kahoot.com/hc/en-us/articles/115002303908-How-points-work),
  [Tips for hosting a live game](https://support.kahoot.com/hc/en-us/articles/360039900153-Tips-for-hosting-a-live-game),
  [Live game settings](https://support.kahoot.com/hc/en-us/articles/115016055107-Live-game-settings),
  [How to host a live kahoot](https://support.kahoot.com/hc/en-us/articles/360039422694),
  [Does Kahoot! meet accessibility standards?](https://support.kahoot.com/hc/en-us/articles/115004537447),
  [How to use themes](https://support.kahoot.com/hc/en-us/articles/4433531677715),
  [How to use game characters](https://support.kahoot.com/hc/en-us/articles/10712953904147),
  [How to handle inappropriate nicknames](https://support.kahoot.com/hc/en-us/articles/115002201267),
  [How to use word cloud](https://support.kahoot.com/hc/en-us/articles/26507460634003)
- Foro de la comunidad de Kahoot: [leaderboard animation](https://support.kahoot.com/hc/en-us/community/posts/27419135249299-leaderboard-animation),
  [Podium Celebration](https://support.kahoot.com/hc/en-us/community/posts/40636423376147-Podium-Celebration)
