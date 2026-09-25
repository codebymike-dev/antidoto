"use client";

import { useRef } from "react";
import { gsap, reducedMotion, useGSAP } from "./gsap";

export type StampTone = "ink" | "danger" | "brand";

/**
 * Sello de goma sobre el pase. Cae cada vez que cambia `playKey` (un envío, un error nuevo)
 * y, al tocar el papel, llama a `onImpact` para que el pase acuse el golpe.
 * Sin `label` no se pinta. Decorativo: el estado real lo anuncia el formulario.
 */
export default function Stamp({
  label,
  tone = "ink",
  playKey,
  onImpact,
  delay = 0,
  className = "",
}: {
  label: string | null;
  tone?: StampTone;
  playKey: string | number;
  onImpact?: (tone: StampTone) => void;
  /** Segundos antes de caer (p. ej. esperar a que el pase termine de imprimirse). */
  delay?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      if (!label || !ref.current) return;
      if (reducedMotion()) {
        onImpact?.(tone);
        return;
      }
      gsap.fromTo(
        ref.current,
        { scale: 1.9, rotation: -20, opacity: 0 },
        {
          scale: 1,
          rotation: -9,
          opacity: 1,
          duration: 0.26,
          delay,
          ease: "power4.in",
          onComplete: () => onImpact?.(tone),
        }
      );
    },
    { dependencies: [playKey, label] }
  );

  if (!label) return null;
  return (
    <>
      {/* Bordes de tinta irregulares: el sello no debe verse como un rectángulo vectorial. */}
      <svg width="0" height="0" style={{ position: "absolute" }} aria-hidden="true">
        <filter id="stamp-ink">
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="7" />
          <feDisplacementMap in="SourceGraphic" scale="2.2" />
        </filter>
      </svg>
      <div ref={ref} className={`stamp stamp--${tone} ${className}`} aria-hidden="true">
        <span>{label}</span>
      </div>
    </>
  );
}
