"use client";

// Punto único de entrada a GSAP para el lenguaje "pase de misión". Solo se registra lo que
// se usa; SplitText lo registra el titular que lo necesita para no cargarlo en el portal.
import { gsap } from "gsap";
import { useGSAP } from "@gsap/react";
import { flapPlan, seedFrom } from "@/lib/split-flap";

gsap.registerPlugin(useGSAP);

export { gsap, useGSAP };

export function reducedMotion(): boolean {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/**
 * Los elementos con `.motion-pending` nacen ocultos y un failsafe de CSS los muestra a los
 * 1,2 s si el script nunca llega (ver motion.css). Esta función le quita la clase y dice si
 * todavía vale la pena animar la entrada: si el elemento lleva visible (o casi) más de
 * 700 ms, porque la hidratación llegó tarde en una red lenta, se deja quieto.
 * Con movimiento reducido el failsafe no existe y siempre devuelve false.
 */
export function claimEntrance(el: Element | null): boolean {
  if (!el) return false;
  // La decisión se guarda en el elemento: el modo estricto de React monta dos veces y en el
  // segundo montaje el failsafe ya no existe.
  const cached = (el as HTMLElement).dataset.entrance;
  if (cached) return cached === "1";
  const failsafe = el
    .getAnimations()
    .find((a) => (a as CSSAnimation).animationName === "motion-failsafe");
  el.classList.remove("motion-pending");
  const animate = !!failsafe && !reducedMotion() && Number(failsafe.currentTime ?? 0) < 700;
  (el as HTMLElement).dataset.entrance = animate ? "1" : "0";
  return animate;
}

/**
 * ¿Es la primera vez en esta sesión del navegador que se ve esta pantalla? Guarda la hora
 * de la primera visita y responde que sí durante 1,5 s: así todos los componentes de la
 * misma carga (y el doble montaje del modo estricto) coinciden, y las visitas siguientes
 * reciben una entrada corta. Sin sessionStorage (modo privado estricto) siempre es la primera.
 */
export function firstVisitThisSession(key: string): boolean {
  try {
    const now = Date.now();
    const seen = Number(sessionStorage.getItem(key));
    if (!seen) {
      sessionStorage.setItem(key, String(now));
      return true;
    }
    return now - seen < 1500;
  } catch {
    return true;
  }
}

/** Llama a `onChange(true|false)` cuando el elemento entra o sale de la pantalla. */
export function watchVisibility(el: Element, onChange: (visible: boolean) => void): () => void {
  const io = new IntersectionObserver(([entry]) => onChange(entry.isIntersecting), { threshold: 0.05 });
  io.observe(el);
  return () => io.disconnect();
}

/**
 * Hace girar las celdas de un `FlapText`. Nunca toca los nodos de texto que maneja React:
 * escribe el carácter de paso en `data-show` y el CSS lo muestra encima mientras dura el giro.
 * `only` limita el giro a algunas posiciones (al actualizar un tablero).
 */
export function flapTimeline(
  root: Element,
  { only, salt = 0, frame = 0.055 }: { only?: number[]; salt?: number; frame?: number } = {}
): gsap.core.Timeline {
  const text = (root as HTMLElement).dataset.flap ?? "";
  const cells = Array.from(root.querySelectorAll<HTMLElement>(".flap-cell"));
  const plan = flapPlan(text, { seed: seedFrom(text) + salt });
  const tl = gsap.timeline();
  const indices = only ?? plan.map((_, i) => i);
  indices.forEach((i, order) => {
    const cell = cells[i];
    const step = plan[i];
    if (!cell || !step || step.frames.length === 0) return;
    const sub = gsap.timeline();
    sub.call(() => cell.setAttribute("data-flipping", ""));
    for (const ch of step.frames) {
      sub.call(() => cell.setAttribute("data-show", ch));
      sub.fromTo(cell, { rotationX: -75 }, { rotationX: 0, duration: frame, ease: "none" });
    }
    // El último giro ya muestra el carácter real y rebota un poco al asentarse.
    sub.call(() => cell.setAttribute("data-show", step.final));
    sub.fromTo(cell, { rotationX: -60 }, { rotationX: 0, duration: frame * 1.6, ease: "back.out(3)" });
    sub.call(() => cell.removeAttribute("data-flipping"));
    // Con `only`, el escalonado sigue el orden de las celdas que cambian, no su posición.
    tl.add(sub, only ? order * 0.035 : step.delay);
  });
  return tl;
}
