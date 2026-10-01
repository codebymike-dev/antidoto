"use client";

import { useActionState, useRef, useState } from "react";
import { resetPortalPassword, type CredentialsState } from "@/lib/user-actions";
import { colors } from "@/lib/theme";
import Credentials from "./Credentials";

/**
 * "Nueva contraseña" con un segundo clic de confirmación: la anterior deja de servir y
 * la persona sale del portal. El resultado ocupa todo el ancho bajo la fila.
 */
export default function ResetPasswordForm({ userId, loginUrl }: { userId: number; loginUrl: string }) {
  const [state, action, pending] = useActionState<CredentialsState, FormData>(resetPortalPassword, null);
  const [confirming, setConfirming] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function handleClick(e: React.MouseEvent<HTMLButtonElement>) {
    if (!confirming) {
      e.preventDefault();
      setConfirming(true);
      timeoutRef.current = setTimeout(() => setConfirming(false), 3000);
    } else {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      setConfirming(false);
    }
  }

  return (
    <>
      <form action={action}>
        <input type="hidden" name="userId" value={userId} />
        <button
          type="submit"
          disabled={pending}
          onClick={handleClick}
          className="btn-text"
          style={{
            cursor: "pointer",
            fontSize: 12.5,
            fontWeight: 600,
            border: "none",
            borderRadius: 8,
            background: confirming ? colors.accent : "none",
            color: confirming ? "#fff" : colors.accent,
            padding: confirming ? "6px 12px" : 0,
          }}
        >
          {pending ? "Generando…" : confirming ? "Sí, generar otra" : "Nueva contraseña"}
        </button>
      </form>
      {state && (
        // order: 1 la manda al final de la fila, debajo de los botones.
        <div style={{ flexBasis: "100%", order: 1 }}>
          {state.ok ? (
            <Credentials username={state.username} password={state.password} loginUrl={loginUrl} />
          ) : (
            <span role="alert" style={{ fontSize: 13, color: colors.danger, fontWeight: 600 }}>
              {state.error}
            </span>
          )}
        </div>
      )}
    </>
  );
}
