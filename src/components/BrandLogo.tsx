import type { CSSProperties } from "react";
import { brandPalette, initials, INK, readableText, type PublicBrand } from "@/lib/brand-palette";
import { LOGO_SRC } from "@/lib/theme";

type Surface = "claro" | "oscuro";
type BrandLike = Pick<PublicBrand, "name" | "primary" | "secondary" | "logoUrl" | "logoSurface">;

interface Props {
  brand: BrandLike;
  /** Fondo sobre el que se pinta. */
  surface: Surface;
  height: number;
  /** Sin logo: mostrar el nombre junto al monograma. */
  showName?: boolean;
  style?: CSSProperties;
}

/**
 * Logo de la empresa. Si está pensado para el fondo contrario (un logo blanco en una
 * pantalla clara, uno oscuro en el proyector) va sobre una placa del fondo correcto en
 * lugar de desaparecer. Sin logo, un monograma con las iniciales en el color de marca.
 */
export default function BrandLogo({ brand, surface, height, showName = true, style }: Props) {
  if (brand.logoUrl) {
    const needsPlate = brand.logoSurface !== surface;
    const pad = Math.round(height * 0.22);
    return (
      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          flexShrink: 0,
          ...(needsPlate && {
            padding: `${pad}px ${Math.round(pad * 1.4)}px`,
            borderRadius: Math.round(height * 0.28),
            background: brand.logoSurface === "claro" ? "#FFFFFF" : INK,
            boxShadow: surface === "oscuro" ? "0 6px 18px rgba(0,0,0,0.25)" : "0 6px 16px rgba(15,24,29,0.12)",
          }),
          ...style,
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={brand.logoUrl}
          alt={brand.name}
          style={{ display: "block", height: needsPlate ? height - pad * 2 : height, width: "auto", maxWidth: height * 5 }}
        />
      </span>
    );
  }

  const bg = brandPalette(brand).button;
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: Math.round(height * 0.3), minWidth: 0, ...style }}>
      <span
        aria-hidden={showName}
        style={{
          width: height,
          height,
          borderRadius: Math.round(height * 0.28),
          background: bg,
          color: readableText(bg),
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "'Cal Sans', sans-serif",
          fontSize: Math.round(height * 0.42),
          letterSpacing: 0.5,
          flexShrink: 0,
        }}
        {...(!showName && { role: "img", "aria-label": brand.name })}
      >
        {initials(brand.name)}
      </span>
      {showName && (
        <span
          style={{
            fontFamily: "'Cal Sans', sans-serif",
            fontSize: Math.max(13, Math.round(height * 0.46)),
            color: surface === "oscuro" ? "#FFFFFF" : INK,
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {brand.name}
        </span>
      )}
    </span>
  );
}

/** Firma de co-branding: "con [antídoto]", discreta, junto al logo de la empresa. */
export function WithAntidoto({ surface, size = 18 }: { surface: Surface; size?: number }) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        fontSize: Math.round(size * 0.62),
        fontWeight: 600,
        letterSpacing: 0.3,
        color: surface === "oscuro" ? "#9FB8C2" : "#5C7680",
        whiteSpace: "nowrap",
      }}
    >
      con
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={LOGO_SRC} alt="Antídoto" style={{ height: size, width: "auto", display: "block" }} />
    </span>
  );
}

/** Logo de la empresa + divisor + "con antídoto". El bloque de marca de las pantallas públicas. */
export function CoBrand({ brand, surface, height }: { brand: BrandLike; surface: Surface; height: number }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: Math.round(height * 0.35), minWidth: 0 }}>
      <BrandLogo brand={brand} surface={surface} height={height} />
      <span
        aria-hidden
        style={{ width: 1, alignSelf: "stretch", margin: "4px 0", background: surface === "oscuro" ? "rgba(255,255,255,0.18)" : "rgba(15,24,29,0.12)" }}
      />
      <WithAntidoto surface={surface} size={Math.max(14, Math.round(height * 0.42))} />
    </span>
  );
}
