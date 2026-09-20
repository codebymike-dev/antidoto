"use client";

import { useActionState } from "react";
import Link from "next/link";
import { loginAction, type LoginState } from "@/lib/actions";
import { colors, LOGO_SRC, calSans } from "@/lib/theme";
import { fieldLabel, fieldInput, primaryButton } from "@/lib/styles";
import Blobs from "./Blobs";

export default function AdminLoginScreen() {
  const [state, formAction, pending] = useActionState<LoginState, FormData>(loginAction, null);

  return (
    <div
      style={{
        position: "relative",
        minHeight: "100vh",
        overflow: "hidden",
        background: colors.pageGradient,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "32px 20px",
      }}
    >
      <Blobs />
      <div
        style={{
          position: "relative",
          zIndex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 34,
          width: "100%",
          maxWidth: 420,
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={LOGO_SRC} alt="Antídoto" style={{ height: 132 }} />
        <div style={{ textAlign: "center", display: "flex", flexDirection: "column", gap: 10 }}>
          <h1 style={{ ...calSans, fontSize: 28, lineHeight: 1.15, margin: 0, color: colors.ink }}>
            Portal administrador
          </h1>
          <p style={{ fontSize: 15, lineHeight: 1.5, color: colors.inkSoft, margin: 0 }}>
            Gestiona actividades, grupos y resultados.
          </p>
        </div>

        <form
          action={formAction}
          style={{
            width: "100%",
            background: "#ffffff",
            borderRadius: 20,
            padding: "28px 24px",
            display: "flex",
            flexDirection: "column",
            gap: 16,
            boxShadow: colors.cardShadow,
            borderTop: `4px solid ${colors.accentLight}`,
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <label htmlFor="username" style={fieldLabel}>
              Usuario
            </label>
            <input
              id="username"
              name="username"
              type="text"
              autoComplete="username"
              autoCapitalize="none"
              spellCheck={false}
              placeholder="admin"
              style={fieldInput}
              required
            />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <label htmlFor="password" style={fieldLabel}>
              Contraseña
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              placeholder="••••••••"
              style={fieldInput}
              required
            />
          </div>
          <button type="submit" disabled={pending} style={{ ...primaryButton, opacity: pending ? 0.7 : 1 }}>
            {pending ? "Entrando..." : "Ingresar"}
          </button>
          {state?.error && (
            <span role="alert" style={{ fontSize: 12.5, color: colors.danger, fontWeight: 600 }}>
              {state.error}
            </span>
          )}
        </form>

        <Link href="/" style={{ fontSize: 13, color: colors.muted }}>
          ‹ Volver al sitio
        </Link>
      </div>
    </div>
  );
}
