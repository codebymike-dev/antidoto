"use client";

import { useActionState } from "react";
import Link from "next/link";
import { loginAction, type LoginState } from "@/lib/actions";
import { colors, calSans } from "@/lib/theme";
import { fieldLabel, fieldInput, primaryButton } from "@/lib/styles";
import Blobs from "./Blobs";
import LogoMark from "./LogoMark";

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
      <style>{`
        .login-card {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 34px;
          width: 100%;
          max-width: 420px;
        }
        .login-brand {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 16px;
          text-align: center;
        }
        .login-form {
          width: 100%;
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        @media (min-width: 860px) {
          .login-card {
            flex-direction: row;
            align-items: flex-start;
            gap: 64px;
            max-width: 780px;
          }
          .login-brand {
            flex: 1 1 auto;
            align-items: flex-start;
            text-align: left;
          }
          .login-form {
            flex: 0 0 360px;
            max-width: 360px;
          }
        }
      `}</style>
      <Blobs />
      <div className="login-card" style={{ position: "relative", zIndex: 1 }}>
        <div className="login-brand">
          <LogoMark height={38} />
          <h1 style={{ ...calSans, fontSize: 28, lineHeight: 1.15, margin: 0, color: colors.ink }}>
            Portal administrador
          </h1>
          <p style={{ fontSize: 15, lineHeight: 1.5, color: colors.inkSoft, margin: 0 }}>
            Gestiona actividades, grupos y resultados.
          </p>
        </div>

        <form action={formAction} className="login-form">
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
          <button type="submit" disabled={pending} className="btn-primary" style={{ ...primaryButton, opacity: pending ? 0.7 : 1 }}>
            {pending ? "Entrando..." : "Ingresar"}
          </button>
          {state?.error && (
            <span role="alert" style={{ fontSize: 12.5, color: colors.danger, fontWeight: 600 }}>
              {state.error}
            </span>
          )}
        </form>
      </div>
      <Link href="/" style={{ position: "relative", zIndex: 1, fontSize: 13, color: colors.muted, marginTop: 20 }}>
        ‹ Volver al sitio
      </Link>
    </div>
  );
}
