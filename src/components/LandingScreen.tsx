"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { joinActivity, type JoinState } from "@/lib/actions";
import { colors, calSans } from "@/lib/theme";
import { fieldLabel, fieldInput, primaryButton } from "@/lib/styles";
import Blobs from "./Blobs";
import LogoMark from "./LogoMark";
import PolicyModal from "./PolicyModal";

export default function LandingScreen({ policyText, termsText }: { policyText: string; termsText: string }) {
  const [state, formAction, pending] = useActionState<JoinState, FormData>(joinActivity, null);
  const [policyTab, setPolicyTab] = useState<"privacidad" | "terminos" | null>(null);

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
        .login-logo {
          height: 192px;
        }
        .login-right {
          display: contents;
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
            gap: 14px;
          }
          .login-logo {
            height: 80px;
          }
          .login-right {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 16px;
            flex: 0 0 360px;
            max-width: 360px;
          }
        }
      `}</style>
      <Blobs />
      <div className="login-card" style={{ position: "relative", zIndex: 1 }}>
        <div className="login-brand">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={LOGO_SRC} alt="Antídoto" className="login-logo" />
          <h1 style={{ ...calSans, fontSize: 34, lineHeight: 1.15, margin: 0, color: colors.ink }}>
            Tu pausa con propósito empieza aquí
          </h1>
          <p style={{ fontSize: 15, lineHeight: 1.5, color: colors.inkSoft, margin: 0 }}>
            Ingresa tu nombre y el código de tu actividad para unirte a la misión de tu equipo.
          </p>
        </div>

        <div className="login-right">
          <form
            action={formAction}
            style={{
              width: "100%",
              display: "flex",
              flexDirection: "column",
              gap: 16,
            }}
          >
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <label htmlFor="name" style={fieldLabel}>
                Tu nombre
              </label>
              <input id="name" name="name" placeholder="Ej. Camila Ríos" style={fieldInput} required />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <label htmlFor="code" style={fieldLabel}>
                Código de actividad
              </label>
              <input
                id="code"
                name="code"
                placeholder="Ej. RP-ACME24"
                style={{ ...fieldInput, textTransform: "uppercase" }}
                required
              />
            </div>
            <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
              <input id="acceptedPolicy" name="acceptedPolicy" type="checkbox" style={{ marginTop: 3 }} />
              <label htmlFor="acceptedPolicy" style={{ fontSize: 12.5, color: colors.muted, lineHeight: 1.4 }}>
                Acepto la{" "}
                <button type="button" onClick={() => setPolicyTab("privacidad")} className="btn-text" style={linkButton}>
                  política de tratamiento de datos
                </button>{" "}
                y los{" "}
                <button type="button" onClick={() => setPolicyTab("terminos")} className="btn-text" style={linkButton}>
                  términos y condiciones
                </button>
                .
              </label>
            </div>
            <button type="submit" disabled={pending} className="btn-primary" style={{ ...primaryButton, opacity: pending ? 0.7 : 1 }}>
              {pending ? "Validando..." : "Comenzar mi pausa"}
            </button>
            {state?.error && (
              <span role="alert" style={{ fontSize: 12.5, color: colors.danger, fontWeight: 600 }}>
                {state.error}
              </span>
            )}
          </form>

          <Link href="/admin/login" style={{ fontSize: 13, color: colors.muted }}>
            ¿Eres administrador? <span style={{ color: colors.accent, fontWeight: 600 }}>Entrar al portal</span>
          </Link>
          <a
            href="https://antidotocolombia.com/"
            target="_blank"
            rel="noopener noreferrer"
            style={{ fontSize: 12.5, color: colors.muted, fontWeight: 600 }}
          >
            Visitar antidotocolombia.com ↗
          </a>
        </div>
      </div>

      {policyTab && (
        <PolicyModal
          tab={policyTab}
          onTab={setPolicyTab}
          onClose={() => setPolicyTab(null)}
          policyText={policyText}
          termsText={termsText}
        />
      )}
    </div>
  );
}

const linkButton = {
  background: "none",
  border: "none",
  padding: 0,
  font: "inherit",
  cursor: "pointer",
  color: colors.accent,
  fontWeight: 600,
} as const;
