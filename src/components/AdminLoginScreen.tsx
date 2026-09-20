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
          gap: 10px;
          text-align: center;
        }
        .login-form {
          width: 100%;
          background: #ffffff;
          border-radius: 20px;
          padding: 28px 24px;
          display: flex;
          flex-direction: column;
          gap: 16px;
          box-shadow: ${colors.cardShadow};
          border-top: 4px solid ${colors.accentLight};
        }
        @media (min-width: 860px) {
          .login-card {
            flex-direction: row;
            align-items: stretch;
            gap: 0;
            max-width: 820px;
            background: #ffffff;
            border-radius: 24px;
            box-shadow: ${colors.cardShadow};
            border-top: 4px solid ${colors.accentLight};
            overflow: hidden;
          }
          .login-brand {
            flex: 0 0 42%;
            align-items: flex-start;
            justify-content: center;
            text-align: left;
            gap: 14px;
            background: ${colors.accentTint};
            padding: 56px 48px;
            border-right: 1px solid ${colors.border};
          }
          .login-form {
            flex: 1 1 auto;
            justify-content: center;
            box-shadow: none;
            border-top: none;
            border-radius: 0;
            padding: 56px 56px;
          }
        }
      `}</style>
      <Blobs />
      <div className="login-card" style={{ position: "relative", zIndex: 1 }}>
        <div className="login-brand">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={LOGO_SRC} alt="Antídoto" style={{ height: 132 }} />
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
