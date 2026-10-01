"use client";

import { useActionState } from "react";
import { changeOwnPassword, type ChangePasswordState } from "@/lib/user-actions";
import { colors } from "@/lib/theme";
import { card, fieldInput, fieldLabel, filledButton } from "@/lib/styles";
import SavedToast from "@/components/admin/SavedToast";

export default function ChangePasswordForm({ username, minLength }: { username: string; minLength: number }) {
  const [state, action, pending] = useActionState<ChangePasswordState, FormData>(changeOwnPassword, null);

  return (
    <form action={action} style={{ ...card, display: "flex", flexDirection: "column", gap: 16, maxWidth: 440 }}>
      {/* Para que el gestor de contraseñas sepa de qué cuenta es la nueva. */}
      <input type="text" name="username" autoComplete="username" value={username} readOnly hidden />
      {state?.ok && <SavedToast>Listo: tu contraseña cambió. Las demás sesiones abiertas se cerraron.</SavedToast>}
      <Field id="current" label="Contraseña actual" autoComplete="current-password" />
      <Field id="next" label="Nueva contraseña" autoComplete="new-password" minLength={minLength} hint={`Mínimo ${minLength} caracteres. Una frase corta es más fácil de recordar.`} />
      <Field id="confirm" label="Repite la nueva contraseña" autoComplete="new-password" minLength={minLength} />
      {state?.ok === false && (
        <span role="alert" style={{ fontSize: 13, color: colors.danger, fontWeight: 600 }}>
          {state.error}
        </span>
      )}
      <button type="submit" disabled={pending} className="btn-filled" style={{ ...filledButton, alignSelf: "flex-start", opacity: pending ? 0.7 : 1 }}>
        {pending ? "Guardando…" : "Cambiar contraseña"}
      </button>
    </form>
  );
}

function Field({ id, label, autoComplete, minLength, hint }: { id: string; label: string; autoComplete: string; minLength?: number; hint?: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <label htmlFor={id} style={fieldLabel}>
        {label}
      </label>
      <input
        id={id}
        name={id}
        type="password"
        required
        minLength={minLength}
        autoComplete={autoComplete}
        aria-describedby={hint ? `${id}-ayuda` : undefined}
        style={{ ...fieldInput, height: 44 }}
      />
      {hint && (
        <span id={`${id}-ayuda`} style={{ fontSize: 12, color: colors.muted }}>
          {hint}
        </span>
      )}
    </div>
  );
}
