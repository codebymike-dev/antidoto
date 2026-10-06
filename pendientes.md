# Pendientes

## Legibilidad del pixel art en el celular

Propuesto el 2026-10-05. Capas 1 y 2 hechas el 2026-10-06 (RF-918, AN-44), probadas en
Chromium con celular emulado. Falta: probarlas en celulares reales y decidir si la capa 3
hace falta; para eso, que Mike diga qué riesgos siguen costando con la lupa.

### El problema

El estilo pixel art no es el problema. Algunos riesgos dependen de detalles de 2 a 4 px
y en el celular se pierden: el participante falla porque no ve el objeto, no porque no
conozca el riesgo.

Causa técnica: la escena se dibuja a 400×250 px. En un celular de pie mide ~360 px de
ancho, o sea que se ve a 0,9x, más pequeña que su tamaño original. Por debajo de 1,5x
`SceneCanvas` suaviza la imagen (`imageRendering: auto`) y eso empasta lo fino.

Casos vistos:

- **Tienda:** el cuchillo en el lavaplatos (riesgo `cuchillo`) es una rayita negra de
  ~3 px sobre el agua. Ni en grande se lee como cuchillo.
- **Transporte:**
  - `celular`: un punto azul pegado a la cara de Ramiro.
  - `cinturon`: el riesgo es una ausencia, casi imposible de dibujar.
  - `llanta`: la llanta lisa se ve igual a las demás.
  - Se leen bien: `fatiga` (las Zzz) y `pasajero` (Toño encima de la carga).

### Propuesta, en 3 capas de menos a más invasiva

1. **(Hecho) Lupa en el celular (no cambia el arte).** Pellizcar o tocar dos veces hace zoom a
   2x o 3x, con los píxeles nítidos y la posibilidad de moverse con el dedo. El toque
   para marcar un riesgo sigue funcionando con zoom. Sirve para todas las escenas,
   incluidas las futuras.
2. **(Hecho) Viñeta de acercamiento en la pregunta (no cambia el arte).** Al tocar una zona, la
   ventana de las 3 opciones muestra arriba un recorte ampliado de lo tocado, para
   confirmar qué es antes de responder. También sirve en el repaso final.
   Quedó en la pregunta y en la ventana del resultado mientras se juega; el repaso de
   `/mision/completada` no tiene escena, así que ahí no aplica.
   Del toque doble se desistió: choca con el toque que marca riesgos. En su lugar están
   los botones de lupa en la esquina de la escena.
3. **Retoque puntual solo en lo que falle.** Exagerar el tamaño de los objetos clave,
   como hace Habbo, sin cambiar la paleta ni el estilo:
   - **Cuchillo:** asoman el mango y la punta de la hoja fuera de la espuma, con brillo
     metálico.
   - **Celular:** más grande, con la pantalla iluminada y pegado a la oreja.
   - **Cinturón:** la correa colgando suelta al lado del asiento.
   - **Llanta:** aplanada abajo y sin labrado, junto a la trasera con el labrado bien
     marcado.

   Cada retoque se muestra por separado, con el antes y el después a tamaño de celular
   (`node scripts/escena-png.mts <carpeta> 1 --escena=<escena>`), antes de seguir.

**Recomendación:** empezar por la 1 y la 2, que no tocan el diseño, y aplicar la 3 solo
donde la lupa no alcance.

## Usabilidad

Auditoría del 2026-10-06 sobre el flujo del participante, el portal admin y el módulo en vivo
(este último comparado con `docs/investigacion-ux-kahoot.md`). Las rutas con línea son de esa
fecha y pueden haberse movido.

### Hecho el 2026-10-06

1. **Retomar el avance.** La portada redirige a `/mision` si hay una participación válida. Se pide
   nombre y apellido, y quien vuelve con el mismo nombre y código retoma su participación (la
   comparación ignora mayúsculas, tildes en mayúscula y espacios de más). Riesgos aceptados:
   quien sepa el nombre completo de un compañero y el código entra a su participación, y los
   registros viejos con un solo nombre no se reconocen al volver. Falta probar el reingreso
   desde otro dispositivo de punta a punta.
2. **Salidas con confirmación.** `src/components/LeaveConfirm.tsx` (`<dialog>` nativo) en
   `/mision` y `/mision/completada`, y doble toque en el "Salir" del lobby en vivo (sin probar en
   navegador). La misión común ya no se da por completada con un 8.0 inventado: explica que ya
   no está disponible. Se borraron `completeMission` y `GAME_MODE`.

### Siguiente, en este orden

3. **Ciclo de vida de la partida en vivo.**
   - Cerrar las preguntas en el servidor aunque no haya proyector: hoy solo las cierra el tick
     de `HostScreen.tsx` o que respondan todos (`live-match.ts`). Si el host cierra la pestaña,
     los celulares se quedan en "Se acabó el tiempo".
   - Camino de vuelta para el host: botón "Volver a la pantalla en vivo" en el historial y en el
     reporte (el único enlace a `/admin/vivo/{id}` es el redirect al crearla) y aviso
     `beforeunload` en `HostScreen`.
   - Jugadores fantasma: `/api/live/leave` solo borra la cookie, así que el jugador sigue activo,
     "respondieron todos" nunca se cumple y el "N de M" no se completa. Además no puede volver con
     el mismo apodo. Marcar la salida en la base y, si se puede, detectar presencia con Ably.
   - Expulsar durante el juego, no solo en el lobby (la API `/kick` ya existe).
   - Aviso "El anfitrión se desconectó" en los celulares (guía Kahoot 6.5).
4. **Compartir los códigos de actividad.** Hoy solo se muestra el código en texto
   (`empresas/[id]/page.tsx`). Falta enlace con el código ya puesto (la portada tendría que leer
   un parámetro), QR y "copiar mensaje para enviar", como ya tienen los juegos en vivo
   (`ChallengeShare.tsx`).
5. **Carga y avisos en el portal.** No hay ningún `loading.tsx` ni `error.tsx` en `src/app/admin`
   y todo es `force-dynamic`, así que la pantalla se congela al navegar. Faltan avisos tras
   pausar o reanudar códigos, cambiar la fecha de cierre, quitar o restaurar códigos, archivar o
   restaurar empresas y juegos, y guardar los textos legales.

### Portal admin

- "Archivar juego" no pide confirmación (`juegos/page.tsx`); el resto de archivados sí.
- `ConfirmDeleteButton` vuelve solo al estado normal a los 3 s, sin "Cancelar" ni `aria-live`.
- El menú lateral mide 250 px fijos, sin hamburguesa ni breakpoint: en el celular no se usa bien.
- Login sin "¿Olvidaste tu contraseña?" ni aviso de a quién pedirla. La contraseña generada no
  obliga a cambiarse en el primer ingreso.
- Onboarding del admin de empresa: el paso 1 dice "Antídoto le asigna" sin contacto ni botón
  para pedirlo. No hay "primeros pasos" (cambiar la contraseña, subir el logo).
- Sin búsqueda en empresas; participantes sin búsqueda ni paginación; la auditoría se corta en
  50 entradas sin "ver más".
- Sin breadcrumbs en los niveles profundos (empresa > actividad > reporte). Al menú le falta
  `aria-current="page"`, y al portal un `<main>` y el enlace "saltar al contenido".
- El "PDF" del reporte es `window.print()`: depende de elegir "Guardar como PDF".

### Participante

- La carga de la escena no muestra texto ni spinner ni `aria-busy`, y `/mision` no tiene
  `loading.tsx` ni `error.tsx` propios.
- Las animaciones del canvas (intro, `playIntro`, `playGoodPractice`) ignoran
  `prefers-reduced-motion`; el CSS sí lo respeta.
- Las ventanas del jugador de escenas usan `role="dialog"` pero no atrapan el foco ni tienen
  `aria-modal`, y la de la pregunta no oscurece el fondo. Se podría reusar el enfoque de
  `LeaveConfirm`.
- El cursor `zoom-in` sobre la escena engaña: hacer clic marca un riesgo (`SceneCanvas.tsx`).
- El checkbox de la política es nativo y diminuto en la landing, y un código mal escrito solo da
  "Código no encontrado".
- `ChallengeGame.tsx` (`/jugar`) no muestra "Reconectando…".
- `src/app/error.tsx` enlaza a `/`; si el error viene de `/mision` y hay cookie, la portada
  redirige otra vez a `/mision`.

### Módulo en vivo (pulido)

- El celular muestra la medalla antes de que el proyector termine el suspenso del podio.
- El error del jugador no se borra al pasar de pantalla (`setError(null)` solo corre al
  responder).
- Sin Wake Lock: el celular puede bloquear la pantalla en el lobby o en el ranking.
- El aviso de conexión no cubre el estado `failed` ni "Hay demoras…".
- Apodos sin generador ni filtro de groserías; un duplicado se rechaza sin sugerir otro.
- Accesibilidad: el resultado personal no tiene `aria-live`, el celular no dice cuál era la
  correcta y falta el modo alto contraste.
- De la guía también quedan: modo sin tiempo y rotación de música del lobby.

## Seguridad: vulnerabilidad crítica en Next

Detectado el 2026-10-06 con `npm audit`. Sin resolver: falta que Mike autorice la actualización,
porque afecta a toda la app.

- **Qué:** ejecución remota de código en `next/og` ImageResponse
  ([GHSA-vcvr-r3jv-pc5j](https://github.com/advisories/GHSA-vcvr-r3jv-pc5j)). Afecta de 16.2.0
  a 16.3.5; el proyecto usa 16.3.5.
- **Dónde lo usa el proyecto:** `src/app/opengraph-image.tsx`, `src/app/icon.tsx`,
  `src/app/apple-icon.tsx` y las rutas `src/app/pwa-icon-*`.
- **Arreglo:** actualizar `next` y `eslint-config-next` a 16.3.8 (16.3.6 es el mínimo), correr
  tests, lint y build, y revisar las imágenes OG y los íconos.
- El mismo audit marca altas en dependencias de desarrollo (`braces`, `micromatch`,
  `fast-glob` vía `eslint-config-next`) y en `sharp`, `http-cache-semantics` y
  `source-map-js`. Revisarlas con la actualización de Next.

## Bricks Serious Play (juego de ladrillos 3D)

Investigación en `docs/investigacion-construccion-3d.md`, plan en `docs/plan-construccion-3d.md`.
Fase 1 (banco de pruebas de render en `/admin/escena/ladrillos`) hecha en local el 2026-10-06.

### Para cerrar la fase 1

1. **Medir en celulares reales.** Solo se verificó en Chromium sin tarjeta gráfica, donde los FPS
   no valen. En cada teléfono: abrir la página, tocar "Orbitar (medir FPS)" unos 10 s y luego
   "Copiar reporte", con 1.500 ladrillos en nivel medio.
   - Equipos: un Android de gama media (Redmi Note o Galaxy A5x), un iPhone 11 o 12 y, si se
     consigue, un Galaxy A0x como piso.
   - Criterio de paso: 50 FPS o más orbitando, 40 draw calls o menos, primera imagen en menos
     de 3 s en 4G.
   - Falta decidir cómo abrirla desde el celular: red local con `next dev`
     (`http://<IP-del-PC>:3000/admin/escena/ladrillos`, cifras algo peores que en producción)
     o un preview en Vercel (cifras reales, pero es un despliegue: necesita autorización).
2. **Bajar el nivel alto.** Con 1.500 ladrillos ya da 969.000 triángulos y el presupuesto es de
   1 millón con 3.000. La palanca son los studs lejanos (menos segmentos o normal map de studs
   según la distancia). Medio con 3.000 también da 795.000.
3. **Actualizar `/admin/docs`** (RF/RNF/kanban) al cerrar la fase.

### Decisiones abiertas

- **Bisagras por pasos.** Propuesta: subensamblajes con su propia grilla unidos por una bisagra
  que gira por pasos fijos (15° o 22,5°), nunca libre. Falta que Mike diga si entra como fase
  propia del plan. Si entra, el modelo de datos de la fase 2 debe prepararse desde el inicio.
- **Nombre.** BRICKS SERIOUS PLAY elegido; "Serious Play" es parte de la marca registrada
  LEGO SERIOUS PLAY. Revisión con abogado antes del lanzamiento público (fase 8).
- **Retos de fábrica** del catálogo inicial y si alguno es para un cliente concreto.
- **Votación:** si el anfitrión puede saltarla en eventos cortos.

### Notas para retomar

- Sin React Three Fiber: el lint del React Compiler prohíbe mutar objetos de three desde hooks.
  El motor es three puro en `src/components/bricks/lab/engine.ts`.
- Capturas: `.claude-tmp/lab/shot.mjs` (guarda la sesión en `auth.json`). El login del admin
  permite 5 intentos por usuario cada 15 min y cada intento bloqueado reinicia la ventana.
- Build local sin tocar la base de producción: `set -a; . ./.env.local; set +a; npx next build`.
