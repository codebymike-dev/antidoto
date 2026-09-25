import Link from "next/link";
import { requireSuper } from "@/lib/admin-guard";
import { getLegalTexts, listAuditLog } from "@/lib/queries";
import { updateLegalText } from "@/lib/actions";
import { colors, calSans } from "@/lib/theme";
import { filledButton, tabButton, tabButtonActive } from "@/lib/styles";
import type { AdminUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

const TABS = [
  { key: "legal", label: "Textos legales" },
  { key: "historial", label: "Historial de cambios" },
] as const;

function formatDate(iso: string | null) {
  if (!iso) return "Sin definir";
  const date = new Date(iso.replace(" ", "T") + (iso.endsWith("Z") ? "" : "Z"));
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleDateString("es-CO", { day: "2-digit", month: "short", year: "numeric" });
}

/** Lo que no es del día a día: textos legales e historial. Solo superadmin. */
export default async function AjustesPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const user = await requireSuper();
  const { tab } = await searchParams;
  const active = tab === "historial" ? "historial" : "legal";

  return (
    <div>
      <h1 style={{ ...calSans, fontSize: 28, margin: "0 0 20px 0", color: colors.ink }}>Ajustes</h1>

      <div style={{ display: "flex", gap: 8, marginBottom: 26, flexWrap: "wrap" }}>
        {TABS.map((t) => (
          <Link
            key={t.key}
            href={`/admin/ajustes?tab=${t.key}`}
            className={active === t.key ? "btn-tab-active" : "btn-tab"}
            style={{
              ...(active === t.key ? tabButtonActive : tabButton),
              padding: "10px 18px",
              fontSize: 13.5,
              color: active === t.key ? colors.accentDark : colors.muted,
            }}
          >
            {t.label}
          </Link>
        ))}
      </div>

      {active === "legal" && <LegalTab />}
      {active === "historial" && <AuditTab user={user} />}
    </div>
  );
}

async function LegalTab() {
  const legal = await getLegalTexts();

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20, maxWidth: 640 }}>
      {(
        [
          { key: "privacidad", title: "Política de tratamiento de datos", body: legal.privacidad, minHeight: 180 },
          { key: "terminos", title: "Términos y condiciones", body: legal.terminos, minHeight: 140 },
        ] as const
      ).map((t) => (
        <form
          key={t.key}
          action={updateLegalText}
          style={{ background: "#fff", borderRadius: 18, padding: 22, display: "flex", flexDirection: "column", gap: 10, boxShadow: colors.cardShadowSmall }}
        >
          <h3 style={{ ...calSans, fontSize: 16, margin: 0, color: colors.ink }}>{t.title}</h3>
          <input type="hidden" name="key" value={t.key} />
          <textarea
            name="body"
            defaultValue={t.body}
            aria-label={t.title}
            style={{
              minHeight: t.minHeight,
              borderRadius: 10,
              border: `1.5px solid ${colors.border}`,
              padding: 12,
              fontSize: 13,
              lineHeight: 1.6,
              resize: "vertical",
            }}
          />
          <button type="submit" className="btn-filled" style={{ ...filledButton, height: 42, alignSelf: "flex-start", padding: "0 18px", fontSize: 13.5 }}>
            Guardar
          </button>
        </form>
      ))}
      <span style={{ fontSize: 12, color: colors.muted }}>
        Este texto se muestra a los participantes desde el enlace de política en la pantalla de ingreso.
      </span>
    </div>
  );
}

async function AuditTab({ user }: { user: AdminUser }) {
  const entries = await listAuditLog(user);

  return (
    <div style={{ background: "#fff", borderRadius: 18, padding: "6px 0", boxShadow: colors.cardShadowSmall, maxWidth: 680 }}>
      {entries.length === 0 && (
        <div style={{ padding: "18px 22px", fontSize: 13.5, color: colors.muted }}>Sin movimientos registrados.</div>
      )}
      {entries.map((e) => (
        <div key={e.id} style={{ padding: "14px 22px", borderBottom: "1px solid #F1FAFD", display: "flex", flexDirection: "column", gap: 2 }}>
          <span style={{ fontSize: 13.5, color: colors.ink }}>{e.text}</span>
          <span style={{ fontSize: 11.5, color: colors.muted }}>{formatDate(e.created_at)}</span>
        </div>
      ))}
    </div>
  );
}
