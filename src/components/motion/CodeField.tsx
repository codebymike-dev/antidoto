"use client";

import { useEffect, useRef, useState, type InputHTMLAttributes } from "react";
import { changedCells } from "@/lib/split-flap";
import { flapTimeline, reducedMotion } from "./gsap";

/** Celdas dibujadas: el código más largo que genera el portal es de 16 caracteres. */
export const CODE_CELLS = 16;

/**
 * Campo del código de actividad como tablero split-flap. El <input> es real y está encima
 * (accesible, pegable, con autocompletado del navegador); las celdas van detrás y calzan
 * con cada carácter porque la fuente es monoespaciada y el espaciado se mide en `ch`.
 * Cada carácter nuevo gira en una capa superior que tapa al del input mientras dura el giro.
 */
export default function CodeField(props: InputHTMLAttributes<HTMLInputElement>) {
  const [length, setLength] = useState(0);
  const previous = useRef("");
  const flapsRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Las celdas siguen al input también cuando cambia sin teclear: al montar con un valor por
  // defecto y cuando React 19 reinicia el <form> tras la acción del servidor. El evento
  // `reset` llega antes de que el navegador restaure el valor, por eso se lee un tick después.
  useEffect(() => {
    const input = inputRef.current;
    if (!input) return;
    const sync = () => {
      previous.current = input.value.toUpperCase();
      setLength(Array.from(input.value).length);
    };
    sync();
    const onReset = () => window.setTimeout(sync, 0);
    input.form?.addEventListener("reset", onReset);
    return () => input.form?.removeEventListener("reset", onReset);
  }, []);

  function onInput(e: React.FormEvent<HTMLInputElement>) {
    const next = e.currentTarget.value.toUpperCase();
    const before = previous.current;
    previous.current = next;
    setLength(Array.from(next).length);
    // Solo giran las inserciones y dentro de las celdas visibles; si el texto ya no cabe,
    // el input se desplaza por dentro y las capas dejarían de calzar.
    if (reducedMotion() || next.length <= before.length || next.length > CODE_CELLS) return;
    const root = flapsRef.current!;
    const only = changedCells(before, next).slice(-CODE_CELLS);
    root.dataset.flap = next;
    flapTimeline(root, { only, salt: next.length, frame: 0.045 });
  }

  const chars = Array.from({ length: CODE_CELLS }, (_, i) => i);
  return (
    <div className="code-field">
      <div className="code-cells" aria-hidden="true">
        {chars.map((i) => (
          <span key={i} className={i < length ? "code-cell is-filled" : i === length ? "code-cell is-next" : "code-cell"} />
        ))}
      </div>
      <input
        {...props}
        ref={inputRef}
        className="code-input"
        autoComplete="off"
        autoCapitalize="characters"
        spellCheck={false}
        onInput={onInput}
      />
      <div ref={flapsRef} className="code-flaps" aria-hidden="true">
        {chars.map((i) => (
          <span key={i} className="flap-cell code-flap">
            <span className="flap-char" />
          </span>
        ))}
      </div>
    </div>
  );
}
