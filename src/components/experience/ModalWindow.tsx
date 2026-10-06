"use client";

import { useEffect, useRef, useState, type HTMLAttributes } from "react";

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Ventana modal del jugador (pregunta, resultado, zonas, cierre...). Es la misma <section>
 * de siempre con lo que le faltaba para teclado y lectores de pantalla: aria-modal, el Tab
 * no se escapa a la escena ni a la barra de atrás, y al cerrarse el foco vuelve a donde
 * estaba. El foco inicial lo sigue poniendo el autoFocus de cada ventana.
 */
export default function ModalWindow({ role = "dialog", children, ...props }: HTMLAttributes<HTMLElement> & { role?: "dialog" | "alertdialog" }) {
  const ref = useRef<HTMLElement>(null);
  // Se lee al primer render: para cuando corre el efecto, el autoFocus ya movió el foco
  // a la ventana y no se sabría de dónde venía.
  const [opener] = useState(() =>
    typeof document !== "undefined" && document.activeElement instanceof HTMLElement ? document.activeElement : null
  );

  useEffect(() => {
    const node = ref.current;
    // Sin autoFocus en la ventana, el foco entra igual: si no, el Tab seguiría atrás.
    if (node && !node.contains(document.activeElement)) node.querySelector<HTMLElement>(FOCUSABLE)?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Tab" || !node) return;
      const items = Array.from(node.querySelectorAll<HTMLElement>(FOCUSABLE));
      if (items.length === 0) return;
      const first = items[0];
      const last = items[items.length - 1];
      const inside = node.contains(document.activeElement);
      if (e.shiftKey && (document.activeElement === first || !inside)) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && (document.activeElement === last || !inside)) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      // Si lo que abrió la ventana sigue en pantalla, el foco vuelve ahí. Un cuadro después y
      // solo si quedó perdido: cuando una ventana da paso a otra (la pregunta al resultado),
      // la nueva ya tomó el foco con su autoFocus y no se le quita.
      requestAnimationFrame(() => {
        const lost = !document.activeElement || document.activeElement === document.body;
        if (!lost) return;
        // Si ya no existe (la opción elegida se fue con la pregunta), al respaldo de la barra.
        const target =
          opener?.isConnected && opener !== document.body
            ? opener
            : document.querySelector<HTMLElement>("[data-modal-fallback]:not([disabled])");
        target?.focus({ preventScroll: true });
      });
    };
  }, [opener]);

  return (
    <section ref={ref} role={role} aria-modal="true" {...props}>
      {children}
    </section>
  );
}
