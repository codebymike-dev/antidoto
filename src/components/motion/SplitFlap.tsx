"use client";

import { useRef } from "react";
import { changedCells, padCells } from "@/lib/split-flap";
import FlapText from "./FlapText";
import { firstVisitThisSession, flapTimeline, reducedMotion, useGSAP, watchVisibility } from "./gsap";

/**
 * `FlapText` que gira solo: la primera vez que entra en pantalla (si `intro`) y cada vez
 * que cambia `text`, en ese caso únicamente las celdas distintas. `length` fija el ancho
 * para que una columna de tablero no baile al cambiar de valor.
 */
export default function SplitFlap({
  text,
  length,
  tone = "light",
  intro = true,
  introKey,
  delay = 0,
  className,
}: {
  text: string;
  length?: number;
  tone?: "light" | "dark";
  intro?: boolean;
  /** Si se da, el giro de entrada solo ocurre en la primera visita de la sesión. */
  introKey?: string;
  delay?: number;
  className?: string;
}) {
  const shown = length ? padCells(text, length) : text;
  const ref = useRef<HTMLSpanElement>(null);
  const previous = useRef<string | null>(null);

  useGSAP(
    () => {
      const el = ref.current!.firstElementChild!;
      const before = previous.current;
      previous.current = shown;
      if (reducedMotion()) return;

      if (before === null) {
        if (!intro || (introKey && !firstVisitThisSession(introKey))) return;
        let tl: gsap.core.Timeline | null = null;
        const stop = watchVisibility(el, (visible) => {
          if (!visible || tl) return;
          tl = flapTimeline(el).delay(delay);
          stop();
        });
        return () => {
          stop();
          // Desmontado antes de girar (el doble montaje del modo estricto): el próximo
          // montaje tiene que tratarse otra vez como entrada, no como actualización.
          if (!tl) previous.current = null;
        };
      }
      const only = changedCells(before, shown);
      if (only.length) flapTimeline(el, { only, salt: Date.now() % 997 });
    },
    { dependencies: [shown], scope: ref }
  );

  return (
    <span ref={ref} style={{ display: "contents" }}>
      <FlapText text={shown} tone={tone} className={className} />
    </span>
  );
}
