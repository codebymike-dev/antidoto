"use client";

import { useActionState } from "react";
import { createPortalUser, type CredentialsState } from "@/lib/user-actions";
import { colors } from "@/lib/theme";
import { filledButton } from "@/lib/styles";
import Credentials from "./Credentials";

/** Alta de un acceso: sin companyId crea un superadmin. */
export default function NewUserForm({ companyId, loginUrl }: { companyId: number | null; loginUrl: string }) {
  const [state, action, pending] = useActionState<CredentialsState, FormData>(createPortalUser, null);
  const inputId = `nuevo-usuario-${companyId ?? "super"}`;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <form action={action} style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {companyId !== null && <input type="hidden" name="companyId" value={companyId} />}
        <label htmlFor={inputId} style={{ fontSize: 13, fontWeight: 600, color: colors.ink }}>
          Dar acceso a alguien más
        </label>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <input
            id={inputId}
            name="username"
            required
            minLength={3}
            maxLength={60}
            autoComplete="off"
            autoCapitalize="none"
            spellCheck={false}
            placeholder="Usuario, por ejemplo su correo"
            aria-describedby={`${inputId}-ayuda`}
            aria-invalid={state?.ok === false || undefined}
            style={{ height: 44, flex: "1 1 240px", maxWidth: 360, borderRadius: 12, border: `1.5px solid ${state?.ok === false ? colors.danger : colors.border}`, padding: "0 12px", fontSize: 14, color: colors.ink }}
          />
          <button type="submit" disabled={pending} className="btn-filled" style={{ ...filledButton, opacity: pending ? 0.7 : 1 }}>
            {pending ? "Creando…" : "Crear acceso"}
          </button>
        </div>
        <span id={`${inputId}-ayuda`} style={{ fontSize: 12, color: colors.muted }}>
          Generamos una contraseña segura; la persona la cambia después en Mi cuenta.
        </span>
        {state?.ok === false && (
          <span role="alert" style={{ fontSize: 13, color: colors.danger, fontWeight: 600 }}>
            {state.error}
          </span>
        )}
      </form>
      {state?.ok && <Credentials username={state.username} password={state.password} loginUrl={loginUrl} />}
    </div>
  );
}
