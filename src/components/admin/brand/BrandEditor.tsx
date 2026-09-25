"use client";

import { useActionState, useEffect, useId, useMemo, useRef, useState, startTransition, type CSSProperties } from "react";
import Link from "next/link";
import { saveCompanyBrand, type BrandFormState } from "@/lib/brand-actions";
import { derivePalette, parseHex, PRESET_COLORS } from "@/lib/brand-palette";
import { colors, calSans } from "@/lib/theme";
import { filledButton, secondaryButton } from "@/lib/styles";
import BrandLogo from "@/components/BrandLogo";
import BrandPreview from "./BrandPreview";
import { analyzeLogoUrl, processLogo, type ProcessedLogo } from "./logo-processing";

type Surface = "claro" | "oscuro";

type LogoState = { kind: "saved"; url: string } | { kind: "new"; logo: ProcessedLogo } | { kind: "none" };

interface Props {
  /** Null = empresa nueva. */
  companyId: number | null;
  initial: {
    name: string;
    primary: string | null;
    secondary: string | null;
    welcome: string | null;
    logoUrl: string | null;
    logoSurface: Surface;
  };
  /** Solo el superadmin renombra; el admin de empresa ve el nombre fijo. */
  canRename: boolean;
  cancelHref?: string;
}

const WELCOME_MAX = 140;

export default function BrandEditor({ companyId, initial, canRename, cancelHref }: Props) {
  const [state, dispatch, pending] = useActionState<BrandFormState, FormData>(saveCompanyBrand, null);
  const [name, setName] = useState(initial.name);
  const [primary, setPrimary] = useState(initial.primary ?? "");
  const [secondary, setSecondary] = useState(initial.secondary ?? "");
  const [useSecondary, setUseSecondary] = useState(!!initial.secondary);
  const [welcome, setWelcome] = useState(initial.welcome ?? "");
  const [logo, setLogo] = useState<LogoState>(initial.logoUrl ? { kind: "saved", url: initial.logoUrl } : { kind: "none" });
  const [surface, setSurface] = useState<Surface>(initial.logoSurface);
  const [logoColors, setLogoColors] = useState<string[]>([]);
  const [logoNote, setLogoNote] = useState<{ tone: "info" | "error"; text: string } | null>(null);
  const [processing, setProcessing] = useState(false);

  const validPrimary = parseHex(primary);
  const validSecondary = useSecondary ? parseHex(secondary) : null;
  // Sin color elegido todavía, la vista previa usa el primero del logo o el de Antídoto.
  const previewPrimary = validPrimary ?? logoColors[0] ?? "#1C99CA";
  const palette = useMemo(() => derivePalette(previewPrimary, validSecondary), [previewPrimary, validSecondary]);

  const logoUrl = logo.kind === "saved" ? logo.url : logo.kind === "new" ? logo.logo.url : null;
  const brand = { name: name.trim() || "Tu empresa", primary: previewPrimary, secondary: validSecondary, logoUrl, logoSurface: surface, welcome: welcome.trim() || null };

  // Al editar, se leen los colores del logo guardado para ofrecer las mismas sugerencias.
  const savedUrl = initial.logoUrl;
  useEffect(() => {
    if (!savedUrl) return;
    let alive = true;
    void analyzeLogoUrl(savedUrl).then((read) => {
      if (alive && read) setLogoColors(read.colors);
    });
    return () => {
      alive = false;
    };
  }, [savedUrl]);

  // Libera la URL temporal del logo al reemplazarlo o al salir.
  useEffect(() => {
    if (logo.kind !== "new") return;
    const url = logo.logo.url;
    return () => URL.revokeObjectURL(url);
  }, [logo]);

  async function onFile(file: File) {
    setProcessing(true);
    setLogoNote(null);
    const res = await processLogo(file);
    setProcessing(false);
    if (!res.ok) {
      setLogoNote({ tone: "error", text: res.error });
      return;
    }
    const { logo: processed } = res;
    setLogo({ kind: "new", logo: processed });
    setSurface(processed.surface);
    setLogoColors(processed.colors);
    // El primer logo propone el color: el usuario lo ve aplicado y lo cambia si quiere.
    if (!validPrimary && processed.colors[0]) setPrimary(processed.colors[0]);
    const kb = Math.max(1, Math.round(processed.file.size / 1024));
    setLogoNote({
      tone: "info",
      text:
        processed.file.type === "image/svg+xml"
          ? `Logo vectorial listo (${kb} KB): se verá nítido en cualquier pantalla.`
          : `Listo: recortamos el espacio sobrante y lo optimizamos a ${kb} KB.`,
    });
  }

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    fd.set("logoChange", logo.kind === "new" ? "replace" : logo.kind === "none" && initial.logoUrl ? "remove" : "keep");
    if (logo.kind === "new") fd.set("logo", logo.logo.file);
    if (!useSecondary) fd.set("secondary", "");
    startTransition(() => dispatch(fd));
  }

  const isNew = companyId === null;
  const errorFor = (field: NonNullable<BrandFormState>["field"]) => (state && state.field === field ? state.error : null);

  return (
    <form onSubmit={onSubmit} noValidate style={{ display: "flex", flexDirection: "column", gap: 0 }}>
      {companyId !== null && <input type="hidden" name="companyId" value={companyId} />}
      <input type="hidden" name="primary" value={validPrimary ?? primary} />
      <input type="hidden" name="logoSurface" value={surface} />

      <div className="brand-editor-grid">
        <div style={{ display: "flex", flexDirection: "column", gap: 16, minWidth: 0 }}>
          <Section step={1} title="Identidad" hint="Así aparece la empresa en códigos, pantallas y reportes.">
            {canRename ? (
              <Field label="Nombre de la empresa" htmlFor="brand-name" error={errorFor("name")}>
                <input
                  id="brand-name"
                  name="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ej. Grupo Acme"
                  maxLength={80}
                  autoFocus={isNew}
                  autoComplete="organization"
                  aria-invalid={!!errorFor("name")}
                  style={input(!!errorFor("name"))}
                  required
                />
              </Field>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                <span style={labelStyle}>Empresa</span>
                <span style={{ ...calSans, fontSize: 20, color: colors.ink }}>{initial.name}</span>
              </div>
            )}
          </Section>

          <Section step={2} title="Logo" hint="PNG, SVG, JPG o WebP. Lo recortamos y optimizamos por ti.">
            <LogoField
              logo={logo}
              surface={surface}
              name={brand.name}
              primary={previewPrimary}
              processing={processing}
              note={logoNote ?? (errorFor("logo") ? { tone: "error", text: errorFor("logo")! } : null)}
              onFile={onFile}
              onRemove={() => {
                setLogo({ kind: "none" });
                setLogoColors([]);
                setLogoNote(null);
              }}
            />
            {logo.kind !== "none" && (
              <fieldset style={{ border: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 8 }}>
                <legend style={{ ...labelStyle, marginBottom: 8 }}>¿Para qué fondo está pensado?</legend>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                  {(["claro", "oscuro"] as const).map((s) => (
                    <label
                      key={s}
                      className="brand-choice"
                      style={{
                        ...choice,
                        borderColor: surface === s ? colors.accent : colors.border,
                        background: surface === s ? colors.accentTint : "#fff",
                      }}
                    >
                      <input type="radio" name="logoSurfaceChoice" value={s} checked={surface === s} onChange={() => setSurface(s)} style={srOnly} />
                      <span aria-hidden style={{ width: 22, height: 22, borderRadius: 6, background: s === "claro" ? "#fff" : colors.ink, boxShadow: "inset 0 0 0 1px rgba(15,24,29,0.15)", flexShrink: 0 }} />
                      <span style={{ display: "flex", flexDirection: "column" }}>
                        <span style={{ fontSize: 13.5, fontWeight: 600, color: colors.ink }}>Fondo {s}</span>
                        <span style={{ fontSize: 11.5, color: colors.muted }}>{s === "claro" ? "Logo oscuro o a color" : "Logo blanco o claro"}</span>
                      </span>
                    </label>
                  ))}
                </div>
                <span style={helpText}>Lo detectamos solo. Sobre el fondo contrario lo mostramos en una placa para que no se pierda.</span>
              </fieldset>
            )}
          </Section>

          <Section step={3} title="Colores" hint="El principal pinta botones, etiquetas y gráficos. Ajustamos el contraste para que todo se lea.">
            <ColorField
              id="brand-primary"
              label="Color principal"
              value={primary}
              onChange={setPrimary}
              fromLogo={logoColors}
              error={errorFor("primary") ?? (primary && !validPrimary ? "Escribe un color hexadecimal, como #1C99CA." : null)}
            />
            {useSecondary ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <ColorField
                  id="brand-secondary"
                  name="secondary"
                  label="Color secundario"
                  value={secondary}
                  onChange={setSecondary}
                  fromLogo={logoColors}
                  error={errorFor("secondary") ?? (secondary && !parseHex(secondary) ? "Escribe un color hexadecimal, como #FFB400." : null)}
                />
                <button type="button" className="btn-text" onClick={() => setUseSecondary(false)} style={textButton}>
                  Quitar color secundario
                </button>
              </div>
            ) : (
              <button
                type="button"
                className="btn-secondary"
                onClick={() => {
                  setUseSecondary(true);
                  if (!secondary) setSecondary(logoColors.find((c) => c !== validPrimary) ?? "");
                }}
                style={{ ...secondaryButton, alignSelf: "flex-start", height: 38, fontSize: 12.5 }}
              >
                ＋ Añadir color secundario
              </button>
            )}
          </Section>

          <Section step={4} title="Mensaje de bienvenida" hint="Opcional. Aparece bajo el saludo del participante." optional>
            <Field label="Mensaje" htmlFor="brand-welcome" error={errorFor("welcome")} counter={`${welcome.length}/${WELCOME_MAX}`}>
              <textarea
                id="brand-welcome"
                name="welcome"
                value={welcome}
                onChange={(e) => setWelcome(e.target.value.slice(0, WELCOME_MAX))}
                placeholder="Ej. En Acme cuidarnos es parte de nuestra cultura. ¡Gracias por participar!"
                rows={3}
                style={{ ...input(!!errorFor("welcome")), height: "auto", padding: "10px 14px", resize: "vertical", lineHeight: 1.5 }}
              />
            </Field>
          </Section>
        </div>

        <aside className="brand-editor-preview">
          <BrandPreview brand={brand} palette={palette} />
        </aside>
      </div>

      <div className="brand-savebar">
        <div role="alert" aria-live="assertive" style={{ flex: 1, minWidth: 0, fontSize: 13, fontWeight: 600, color: colors.danger }}>
          {state?.error && !state.field ? state.error : state?.error ? "Revisa los campos marcados." : ""}
        </div>
        {cancelHref && (
          <Link href={cancelHref} className="btn-secondary" style={{ ...secondaryButton, display: "inline-flex", alignItems: "center" }}>
            Cancelar
          </Link>
        )}
        <button
          type="submit"
          className="btn-filled"
          disabled={pending || processing || !validPrimary || (canRename && !name.trim())}
          style={{ ...filledButton, height: 44, padding: "0 22px", opacity: pending || processing || !validPrimary || (canRename && !name.trim()) ? 0.55 : 1 }}
        >
          {pending ? "Guardando…" : isNew ? "Crear empresa" : "Guardar cambios"}
        </button>
      </div>
    </form>
  );
}

// --- Piezas del formulario --------------------------------------------------------------

function Section({ step, title, hint, optional, children }: { step: number; title: string; hint: string; optional?: boolean; children: React.ReactNode }) {
  const id = useId();
  return (
    <section aria-labelledby={id} style={{ background: "#fff", borderRadius: 18, padding: "20px 22px 22px", boxShadow: colors.cardShadowSmall, display: "flex", flexDirection: "column", gap: 16 }}>
      <header style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
        <span aria-hidden style={{ width: 26, height: 26, borderRadius: 8, background: colors.accentTint, color: colors.accentDark, display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 12.5, fontWeight: 700, flexShrink: 0 }}>
          {step}
        </span>
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <h2 id={id} style={{ ...calSans, fontSize: 17, margin: 0, color: colors.ink, fontWeight: 400 }}>
            {title}
            {optional && <span style={{ fontFamily: "inherit", fontSize: 12, color: colors.mutedLight, marginLeft: 8 }}>Opcional</span>}
          </h2>
          <p style={{ margin: 0, fontSize: 12.5, color: colors.muted, lineHeight: 1.5 }}>{hint}</p>
        </div>
      </header>
      {children}
    </section>
  );
}

function Field({ label, htmlFor, error, counter, children }: { label: string; htmlFor: string; error?: string | null; counter?: string; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
        <label htmlFor={htmlFor} style={labelStyle}>
          {label}
        </label>
        {counter && <span style={{ fontSize: 11.5, color: colors.mutedLight }}>{counter}</span>}
      </div>
      {children}
      {error && (
        <span role="alert" style={{ fontSize: 12, color: colors.danger, fontWeight: 600 }}>
          {error}
        </span>
      )}
    </div>
  );
}

function LogoField({
  logo,
  surface,
  name,
  primary,
  processing,
  note,
  onFile,
  onRemove,
}: {
  logo: LogoState;
  surface: Surface;
  name: string;
  primary: string;
  processing: boolean;
  note: { tone: "info" | "error"; text: string } | null;
  onFile: (file: File) => void;
  onRemove: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const url = logo.kind === "saved" ? logo.url : logo.kind === "new" ? logo.logo.url : null;
  const brand = { name, primary, secondary: null, logoUrl: url, logoSurface: surface };

  const pick = () => inputRef.current?.click();
  const dropProps = {
    onDragOver: (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(true);
    },
    onDragLeave: () => setDragging(false),
    onDrop: (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) onFile(file);
    },
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/svg+xml"
        style={srOnly}
        tabIndex={-1}
        aria-hidden
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onFile(file);
          e.target.value = "";
        }}
      />

      {url ? (
        <div {...dropProps} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              borderRadius: 14,
              overflow: "hidden",
              boxShadow: dragging ? `0 0 0 2px ${colors.accent}` : "0 0 0 1px rgba(15,24,29,0.08)",
            }}
          >
            {(["claro", "oscuro"] as const).map((s) => (
              <div
                key={s}
                style={{
                  position: "relative",
                  height: 120,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: 16,
                  background: s === "claro" ? "#FFFFFF" : colors.ink,
                  opacity: processing ? 0.4 : 1,
                  transition: "opacity 0.2s ease",
                }}
              >
                <BrandLogo brand={brand} surface={s} height={52} />
                <span style={{ position: "absolute", left: 10, bottom: 8, fontSize: 10.5, fontWeight: 600, color: s === "claro" ? colors.mutedLight : "#7C93A0" }}>
                  Sobre {s}
                </span>
              </div>
            ))}
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button type="button" className="btn-secondary" onClick={pick} disabled={processing} style={{ ...secondaryButton, height: 36, fontSize: 12.5 }}>
              {processing ? "Optimizando…" : "Cambiar logo"}
            </button>
            <button type="button" className="btn-text" onClick={onRemove} disabled={processing} style={{ ...textButton, color: colors.danger }}>
              Quitar
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={pick}
          disabled={processing}
          {...dropProps}
          className="brand-dropzone"
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            minHeight: 150,
            padding: 20,
            borderRadius: 14,
            border: `1.5px dashed ${dragging ? colors.accent : "#B9DDEB"}`,
            background: dragging ? colors.accentTint : "#F8FCFD",
            cursor: processing ? "progress" : "pointer",
            textAlign: "center",
          }}
        >
          <span aria-hidden style={{ width: 44, height: 44, borderRadius: 12, background: "#fff", boxShadow: colors.cardShadowSmall, display: "inline-flex", alignItems: "center", justifyContent: "center", color: colors.accent }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 16V4M7 9l5-5 5 5" />
              <path d="M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3" />
            </svg>
          </span>
          <span style={{ fontSize: 14, color: colors.ink, fontWeight: 600 }}>
            {processing ? "Optimizando tu logo…" : (
              <>
                Arrastra tu logo aquí o <span style={{ color: colors.accent }}>elige un archivo</span>
              </>
            )}
          </span>
          <span style={{ fontSize: 12, color: colors.muted }}>Mejor en SVG o PNG con fondo transparente</span>
        </button>
      )}

      {note && (
        <span role={note.tone === "error" ? "alert" : "status"} style={{ fontSize: 12.5, fontWeight: 600, color: note.tone === "error" ? colors.danger : "#1E6B3A" }}>
          {note.text}
        </span>
      )}
    </div>
  );
}

function ColorField({
  id,
  name,
  label,
  value,
  onChange,
  fromLogo,
  error,
}: {
  id: string;
  name?: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  fromLogo: string[];
  error: string | null;
}) {
  const valid = parseHex(value);
  const presets = PRESET_COLORS.filter((c) => !fromLogo.includes(c));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <label htmlFor={id} style={labelStyle}>
        {label}
      </label>
      <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
        <span
          style={{
            position: "relative",
            width: 44,
            height: 44,
            borderRadius: 12,
            flexShrink: 0,
            background: valid ?? "repeating-conic-gradient(#E6EEF1 0% 25%, #fff 0% 50%) 50% / 12px 12px",
            boxShadow: "inset 0 0 0 1px rgba(15,24,29,0.12)",
          }}
        >
          <input
            type="color"
            aria-label={`${label}: abrir selector`}
            value={(valid ?? "#1C99CA").toLowerCase()}
            onChange={(e) => onChange(e.target.value.toUpperCase())}
            style={{ position: "absolute", inset: 0, width: "100%", height: "100%", opacity: 0, cursor: "pointer", border: "none", padding: 0 }}
          />
        </span>
        <input
          id={id}
          name={name}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={() => valid && onChange(valid)}
          placeholder="#1C99CA"
          spellCheck={false}
          autoComplete="off"
          maxLength={7}
          aria-invalid={!!error}
          style={{ ...input(!!error), width: 140, fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", textTransform: "uppercase", letterSpacing: 0.5 }}
        />
      </div>

      {fromLogo.length > 0 && <Swatches title="De tu logo" list={fromLogo} value={valid} onPick={onChange} />}
      <Swatches title="Sugeridos" list={presets} value={valid} onPick={onChange} />

      {error && (
        <span role="alert" style={{ fontSize: 12, color: colors.danger, fontWeight: 600 }}>
          {error}
        </span>
      )}
    </div>
  );
}

function Swatches({ title, list, value, onPick }: { title: string; list: string[]; value: string | null; onPick: (c: string) => void }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
      <span style={{ fontSize: 11.5, fontWeight: 600, color: colors.muted, minWidth: 74 }}>{title}</span>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        {list.map((c) => {
          const on = value === c;
          return (
            <button
              key={c}
              type="button"
              className="brand-swatch"
              aria-label={`Usar ${c}`}
              aria-pressed={on}
              title={c}
              onClick={() => onPick(c)}
              style={{
                width: 26,
                height: 26,
                borderRadius: 999,
                border: "none",
                padding: 0,
                cursor: "pointer",
                background: c,
                boxShadow: on ? `0 0 0 2px #fff, 0 0 0 4px ${c}` : "inset 0 0 0 1px rgba(15,24,29,0.12)",
                transform: on ? "scale(1.05)" : "none",
              }}
            />
          );
        })}
      </div>
    </div>
  );
}

// --- Estilos ------------------------------------------------------------------------------

const labelStyle: CSSProperties = {
  fontSize: 12,
  fontWeight: 600,
  color: colors.accentDark,
  textTransform: "uppercase",
  letterSpacing: 0.6,
};

const helpText: CSSProperties = { fontSize: 12, color: colors.muted, lineHeight: 1.5 };

const input = (invalid: boolean): CSSProperties => ({
  height: 44,
  borderRadius: 10,
  border: `1.5px solid ${invalid ? colors.danger : colors.border}`,
  padding: "0 14px",
  fontSize: 14,
  color: colors.ink,
  background: "#fff",
  width: "100%",
});

const choice: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 10,
  padding: "10px 12px",
  borderRadius: 12,
  border: "1.5px solid",
  cursor: "pointer",
  transition: "background 0.15s ease, border-color 0.15s ease",
};

const textButton: CSSProperties = {
  alignSelf: "flex-start",
  background: "none",
  border: "none",
  padding: 0,
  fontSize: 12.5,
  fontWeight: 600,
  color: colors.accentDark,
  cursor: "pointer",
};

const srOnly: CSSProperties = {
  position: "absolute",
  width: 1,
  height: 1,
  padding: 0,
  margin: -1,
  overflow: "hidden",
  clip: "rect(0,0,0,0)",
  whiteSpace: "nowrap",
  border: 0,
};
