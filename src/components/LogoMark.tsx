import { LOGO_SRC } from "@/lib/theme";

// El SVG de marca trae un lienzo de 3840x2160 con el glifo real ocupando
// solo un recuadro interno (medido con `convert -trim`): mucho aire arriba
// y abajo que hace que cualquier `height` en el <img> se vea diminuto.
// Recortamos ese recuadro con background-position/-size para que `height`
// refleje el tamaño visual real del logo.
const GLYPH = { x: 678, y: 791, w: 2534, h: 520 };
const CANVAS = { w: 3840, h: 2160 };

export default function LogoMark({ height }: { height: number }) {
  const scale = height / GLYPH.h;
  return (
    <div
      role="img"
      aria-label="Antídoto"
      style={{
        height,
        width: GLYPH.w * scale,
        backgroundImage: `url(${LOGO_SRC})`,
        backgroundRepeat: "no-repeat",
        backgroundSize: `${CANVAS.w * scale}px ${CANVAS.h * scale}px`,
        backgroundPosition: `${-GLYPH.x * scale}px ${-GLYPH.y * scale}px`,
      }}
    />
  );
}
