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
