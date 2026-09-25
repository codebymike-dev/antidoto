"use client";

import { useRef, type CSSProperties, type ReactNode } from "react";
import { SplitText } from "gsap/SplitText";
import { claimEntrance, gsap, useGSAP } from "./gsap";

gsap.registerPlugin(SplitText);

/**
 * Titular que entra palabra por palabra desde detrás de una máscara. `after` son elementos
 * hermanos (bajada, logo) que aparecen justo detrás del titular, dentro del mismo bloque.
 */
export default function MotionHeading({
  children,
  style,
  delay = 0.05,
}: {
  children: ReactNode;
  style?: CSSProperties;
  delay?: number;
}) {
  const ref = useRef<HTMLHeadingElement>(null);

  useGSAP(
    () => {
      const el = ref.current!;
      if (!claimEntrance(el)) return;
      // Se parte después de cargar la fuente: si Cal Sans llega tarde, las palabras ya
      // medidas con la de respaldo quedarían mal cortadas.
      let split: SplitText | null = null;
      gsap.set(el, { opacity: 0 });
      document.fonts.ready.then(() => {
        split = SplitText.create(el, { type: "words", mask: "words" });
        gsap.set(el, { opacity: 1 });
        gsap.from(split.words, {
          yPercent: 115,
          duration: 0.9,
          ease: "expo.out",
          stagger: 0.06,
          delay,
          onComplete: () => split?.revert(),
        });
      });
      return () => split?.revert();
    },
    { scope: ref }
  );

  return (
    <h1 ref={ref} className="motion-pending" style={style}>
      {children}
    </h1>
  );
}
