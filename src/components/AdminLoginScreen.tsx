"use client";

import { useActionState, useState, type ReactNode } from "react";
import Link from "next/link";
import { loginAction, type LoginState } from "@/lib/actions";
import { colors, calSans } from "@/lib/theme";
import { fieldLabel, fieldInput, primaryButton } from "@/lib/styles";
import LogoMark from "./LogoMark";
import DepartureBoard from "./motion/DepartureBoard";
import MissionPass from "./motion/MissionPass";
import MotionHeading from "./motion/MotionHeading";

export default function AdminLoginScreen({ backdrop }: { backdrop?: ReactNode }) {
  const [state, formAction, pending] = useActionState<LoginState, FormData>(loginAction, null);
  const [attempt, setAttempt] = useState(0);
  // Tras un error React 19 reinicia el form: el usuario se conserva (la contraseña no).
  const [username, setUsername] = useState("");
  const stampLabel = pending ? "Verificando" : state?.error ? "Denegado" : null;

  return (
    <div className="access">
      {backdrop}
      <div className="access-card access-card--board">
        <div className="access-brand">
          <LogoMark height={38} />
          <MotionHeading style={{ ...calSans, fontSize: 32, lineHeight: 1.15, margin: 0, color: colors.ink }}>
            Portal administrador
          </MotionHeading>
          <p style={{ fontSize: 15, lineHeight: 1.5, color: colors.inkSoft, margin: 0 }}>
            Gestiona actividades, grupos y resultados.
          </p>
        </div>

        <div className="access-board">
          <DepartureBoard />
        </div>

        <div className="access-side">
          <form
            action={formAction}
            onSubmit={(e) => {
              setUsername(String(new FormData(e.currentTarget).get("username") ?? ""));
              setAttempt((n) => n + 1);
            }}
            style={{ width: "100%" }}
          >
            <MissionPass
              kicker="Credencial · Admin"
              stamp={{
                label: stampLabel,
                tone: pending ? "ink" : "danger",
                playKey: `${attempt}-${pending ? "p" : "r"}`,
              }}
              stub={
                <button
                  type="submit"
                  disabled={pending}
                  className="btn-primary"
                  style={{ ...primaryButton, marginTop: 0, opacity: pending ? 0.7 : 1 }}
                >
                  {pending ? "Entrando..." : "Ingresar"}
                </button>
              }
            >
              <div data-pass-item style={{ display: "flex", flexDirection: "column", gap: 6 }}>
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
                  defaultValue={username}
                  style={fieldInput}
                  required
                />
              </div>
              <div data-pass-item style={{ display: "flex", flexDirection: "column", gap: 6 }}>
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
              {state?.error && !pending && (
                <span role="alert" style={{ fontSize: 12.5, color: colors.danger, fontWeight: 600 }}>
                  {state.error}
                </span>
              )}
            </MissionPass>
          </form>
          <Link href="/" style={{ fontSize: 13, color: colors.muted }}>
            ‹ Volver al sitio
          </Link>
        </div>
      </div>
    </div>
  );
}
