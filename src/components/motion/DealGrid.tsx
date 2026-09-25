"use client";

import { useRef, type ReactNode } from "react";
import { claimEntrance, firstVisitThisSession, flapTimeline, gsap, reducedMotion, useGSAP } from "./gsap";

/**
 * Rejilla de tickets para las páginas del portal (que son de servidor). Anima a sus hijos:
 *  - primera visita de la sesión (`storageKey`): se reparten como cartas, las barras
 *    `[data-bar]` se llenan hasta su valor real y los `.flap` de dentro giran;
 *  - visitas siguientes: un fundido corto, para no cansar a quien vuelve veinte veces al día.
 * Además escribe --lx/--ly en el `.ticket` bajo el puntero para la luz que lo sigue.
 * El HTML del servidor ya es el estado final: sin JS se ve todo completo.
 */
export default function DealGrid({
  children,
  storageKey,
  className = "ticket-grid",
  style,
}: {
  children: ReactNode;
  storageKey: string;
  className?: string;
  style?: React.CSSProperties;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const grid = ref.current!;
      const cards = Array.from(grid.children) as HTMLElement[];

      if (claimEntrance(grid) && cards.length) {
        if (firstVisitThisSession(storageKey)) {
          // El ancho final ya viene inline del servidor; se parte de 0 y se vuelve a él.
          // Sin clearProps: borraría también el ancho que puso React.
          gsap.set(grid.querySelectorAll("[data-bar]"), { width: 0 });
          const tl = gsap.timeline();
          tl.from(cards, {
            y: 34,
            opacity: 0,
            rotation: (i) => (i % 2 ? 1.6 : -1.6),
            duration: 0.7,
            ease: "power3.out",
            stagger: 0.07,
            clearProps: "transform,opacity",
          });
          cards.forEach((card, i) => {
            const at = 0.25 + i * 0.07;
            card.querySelectorAll("[data-bar]").forEach((bar) => {
              tl.to(bar, { width: (bar as HTMLElement).dataset.bar + "%", duration: 1.1, ease: "power2.out" }, at);
            });
            card.querySelectorAll(".flap").forEach((flap) => tl.add(flapTimeline(flap), at + 0.1));
          });
        } else {
          gsap.from(cards, { opacity: 0, duration: 0.3, ease: "power1.out", clearProps: "opacity" });
        }
      }

      if (reducedMotion() || !window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;
      const onMove = (e: PointerEvent) => {
        const ticket = (e.target as Element).closest<HTMLElement>(".ticket");
        if (!ticket) return;
        const r = ticket.getBoundingClientRect();
        ticket.style.setProperty("--lx", `${e.clientX - r.left}px`);
        ticket.style.setProperty("--ly", `${e.clientY - r.top}px`);
      };
      grid.addEventListener("pointermove", onMove);
      return () => grid.removeEventListener("pointermove", onMove);
    },
    { scope: ref }
  );

  return (
    <div ref={ref} className={`${className} motion-pending`} style={style}>
      {children}
    </div>
  );
}
