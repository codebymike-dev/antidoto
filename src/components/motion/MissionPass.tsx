"use client";

import { useCallback, useRef, type CSSProperties, type ReactNode } from "react";
import { claimEntrance, gsap, reducedMotion, useGSAP } from "./gsap";
import Stamp, { type StampTone } from "./Stamp";

/**
 * El "pase de misión": cabecera con holograma, cuerpo, perforación con muescas y talón.
 * Es el formulario de entrada del participante, la credencial del admin y el comprobante de
 * misión cumplida. Todo el marcado es el estado final; el script solo agrega:
 *  - la impresión: el pase sale de una ranura, con el borde inferior primero;
 *  - la inclinación y el holograma que siguen al puntero (solo con mouse);
 *  - el golpe del sello (temblor si es un error).
 * Los elementos del cuerpo con `data-pass-item` entran escalonados tras la impresión.
 */
export default function MissionPass({
  kicker,
  children,
  stub,
  stamp,
  print = true,
  style,
  className = "",
}: {
  kicker: string;
  children: ReactNode;
  stub?: ReactNode;
  stamp?: { label: string | null; tone?: StampTone; playKey: string | number; delay?: number; className?: string };
  print?: boolean;
  style?: CSSProperties;
  className?: string;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const tiltRef = useRef<HTMLDivElement>(null);
  const passRef = useRef<HTMLDivElement>(null);
  const perfRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const wrap = wrapRef.current!;
      const tilt = tiltRef.current!;
      const pass = passRef.current!;

      // Las muescas se recortan con una máscara a la altura exacta de la perforación,
      // que cambia con el ancho (el texto del talón puede ocupar una o dos líneas).
      const perf = perfRef.current;
      const measure = () => {
        if (perf) pass.style.setProperty("--perf-y", `${perf.offsetTop + perf.offsetHeight / 2}px`);
      };
      measure();
      const ro = new ResizeObserver(measure);
      ro.observe(pass);

      const animate = claimEntrance(wrap) && print;
      if (animate) {
        const items = pass.querySelectorAll("[data-pass-item]");
        const slot = wrap.querySelector(".pass-slot");
        const h = pass.offsetHeight;
        // Estados iniciales antes de pintar (useGSAP corre en un layout effect): sin esto
        // se vería un fotograma del pase completo antes de que empiece a imprimirse.
        gsap.set(slot, { opacity: 1 });
        gsap.set(items, { opacity: 0, y: 8 });
        gsap
          .timeline({ defaults: { ease: "power2.out" } })
          // El pase baja mientras el recorte superior se abre al mismo ritmo: lo visible
          // siempre arranca en la ranura, como papel que sale de una impresora.
          .fromTo(tilt, { y: -h }, { y: 0, duration: 1.05 }, 0.1)
          .fromTo(
            pass,
            { clipPath: "inset(100% 0% 0% 0%)" },
            { clipPath: "inset(0% 0% 0% 0%)", duration: 1.05, clearProps: "clipPath" },
            0.1
          )
          .to(slot, { opacity: 0, scaleX: 0.92, duration: 0.35 }, 1.05)
          .to(items, { opacity: 1, y: 0, duration: 0.45, stagger: 0.07, clearProps: "opacity,transform" }, 0.45);
      }

      // Inclinación y holograma: solo con puntero fino y sin movimiento reducido. Mientras
      // alguien escribe en el pase, se queda derecho.
      if (reducedMotion() || !window.matchMedia("(hover: hover) and (pointer: fine)").matches) {
        return () => ro.disconnect();
      }
      const rx = gsap.quickTo(tilt, "rotationX", { duration: 0.6, ease: "power3.out" });
      const ry = gsap.quickTo(tilt, "rotationY", { duration: 0.6, ease: "power3.out" });
      gsap.set(tilt, { transformPerspective: 1000 });
      const onMove = (e: PointerEvent) => {
        const r = pass.getBoundingClientRect();
        const fx = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width));
        const fy = Math.min(1, Math.max(0, (e.clientY - r.top) / r.height));
        pass.style.setProperty("--fx", fx.toFixed(3));
        pass.style.setProperty("--fy", fy.toFixed(3));
        const typing = pass.contains(document.activeElement) && document.activeElement !== document.body;
        rx(typing ? 0 : (0.5 - fy) * 5);
        ry(typing ? 0 : (fx - 0.5) * 5);
      };
      const onLeave = () => {
        rx(0);
        ry(0);
      };
      wrap.addEventListener("pointermove", onMove);
      wrap.addEventListener("pointerleave", onLeave);
      pass.addEventListener("focusin", onLeave);
      return () => {
        ro.disconnect();
        wrap.removeEventListener("pointermove", onMove);
        wrap.removeEventListener("pointerleave", onLeave);
        pass.removeEventListener("focusin", onLeave);
      };
    },
    { scope: wrapRef }
  );

  const onImpact = useCallback((tone: StampTone) => {
    const tilt = tiltRef.current;
    if (!tilt || reducedMotion()) return;
    if (tone === "danger") {
      gsap.fromTo(tilt, { x: 0 }, { keyframes: { x: [-8, 7, -5, 3, 0] }, duration: 0.42, ease: "power1.out" });
    } else {
      gsap.fromTo(tilt, { scale: 0.985 }, { scale: 1, duration: 0.5, ease: "elastic.out(1, 0.45)" });
    }
  }, []);

  return (
    <div ref={wrapRef} className={`pass-wrap motion-pending ${className}`} style={style}>
      <div className="pass-slot" aria-hidden="true" />
      <div ref={tiltRef} className="pass-tilt">
        <div ref={passRef} className="pass">
          <div className="pass-head">
            <span className="pass-kicker">{kicker}</span>
            <span className="pass-holo" aria-hidden="true" />
          </div>
          <div className="pass-body">
            {children}
            {stamp && <Stamp {...stamp} onImpact={onImpact} />}
          </div>
          {stub && (
            <>
              <div ref={perfRef} className="pass-perf" aria-hidden="true" />
              <div className="pass-stub">{stub}</div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
