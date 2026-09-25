"use client";

import { useRef, type ReactNode } from "react";
import { gsap, reducedMotion, useGSAP } from "./gsap";

/**
 * Menú con una píldora que se desliza hasta el enlace activo (`.btn-navlink-active`) en vez
 * de encenderse de golpe. El layout del portal persiste entre páginas, así que la píldora
 * viaja de un ítem al otro. Sin JS, cada enlace activo pinta su propio fondo (inline).
 */
export default function NavPill({ activeKey, children }: { activeKey: string; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const pillRef = useRef<HTMLDivElement>(null);
  const placed = useRef(false);

  useGSAP(
    () => {
      const menu = ref.current!;
      const pill = pillRef.current!;
      const place = (animate: boolean) => {
        const active = menu.querySelector<HTMLElement>(".btn-navlink-active");
        if (!active) {
          menu.classList.remove("nav-pill-ready");
          return;
        }
        const to = { y: active.offsetTop, height: active.offsetHeight };
        if (animate && placed.current && !reducedMotion()) {
          gsap.to(pill, { ...to, duration: 0.45, ease: "power3.out" });
        } else {
          gsap.set(pill, to);
        }
        placed.current = true;
        menu.classList.add("nav-pill-ready");
      };
      place(true);
      const ro = new ResizeObserver(() => place(false));
      ro.observe(menu);
      return () => ro.disconnect();
    },
    { dependencies: [activeKey], scope: ref }
  );

  return (
    <div ref={ref} style={{ position: "relative", display: "flex", flexDirection: "column", gap: 6 }}>
      <div ref={pillRef} className="nav-pill" aria-hidden="true" />
      {children}
    </div>
  );
}
