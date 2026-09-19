import Link from "next/link";
import { currentUser } from "@/lib/auth";
import { listMissions, listCompanies, listAllCodes, getLegalTexts, listAuditLog } from "@/lib/queries";
import { generateCode, addCompany, deleteCompany, updateLegalText } from "@/lib/actions";
import { colors, calSans } from "@/lib/theme";
import { filledButton, card } from "@/lib/styles";
import { ESTADO_STYLES } from "@/lib/data";
import type { ConfigTab } from "@/lib/types";

export const dynamic = "force-dynamic";

const TABS: { key: ConfigTab; label: string; superOnly: boolean }[] = [
  { key: "codes", label: "Códigos y actividades", superOnly: false },
  { key: "companies", label: "Empresas y grupos", superOnly: true },
  { key: "legal", label: "Legal", superOnly: true },
  { key: "auditoria", label: "Auditoría", superOnly: true },
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
  searchParams: Promise<{ tab?: string; mission?: string }>;
}) {
  const user = (await currentUser())!;
  const { tab = "codes", mission } = await searchParams;
  const isSuper = user.role === "super";

  const active: ConfigTab = TABS.some((t) => t.key === tab && (!t.superOnly || isSuper))
    ? (tab as ConfigTab)
    : "codes";

  const missions = await listMissions(user);
  const allMissions = isSuper ? missions : missions;

  return (
    <div>
      <h1 style={{ ...calSans, fontSize: 28, margin: "0 0 20px 0", color: colors.ink }}>Configuración</h1>

      <div style={{ display: "flex", gap: 8, marginBottom: 26, flexWrap: "wrap" }}>
        {TABS.filter((t) => !t.superOnly || isSuper).map((t) => (
          <Link
            key={t.key}
            href={`/admin/config?tab=${t.key}`}
            style={{
              padding: "10px 18px",
              borderRadius: 10,
              fontSize: 13.5,
              fontWeight: 600,
              color: active === t.key ? colors.accentDark : colors.muted,
              background: active === t.key ? colors.accentTint : "transparent",
            }}
          >
            {t.label}
          </Link>
        ))}
      </div>

      {active === "codes" && <CodesTab user={user} missions={allMissions} preselected={mission} />}
      {active === "companies" && isSuper && <CompaniesTab />}
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
  user: { role: string; company_name: string | null };
  missions: { id: string; title: string }[];
  preselected?: string;
}) {
  const codes = await listAllCodes(user as never);
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

        <button type="submit" style={{ ...filledButton, height: 46 }}>
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

async function CompaniesTab() {
  const companies = await listCompanies();

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20, maxWidth: 560 }}>
      <form action={addCompany} style={{ background: "#fff", borderRadius: 18, padding: 20, display: "flex", gap: 10, boxShadow: colors.cardShadowSmall }}>
        <input
          name="name"
          placeholder="Nombre de la empresa o grupo"
          aria-label="Nombre de la empresa o grupo"
          style={{ ...select, flex: 1 }}
          required
        />
        <button type="submit" style={{ ...filledButton, padding: "0 18px", fontSize: 13.5 }}>
          ＋ Añadir
        </button>
      </form>

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {companies.map((c) => (
          <div
            key={c.id}
            style={{
              background: "#fff",
              borderRadius: 14,
              padding: "14px 18px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              boxShadow: "0 6px 16px rgba(12,92,125,0.06)",
            }}
          >
            <div>
              <div style={{ fontWeight: 600, fontSize: 14.5, color: colors.ink }}>{c.name}</div>
              <div style={{ fontSize: 12.5, color: colors.muted }}>
                {Number(c.count)} {Number(c.count) === 1 ? "código" : "códigos"}
              </div>
            </div>
            <form action={deleteCompany}>
              <input type="hidden" name="id" value={c.id} />
              <button
                type="submit"
                style={{ cursor: "pointer", fontSize: 12.5, color: "#C0503F", fontWeight: 600, background: "none", border: "none" }}
              >
                Eliminar
              </button>
            </form>
          </div>
        ))}
      </div>
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
          <button type="submit" style={{ ...filledButton, height: 42, alignSelf: "flex-start", padding: "0 18px", fontSize: 13.5 }}>
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

async function AuditTab({ user }: { user: { role: string; company_id: number | null } }) {
  const entries = await listAuditLog(user as never);

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
