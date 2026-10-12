"use client";

import { useEffect, useId, useRef, useState, type CSSProperties, type InputHTMLAttributes, type KeyboardEvent } from "react";
import { flushSync } from "react-dom";

type Props = Omit<InputHTMLAttributes<HTMLInputElement>, "type"> & { id: string; style?: CSSProperties };

/**
 * Campo de contraseña con el ojito para mostrarla u ocultarla.
 * - El foco y el cursor se quedan en el campo al tocar el ojo (no salta al botón).
 * - Al enviar el formulario vuelve a ocultarse antes de que salga, para que el
 *   gestor de contraseñas la reconozca y nadie la vea en la pantalla siguiente.
 * - Avisa si el Bloq Mayús está activo mientras se escribe.
 */
export default function PasswordInput({ id, style, onKeyDown, onKeyUp, onBlur, ...rest }: Props) {
  const [shown, setShown] = useState(false);
  const [capsLock, setCapsLock] = useState(false);
  // El parpadeo del ojo solo después del primer toque, no al cargar la página.
  const [touched, setTouched] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const maskId = useId();

  useEffect(() => {
    const form = inputRef.current?.form;
    if (!form) return;
    const hide = () => flushSync(() => setShown(false));
    form.addEventListener("submit", hide, { capture: true });
    return () => form.removeEventListener("submit", hide, { capture: true });
  }, []);

  function readCaps(e: KeyboardEvent<HTMLInputElement>) {
    // getModifierState no existe en algunos teclados virtuales.
    if (typeof e.getModifierState === "function") setCapsLock(e.getModifierState("CapsLock"));
  }

  function toggle() {
    const input = inputRef.current;
    const start = input?.selectionStart ?? null;
    const end = input?.selectionEnd ?? null;
    flushSync(() => {
      setShown((s) => !s);
      setTouched(true);
    });
    // Cambiar el type puede mover el cursor al inicio en algunos navegadores.
    if (input && start !== null && end !== null) input.setSelectionRange(start, end);
  }

  const label = shown ? "Ocultar contraseña" : "Mostrar contraseña";

  return (
    <div className="pw-field">
      <input
        {...rest}
        ref={inputRef}
        id={id}
        type={shown ? "text" : "password"}
        autoCapitalize="none"
        autoCorrect="off"
        spellCheck={false}
        data-shown={shown || undefined}
        className="pw-input"
        style={{ ...style, paddingRight: capsLock ? 108 : 52 }}
        onKeyDown={(e) => {
          readCaps(e);
          onKeyDown?.(e);
        }}
        onKeyUp={(e) => {
          readCaps(e);
          onKeyUp?.(e);
        }}
        onBlur={(e) => {
          setCapsLock(false);
          onBlur?.(e);
        }}
      />

      <span className="pw-caps" data-on={capsLock || undefined} aria-live="polite">
        {capsLock && (
          <>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M12 3 4 12h4.5v4h7v-4H20z" />
              <path d="M8.5 20.5h7" />
            </svg>
            Mayús
          </>
        )}
      </span>

      <button
        type="button"
        className="pw-toggle"
        aria-controls={id}
        aria-pressed={shown}
        aria-label={label}
        title={label}
        data-shown={shown || undefined}
        data-touched={touched || undefined}
        // Sin esto el clic le roba el foco al campo y en móvil se cierra el teclado.
        onMouseDown={(e) => e.preventDefault()}
        onClick={toggle}
      >
        <svg className="pw-eye" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <defs>
            {/* Abre un hueco alrededor de la raya para que corte el ojo limpio. */}
            <mask id={maskId} maskUnits="userSpaceOnUse" x="0" y="0" width="24" height="24">
              <rect width="24" height="24" fill="#fff" />
              <path className="pw-eye-cut" d="M3.5 3.5l17 17" stroke="#000" strokeWidth="4.6" pathLength={1} />
            </mask>
          </defs>
          <g mask={`url(#${maskId})`}>
            <g className="pw-eye-lid">
              <path d="M2.2 12c1.9-4.1 5.5-6.6 9.8-6.6s7.9 2.5 9.8 6.6c-1.9 4.1-5.5 6.6-9.8 6.6S4.1 16.1 2.2 12Z" />
              <circle className="pw-eye-pupil" cx="12" cy="12" r="3.1" />
            </g>
          </g>
          <path className="pw-eye-slash" d="M3.5 3.5l17 17" pathLength={1} />
        </svg>
      </button>
    </div>
  );
}
