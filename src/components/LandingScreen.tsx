"use client";

import { useActionState, useState, type ReactNode } from "react";
import Link from "next/link";
import { joinActivity, type JoinState } from "@/lib/actions";
import { colors, calSans } from "@/lib/theme";
import { fieldLabel, fieldInput, primaryButton } from "@/lib/styles";
import LogoMark from "./LogoMark";
import CodeField from "./motion/CodeField";
import MissionPass from "./motion/MissionPass";
import MotionHeading from "./motion/MotionHeading";
import PolicyModal from "./PolicyModal";

export default function LandingScreen({
  policyText,
  termsText,
  backdrop,
}: {
  policyText: string;
  termsText: string;
  /** Fondo guilloche, calculado en el servidor (ver PassBackdrop). */
  backdrop?: ReactNode;
}) {
  const [state, formAction, pending] = useActionState<JoinState, FormData>(joinActivity, null);
  const [policyTab, setPolicyTab] = useState<"privacidad" | "terminos" | null>(null);
  // Cada envío deja caer el sello otra vez: "Validando" mientras el servidor responde y
  // "Revisa" si vuelve con un error. En éxito el servidor redirige a /mision.
  const [attempt, setAttempt] = useState(0);
  // React 19 reinicia el <form> al terminar la acción, también cuando vuelve con error, y el
  // participante tenía que escribir todo de nuevo. Lo enviado pasa a ser el valor por
  // defecto: el reinicio devuelve los campos a lo que tecleó en vez de vaciarlos.
  const [draft, setDraft] = useState({ name: "", code: "", accepted: false });
  const stampLabel = pending ? "Validando" : state?.error ? "Revisa" : null;

  return (
    <div className="access">
      {backdrop}
      <div className="access-card">
        <div className="access-brand">
          <LogoMark height={38} />
          <MotionHeading style={{ ...calSans, fontSize: 36, lineHeight: 1.12, margin: 0, color: colors.ink }}>
            Tu misión interactiva empieza aquí
          </MotionHeading>
          <p style={{ fontSize: 15, lineHeight: 1.5, color: colors.inkSoft, margin: 0, maxWidth: 400 }}>
            Ingresa tu nombre y el código de tu actividad para unirte a la misión de tu equipo.
          </p>
        </div>

        <div className="access-side">
          <form
            action={formAction}
            onSubmit={(e) => {
              const data = new FormData(e.currentTarget);
              setDraft({
                name: String(data.get("name") ?? ""),
                code: String(data.get("code") ?? ""),
                accepted: data.get("acceptedPolicy") !== null,
              });
              setAttempt((n) => n + 1);
            }}
            style={{ width: "100%" }}
          >
            <MissionPass
              kicker="Pase de misión"
              stamp={{
                label: stampLabel,
                tone: pending ? "ink" : "danger",
                playKey: `${attempt}-${pending ? "p" : "r"}`,
              }}
              stub={
                <>
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
                    <input
                      id="acceptedPolicy"
                      name="acceptedPolicy"
                      type="checkbox"
                      defaultChecked={draft.accepted}
                      style={{ marginTop: 3 }}
                    />
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
                  <button
                    type="submit"
                    disabled={pending}
                    className="btn-primary"
                    style={{ ...primaryButton, marginTop: 0, opacity: pending ? 0.7 : 1 }}
                  >
                    {pending ? "Validando..." : "Comenzar mi misión"}
                  </button>
                </>
              }
            >
              <div data-pass-item style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <label htmlFor="name" style={fieldLabel}>
                  Tu nombre
                </label>
                <input
                  id="name"
                  name="name"
                  placeholder="Ej. Camila Ríos"
                  defaultValue={draft.name}
                  style={fieldInput}
                  required
                />
              </div>
              <div data-pass-item style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <label htmlFor="code" style={fieldLabel}>
                  Código de actividad
                </label>
                <CodeField id="code" name="code" placeholder="RP-ACME-7KX9QM" defaultValue={draft.code} required />
              </div>
              {state?.error && !pending && (
                <span role="alert" style={{ fontSize: 12.5, color: colors.danger, fontWeight: 600 }}>
                  {state.error}
                </span>
              )}
            </MissionPass>
          </form>

          <Link href="/admin/login" className="portal-link" style={{ fontSize: 13, color: colors.muted }}>
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
