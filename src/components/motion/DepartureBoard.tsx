"use client";

import { useEffect, useRef, useState } from "react";
import SplitFlap from "./SplitFlap";
import { claimEntrance, reducedMotion, watchVisibility } from "./gsap";

// Datos de EJEMPLO: el tablero ilustra qué se gestiona en el portal (varios tipos de
// actividad, grupos, estados reales del sistema). No son actividades de ningún cliente y
// la nota del pie lo dice.
const EJEMPLOS = [
  ["TRIVIA SST", "12", "ACTIVO"],
  ["PAUSA ACTIVA", "8", "ACTIVO"],
  ["RETO AGUA", "5", "PAUSADO"],
  ["ESCAPE ROOM", "14", "ACTIVO"],
  ["SALUD MENTAL", "6", "VENCIDO"],
  ["BINGO SANO", "9", "ACTIVO"],
  ["HÁBITOS", "11", "PAUSADO"],
  ["QUIZ EN VIVO", "20", "ACTIVO"],
] as const;

const WIDTHS = [12, 2, 7];
const ROWS = 4;
const EVERY_MS = 2600;

/**
 * Tablero de salidas del login admin: cada pocos segundos una fila cambia por otra
 * actividad y sus celdas giran. Se detiene fuera de pantalla, con la pestaña oculta y
 * mientras el puntero o el foco están encima (nada cambia bajo la mirada de quien lee).
 */
export default function DepartureBoard() {
  const [rows, setRows] = useState<number[]>(() => Array.from({ length: ROWS }, (_, i) => i));
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current!;
    claimEntrance(el);
    if (reducedMotion()) return;

    let visible = true;
    let held = false;
    let next = ROWS;
    let slot = 0;
    const stopWatching = watchVisibility(el, (v) => (visible = v));
    const hold = () => (held = true);
    const release = () => (held = false);
    el.addEventListener("pointerenter", hold);
    el.addEventListener("pointerleave", release);
    el.addEventListener("focusin", hold);
    el.addEventListener("focusout", release);

    const timer = window.setInterval(() => {
      if (!visible || held || document.hidden) return;
      const entry = next % EJEMPLOS.length;
      const row = slot % ROWS;
      next++;
      slot++;
      setRows((prev) => prev.map((v, i) => (i === row ? entry : v)));
    }, EVERY_MS);

    return () => {
      window.clearInterval(timer);
      stopWatching();
      el.removeEventListener("pointerenter", hold);
      el.removeEventListener("pointerleave", release);
      el.removeEventListener("focusin", hold);
      el.removeEventListener("focusout", release);
    };
  }, []);

  return (
    <div ref={ref} className="board motion-pending" role="group" aria-label="Tablero de actividades (ejemplo ilustrativo)">
      <div className="board-head">
        <span>
          <strong>Salidas</strong> · hoy
        </span>
        <span>Antídoto</span>
      </div>
      <div className="board-grid">
        <span className="board-col">Actividad</span>
        <span className="board-col">Gr.</span>
        <span className="board-col">Estado</span>
        {rows.map((entry, r) => (
          <div key={r} className="board-row">
            {EJEMPLOS[entry].map((value, c) => (
              <SplitFlap
                key={c}
                text={c === 1 ? value.padStart(WIDTHS[c]) : value}
                length={WIDTHS[c]}
                tone="dark"
                delay={0.15 + r * 0.12}
              />
            ))}
          </div>
        ))}
      </div>
      <div className="board-note">
        <span>Ejemplo ilustrativo</span>
      </div>
    </div>
  );
}
