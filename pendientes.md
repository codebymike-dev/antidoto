# Pendientes

## Legibilidad del pixel art en el celular

Propuesto el 2026-10-05. Sin empezar: falta que Mike confirme el orden y diga qué otros
riesgos le costó ver en el celular, para revisar todas las escenas de una vez.

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

1. **Lupa en el celular (no cambia el arte).** Pellizcar o tocar dos veces hace zoom a
   2x o 3x, con los píxeles nítidos y la posibilidad de moverse con el dedo. El toque
   para marcar un riesgo sigue funcionando con zoom. Sirve para todas las escenas,
   incluidas las futuras.
2. **Viñeta de acercamiento en la pregunta (no cambia el arte).** Al tocar una zona, la
   ventana de las 3 opciones muestra arriba un recorte ampliado de lo tocado, para
   confirmar qué es antes de responder. También sirve en el repaso final.
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
