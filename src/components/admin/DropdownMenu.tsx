"use client";

import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";

/**
 * Menú desplegable sobre <details>: funciona sin JS y, con JS, se cierra al hacer
 * clic fuera o con Escape, y abre hacia arriba si abajo no cabe (el último código de
 * la página). `label` es el contenido del botón; `children` el panel.
 */
export default function DropdownMenu({
  label,
  children,
  summaryClassName,
  summaryStyle,
  width = 260,
}: {
  label: ReactNode;
  children: ReactNode;
  summaryClassName?: string;
  summaryStyle?: CSSProperties;
  width?: number;
}) {
  const ref = useRef<HTMLDetailsElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [up, setUp] = useState(false);

  function onToggle() {
    const el = ref.current;
    const panel = panelRef.current;
    if (!el?.open || !panel) return;
    const rect = el.getBoundingClientRect();
    const needed = panel.offsetHeight + 12;
    setUp(window.innerHeight - rect.bottom < needed && rect.top > needed);
  }

  useEffect(() => {
    function onPointer(e: PointerEvent) {
      const el = ref.current;
      if (el?.open && !el.contains(e.target as Node)) el.open = false;
    }
    function onKey(e: KeyboardEvent) {
      const el = ref.current;
      if (e.key === "Escape" && el?.open) {
        el.open = false;
        el.querySelector("summary")?.focus();
      }
    }
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  return (
    <details ref={ref} className="report-menu" style={{ position: "relative" }} onToggle={onToggle}>
      <summary className={summaryClassName} style={{ listStyle: "none", cursor: "pointer", ...summaryStyle }}>
        {label}
      </summary>
      <div
        ref={panelRef}
        style={{
          position: "absolute",
          right: 0,
          ...(up ? { bottom: "calc(100% + 6px)" } : { top: "calc(100% + 6px)" }),
          zIndex: 20,
          width,
          maxWidth: "calc(100vw - 32px)",
          background: "#fff",
          borderRadius: 12,
          padding: 6,
          boxShadow: "0 16px 40px rgba(15,24,29,0.16)",
        }}
      >
        {children}
      </div>
    </details>
  );
}
