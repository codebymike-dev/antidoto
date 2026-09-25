import Link from "next/link";
import { currentUser } from "@/lib/auth";
import { listMissions, listAllCodes, getLegalTexts, listAuditLog } from "@/lib/queries";
import { generateCode, deleteCompany, updateLegalText } from "@/lib/actions";
import { getCompanyBrand, listCompaniesWithBrand } from "@/lib/company-brand";
import { brandPalette } from "@/lib/brand-palette";
import { colors, calSans } from "@/lib/theme";
import { filledButton, secondaryButton, card, tabButton, tabButtonActive } from "@/lib/styles";
import { ESTADO_STYLES } from "@/lib/data";
import ConfirmDeleteButton from "@/components/admin/ConfirmDeleteButton";
import BrandLogo from "@/components/BrandLogo";
import BrandEditor from "@/components/admin/brand/BrandEditor";
import type { ConfigTab } from "@/lib/types";
import type { AdminUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

// Cada pestaña la ve un solo rol, o ambos (sin `only`).
const TABS: { key: ConfigTab; label: string; only?: "super" | "empresa" }[] = [
  { key: "codes", label: "Códigos y actividades" },
  { key: "companies", label: "Empresas y grupos", only: "super" },
  { key: "marca", label: "Mi marca", only: "empresa" },
  { key: "legal", label: "Legal", only: "super" },
  { key: "auditoria", label: "Auditoría", only: "super" },
];

function formatDate(iso: string | null) {
  if (!iso) return "Sin definir";
  const date = new Date(iso.replace(" ", "T") + (iso.endsWith("Z") ? "" : "Z"));
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleDateString("es-CO", { day: "2-digit", month: "short", year: "numeric" });
}

export default async function ConfigPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; mission?: string; guardada?: string }>;
}) {
  const user = (await currentUser())!;
  const { tab = "codes", mission, guardada } = await searchParams;
  const isSuper = user.role === "super";
  const visibleTabs = TABS.filter((t) => !t.only || t.only === user.role);

  const active: ConfigTab = visibleTabs.some((t) => t.key === tab) ? (tab as ConfigTab) : "codes";

  const missions = await listMissions(user);

  return (
    <div>
      <h1 style={{ ...calSans, fontSize: 28, margin: "0 0 20px 0", color: colors.ink }}>Configuración</h1>

      <div style={{ display: "flex", gap: 8, marginBottom: 26, flexWrap: "wrap" }}>
        {visibleTabs.map((t) => (
          <Link
            key={t.key}
            href={`/admin/config?tab=${t.key}`}
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

      {active === "codes" && <CodesTab user={user} missions={missions} preselected={mission} />}
      {active === "companies" && isSuper && <CompaniesTab savedId={guardada ? Number(guardada) : null} />}
      {active === "marca" && !isSuper && <OwnBrandTab user={user} saved={!!guardada} />}
      {active === "legal" && isSuper && <LegalTab />}
      {active === "auditoria" && isSuper && <AuditTab user={user} />}
    </div>
  );
}

async function CodesTab({
  user,
  missions,
  preselected,
}: {
  user: AdminUser;
  missions: { id: string; title: string }[];
  preselected?: string;
}) {
  const codes = await listAllCodes(user);
  const isEmpresa = user.role === "empresa";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <form action={generateCode} style={{ ...card, display: "flex", flexDirection: "column", gap: 16, maxWidth: 460 }}>
        <h3 style={{ ...calSans, fontSize: 17, margin: 0, color: colors.ink }}>Generar nuevo código</h3>

        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <label htmlFor="missionId" style={label}>
            Actividad / misión
          </label>
          <select id="missionId" name="missionId" defaultValue={preselected ?? missions[0]?.id} style={select} required>
            {missions.map((m) => (
              <option key={m.id} value={m.id}>
                {m.title}
              </option>
            ))}
          </select>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <label htmlFor="empresa" style={label}>
            Empresa o grupo
          </label>
          <input
            id="empresa"
            name="empresa"
            placeholder="Ej. Grupo Acme"
            defaultValue={isEmpresa ? user.company_name ?? "" : ""}
            disabled={isEmpresa}
            style={{ ...select, background: isEmpresa ? "#F4FBFD" : "#ffffff" }}
            required={!isEmpresa}
          />
        </div>

        <div style={{ display: "flex", gap: 10 }}>
          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6 }}>
            <label htmlFor="estado" style={label}>
              Estado inicial
            </label>
            <select id="estado" name="estado" defaultValue="activo" style={{ ...select, padding: "0 10px", fontSize: 13.5 }}>
              <option value="activo">Activo</option>
              <option value="pausado">Pausado</option>
            </select>
          </div>
          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6 }}>
            <label htmlFor="expira" style={label}>
              Vence el
            </label>
            <input id="expira" name="expira" type="date" style={{ ...select, padding: "0 10px", fontSize: 13.5 }} />
          </div>
        </div>

        <button type="submit" className="btn-filled" style={{ ...filledButton, height: 46 }}>
          Generar código
        </button>
      </form>

      <div style={{ background: "#fff", borderRadius: 18, padding: "6px 0", boxShadow: colors.cardShadowSmall, overflowX: "auto" }}>
        <div style={{ ...tableRow, fontSize: 12, fontWeight: 700, color: colors.muted, textTransform: "uppercase", letterSpacing: 0.4, borderBottom: "1px solid #EAF6FB" }}>
          <span>Actividad</span>
          <span>Empresa / grupo</span>
          <span>Código</span>
          <span>Fecha</span>
          <span>Participantes</span>
          <span>Estado</span>
        </div>
        {codes.length === 0 && (
          <div style={{ padding: "18px 22px", fontSize: 13.5, color: colors.muted }}>
            Todavía no hay códigos generados.
          </div>
        )}
        {codes.map((row) => {
          const est = ESTADO_STYLES[row.estado] ?? ESTADO_STYLES.activo;
          return (
            <div key={row.codigo} style={{ ...tableRow, alignItems: "center", borderBottom: "1px solid #F1FAFD" }}>
              <span style={{ fontSize: 13.5, color: colors.ink, fontWeight: 600 }}>{row.mission_title}</span>
              <span style={{ fontSize: 13.5, color: colors.ink }}>{row.empresa}</span>
              <span style={{ fontSize: 12.5, color: colors.muted, fontFamily: "monospace" }}>{row.codigo}</span>
              <span style={{ fontSize: 12.5, color: colors.muted }}>{formatDate(row.fecha)}</span>
              <span style={{ fontSize: 13.5, color: colors.ink }}>{row.participantes}</span>
              <span style={{ fontSize: 11, fontWeight: 700, padding: "4px 8px", borderRadius: 100, textAlign: "center", color: est.color, background: est.bg, width: "fit-content" }}>
                {est.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

async function CompaniesTab({ savedId }: { savedId: number | null }) {
  const companies = await listCompaniesWithBrand();
  const saved = savedId ? companies.find((c) => c.id === savedId) : undefined;
  const branded = companies.filter((c) => c.brand).length;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      {saved && <SavedToast text={`Listo: guardamos la marca de ${saved.name}.`} />}

      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
        <div>
          <h2 style={{ ...calSans, fontSize: 20, margin: 0, color: colors.ink, fontWeight: 400 }}>Empresas y grupos</h2>
          <p style={{ margin: "4px 0 0", fontSize: 13, color: colors.muted }}>
            {companies.length === 0
              ? "Crea la primera y dale su logo y colores."
              : `${companies.length} ${companies.length === 1 ? "empresa" : "empresas"} · ${branded} con marca propia`}
          </p>
        </div>
        <Link href="/admin/config/empresas/nueva" className="btn-filled" style={{ ...filledButton, display: "inline-flex", alignItems: "center", gap: 6 }}>
          ＋ Nueva empresa
        </Link>
      </div>

      {companies.length > 0 && (
        <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(250px, 1fr))", gap: 16 }}>
          {companies.map((c) => {
            const p = brandPalette(c.brand);
            const brand = c.brand ?? { name: c.name, primary: colors.accent, secondary: null, logoUrl: null, logoSurface: "claro" as const };
            return (
              <li
                key={c.id}
                className="company-card"
                style={{
                  background: "#fff",
                  borderRadius: 18,
                  overflow: "hidden",
                  display: "flex",
                  flexDirection: "column",
                  boxShadow: c.id === savedId ? `0 0 0 2px ${p.graphic}, ${colors.cardShadowSmall}` : colors.cardShadowSmall,
                }}
              >
                <Link
                  href={`/admin/config/empresas/${c.id}`}
                  aria-label={`Personalizar ${c.name}`}
                  style={{
                    position: "relative",
                    height: 104,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: "0 20px",
                    background: c.brand ? (c.brand.logoUrl && c.brand.logoSurface === "oscuro" ? colors.ink : p.pageGradient) : "#F4F8FA",
                    textDecoration: "none",
                  }}
                >
                  <BrandLogo brand={brand} surface={c.brand?.logoUrl && c.brand.logoSurface === "oscuro" ? "oscuro" : "claro"} height={44} showName={false} />
                  {!c.brand && (
                    <span style={{ position: "absolute", top: 10, right: 10, fontSize: 10.5, fontWeight: 700, color: colors.muted, background: "#fff", padding: "3px 8px", borderRadius: 100, letterSpacing: 0.3 }}>
                      Sin marca
                    </span>
                  )}
                </Link>
                <div style={{ padding: "14px 16px 16px", display: "flex", flexDirection: "column", gap: 12, flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10 }}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontWeight: 600, fontSize: 14.5, color: colors.ink, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.name}</div>
                      <div style={{ fontSize: 12.5, color: colors.muted }}>
                        {c.codes} {c.codes === 1 ? "código" : "códigos"}
                      </div>
                    </div>
                    {c.brand && (
                      <span style={{ display: "flex", gap: 4, flexShrink: 0, paddingTop: 3 }} aria-label={`Colores: ${[c.brand.primary, c.brand.secondary].filter(Boolean).join(" y ")}`}>
                        {[c.brand.primary, c.brand.secondary].filter(Boolean).map((hex) => (
                          <span key={hex} title={hex!} style={{ width: 14, height: 14, borderRadius: 999, background: hex!, boxShadow: "inset 0 0 0 1px rgba(15,24,29,0.12)" }} />
                        ))}
                      </span>
                    )}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, marginTop: "auto" }}>
                    <Link href={`/admin/config/empresas/${c.id}`} className="btn-secondary" style={{ ...secondaryButton, height: 36, fontSize: 12.5, display: "inline-flex", alignItems: "center" }}>
                      {c.brand ? "Editar marca" : "Personalizar"}
                    </Link>
                    <form action={deleteCompany}>
                      <input type="hidden" name="id" value={c.id} />
                      <ConfirmDeleteButton>Eliminar</ConfirmDeleteButton>
                    </form>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

async function OwnBrandTab({ user, saved }: { user: AdminUser; saved: boolean }) {
  const brand = await getCompanyBrand(user.company_id);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      {saved && <SavedToast text="Listo: tu marca ya se ve en las actividades, los juegos en vivo y los reportes." />}
      <p style={{ margin: 0, fontSize: 14, color: colors.muted, maxWidth: 640, lineHeight: 1.55 }}>
        Tu logo y tus colores acompañan a tus participantes en cada actividad, en la pantalla de los juegos en vivo y en los reportes PDF.
      </p>
      <BrandEditor
        companyId={user.company_id}
        canRename={false}
        initial={{
          name: user.company_name ?? "",
          primary: brand?.primary ?? null,
          secondary: brand?.secondary ?? null,
          welcome: brand?.welcome ?? null,
          logoUrl: brand?.logoUrl ?? null,
          logoSurface: brand?.logoSurface ?? "claro",
        }}
      />
    </div>
  );
}

function SavedToast({ text }: { text: string }) {
  return (
    <div
      role="status"
      className="toast-in"
      style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 16px", borderRadius: 12, background: "#EAF7EE", color: "#1E6B3A", fontSize: 13.5, fontWeight: 600, maxWidth: 640 }}
    >
      <span aria-hidden style={{ width: 20, height: 20, borderRadius: 999, background: "#2E9B57", color: "#fff", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 12 }}>
        ✓
      </span>
      {text}
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

const label = {
  fontSize: 12,
  fontWeight: 600 as const,
  color: colors.accentDark,
  textTransform: "uppercase" as const,
};

const select = {
  height: 44,
  borderRadius: 10,
  border: `1.5px solid ${colors.border}`,
  padding: "0 12px",
  fontSize: 14,
};

const tableRow = {
  display: "grid",
  gridTemplateColumns: "1.3fr 1.1fr 1fr 0.8fr 0.9fr 0.8fr",
  minWidth: 680,
  padding: "14px 22px",
};
