import Link from "next/link";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { currentUser } from "@/lib/auth";
import { getCompany, listCompanyAssignments, type Assignment } from "@/lib/queries";
import { getCompanyBrand } from "@/lib/company-brand";
import { archiveCode, archiveCompany, restoreCode, restoreCompany, setCodeExpiry, setCodePaused } from "@/lib/actions";
import { formatExpiryDate } from "@/lib/expiry";
import { brandPalette } from "@/lib/brand-palette";
import { ESTADO_STYLES } from "@/lib/data";
import { colors, calSans } from "@/lib/theme";
import { card, filledButton, secondaryButton } from "@/lib/styles";
import BrandLogo from "@/components/BrandLogo";
import ConfirmDeleteButton from "@/components/admin/ConfirmDeleteButton";
import CopyCode from "@/components/admin/CopyCode";
import SavedToast from "@/components/admin/SavedToast";
import { ArrowRightIcon, InboxIcon, UsersIcon } from "@/components/icons";

export const dynamic = "force-dynamic";

/** Las actividades de la empresa agrupadas: una actividad puede tener varios códigos. */
function byActivity(rows: Assignment[]) {
  const groups = new Map<string, Assignment[]>();
  for (const r of rows) groups.set(r.mission_id, [...(groups.get(r.mission_id) ?? []), r]);
  return [...groups.values()];
}

export default async function EmpresaPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ asignada?: string; guardada?: string }>;
}) {
  const user = (await currentUser())!;
  const isSuper = user.role === "super";
  const companyId = Number((await params).id);
  if (!Number.isInteger(companyId) || companyId <= 0) notFound();
  // El admin de empresa solo ve la suya.
  if (!isSuper && user.company_id !== companyId) notFound();

  const { asignada, guardada } = await searchParams;
  const [company, brand, assignments] = await Promise.all([
    getCompany(companyId),
    getCompanyBrand(companyId),
    listCompanyAssignments(companyId),
  ]);
  if (!company) notFound();

  const live = assignments.filter((a) => !a.archivado);
  const removed = assignments.filter((a) => a.archivado);
  const activities = byActivity(live);
  const participantes = live.reduce((s, a) => s + a.participantes, 0);
  const justAssigned = asignada ? live.find((a) => a.codigo === asignada) : undefined;
  const host = (await headers()).get("host");
  const p = brandPalette(brand);
  const logoBrand = brand ?? { name: company.name, primary: colors.accent, secondary: null, logoUrl: null, logoSurface: "claro" as const };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 22, maxWidth: 980 }}>
      {isSuper && (
        <Link href="/admin/empresas" style={{ fontSize: 13, color: colors.accentDark, fontWeight: 600 }}>
          ‹ Empresas
        </Link>
      )}

      {justAssigned && (
        <SavedToast>
          Listo: {justAssigned.title} quedó asignada a {company.name}. Comparte el código <b>{justAssigned.codigo}</b> con los participantes.
        </SavedToast>
      )}
      {guardada && <SavedToast>Listo: guardamos el logo y los colores de {company.name}.</SavedToast>}

      {company.archived && (
        <div role="status" style={{ ...card, boxShadow: "none", background: "#FFF3D6", padding: "16px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
          <div style={{ fontSize: 13.5, color: "#7A4F00", lineHeight: 1.5, maxWidth: 560 }}>
            <b>Esta empresa está archivada.</b> Sus códigos no aceptan participantes y su admin no puede entrar al portal. Los resultados siguen guardados.
          </div>
          {isSuper && (
            <form action={restoreCompany}>
              <input type="hidden" name="companyId" value={company.id} />
              <button type="submit" className="btn-filled" style={{ ...filledButton, height: 40 }}>
                Restaurar empresa
              </button>
            </form>
          )}
        </div>
      )}

      <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 20, flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 18, minWidth: 0 }}>
          <div
            style={{
              width: 76,
              height: 76,
              flexShrink: 0,
              borderRadius: 18,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: 10,
              background: brand?.logoUrl && brand.logoSurface === "oscuro" ? colors.ink : brand ? p.pageGradient : "#F4F8FA",
              boxShadow: colors.cardShadowSmall,
              overflow: "hidden",
            }}
          >
            <BrandLogo brand={logoBrand} surface={brand?.logoUrl && brand.logoSurface === "oscuro" ? "oscuro" : "claro"} height={34} showName={false} />
          </div>
          <div style={{ minWidth: 0 }}>
            <h1 style={{ ...calSans, fontSize: 28, margin: 0, color: colors.ink, fontWeight: 400 }}>{company.name}</h1>
            <p style={{ margin: "4px 0 0", fontSize: 13.5, color: colors.muted }}>
              {live.length === 0
                ? "Todavía no tiene actividades."
                : `${activities.length} ${activities.length === 1 ? "actividad" : "actividades"} · ${participantes} ${participantes === 1 ? "participante" : "participantes"}`}
            </p>
          </div>
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <Link
            href={`/admin/empresas/${company.id}/marca`}
            className="btn-secondary"
            style={{ ...secondaryButton, display: "inline-flex", alignItems: "center" }}
          >
            {brand ? "Logo y colores" : "Ponerle logo y colores"}
          </Link>
          {isSuper && !company.archived && (
            <Link
              href={`/admin/asignar?empresa=${company.id}`}
              className="btn-filled"
              style={{ ...filledButton, display: "inline-flex", alignItems: "center" }}
            >
              ＋ Asignar actividad
            </Link>
          )}
        </div>
      </header>

      {live.length === 0 && !company.archived && (
        <section style={{ ...card, padding: "28px 26px", display: "flex", gap: 22, alignItems: "flex-start", flexWrap: "wrap" }}>
          <div style={{ width: 56, height: 56, flexShrink: 0, borderRadius: 16, background: colors.accentTint, color: colors.accent, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <InboxIcon />
          </div>
          <div style={{ flex: 1, minWidth: 240 }}>
            <h2 style={{ ...calSans, fontSize: 18, margin: "0 0 10px", color: colors.ink }}>Así se pone en marcha</h2>
            <ol style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 8, fontSize: 14, color: colors.inkSoft, lineHeight: 1.5 }}>
              {[
                `${isSuper ? "Asígnale una actividad de la biblioteca." : "Antídoto le asigna una actividad a tu empresa."} Se crea un código.`,
                `Comparte el código: cada persona entra a ${host ?? "la página de inicio"} y lo escribe.`,
                "Vuelve aquí para ver cómo va y descargar el informe.",
              ].map((text, i) => (
                <li key={i} style={{ display: "flex", gap: 10, alignItems: "baseline" }}>
                  <span aria-hidden style={{ flexShrink: 0, width: 22, height: 22, borderRadius: 7, background: colors.ink, color: "#fff", fontSize: 12, fontWeight: 700, display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
                    {i + 1}
                  </span>
                  {text}
                </li>
              ))}
            </ol>
          </div>
        </section>
      )}

      {activities.map((codes) => {
        const first = codes[0];
        const total = codes.reduce((s, a) => s + a.participantes, 0);
        const done = codes.reduce((s, a) => s + a.completaron, 0);
        const avance = total ? Math.round(codes.reduce((s, a) => s + a.avance * a.participantes, 0) / total) : 0;
        return (
          <section key={first.mission_id} style={{ ...card, padding: 0, overflow: "hidden" }} aria-labelledby={`act-${first.mission_id}`}>
            <div style={{ padding: "20px 22px", display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
              <div style={{ minWidth: 0 }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: colors.accent, letterSpacing: 0.8 }}>{first.tag}</span>
                <h2 id={`act-${first.mission_id}`} style={{ ...calSans, fontSize: 20, margin: "2px 0 0", color: colors.ink }}>
                  {first.title}
                </h2>
              </div>
              {!company.archived && (
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <Link
                  href={`/admin/reporte/actividad/${first.mission_id}/${company.id}`}
                  className="btn-secondary"
                  style={{ ...secondaryButton, height: 38, display: "inline-flex", alignItems: "center" }}
                >
                  Informe PDF
                </Link>
                <Link
                  href={`/admin/empresas/${company.id}/actividades/${first.mission_id}`}
                  className="btn-filled"
                  style={{ ...filledButton, height: 38, padding: "0 16px", fontSize: 13, display: "inline-flex", alignItems: "center", gap: 6 }}
                >
                  Ver resultados
                  <ArrowRightIcon />
                </Link>
              </div>
              )}
            </div>

            <div style={{ padding: "0 22px 18px", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 18, alignItems: "end" }}>
              <Stat label="Participantes" value={String(total)} />
              <Stat label="Terminaron" value={total ? `${done} de ${total}` : "–"} />
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, fontWeight: 600, color: colors.muted, marginBottom: 6 }}>
                  <span>Avance promedio</span>
                  <span style={{ color: colors.ink, fontWeight: 700 }}>{avance}%</span>
                </div>
                <div style={{ height: 8, borderRadius: 8, background: colors.accentTint, overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${avance}%`, background: colors.buttonGradient, borderRadius: 8 }} />
                </div>
              </div>
            </div>

            <div style={{ background: "#F7FBFC", borderTop: `1px solid ${colors.accentTint}` }}>
              <div style={{ padding: "12px 22px 4px", fontSize: 11, fontWeight: 700, color: colors.muted, letterSpacing: 0.6, textTransform: "uppercase" }}>
                {codes.length === 1 ? "Código para los participantes" : `${codes.length} códigos para los participantes`}
              </div>
              {codes.map((a) => (
                <CodeRow key={a.id} a={a} canManage={isSuper && !company.archived} />
              ))}
            </div>
          </section>
        );
      })}

      {removed.length > 0 && (
        <details style={{ ...card, boxShadow: "none", border: `1px solid ${colors.accentTint}`, padding: "14px 20px" }}>
          <summary style={{ cursor: "pointer", fontSize: 14, fontWeight: 600, color: colors.inkSoft }}>
            Actividades quitadas ({removed.length})
          </summary>
          <p style={{ fontSize: 13, color: colors.muted, margin: "10px 0 6px", lineHeight: 1.5 }}>
            Sus códigos ya no funcionan y no cuentan en los informes. Los resultados siguen guardados: al restaurarla vuelven a aparecer.
          </p>
          {removed.map((a) => (
            <div key={a.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap", padding: "10px 0", borderTop: `1px solid ${colors.accentTint}` }}>
              <div style={{ fontSize: 13.5, color: colors.ink }}>
                <b>{a.title}</b> · <span style={{ fontFamily: "ui-monospace, monospace" }}>{a.codigo}</span> · {a.participantes}{" "}
                {a.participantes === 1 ? "participante" : "participantes"}
              </div>
              {isSuper && !company.archived && (
                <form action={restoreCode}>
                  <input type="hidden" name="codeId" value={a.id} />
                  <button type="submit" className="btn-secondary" style={{ ...secondaryButton, height: 34 }}>
                    Restaurar
                  </button>
                </form>
              )}
            </div>
          ))}
        </details>
      )}

      {isSuper && !company.archived && (
        <section style={{ borderTop: `1px solid ${colors.border}`, paddingTop: 18, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
          <div style={{ fontSize: 13, color: colors.muted, maxWidth: 560, lineHeight: 1.5 }}>
            <b style={{ color: colors.inkSoft }}>¿Ya no trabajas con {company.name}?</b> Archívala: sale de las listas, sus códigos dejan de funcionar y su admin
            ya no entra. No se borra nada y la puedes restaurar desde Empresas &gt; Archivadas.
          </div>
          <form action={archiveCompany}>
            <input type="hidden" name="companyId" value={company.id} />
            <ConfirmDeleteButton confirmLabel="Sí, archivar">Archivar empresa</ConfirmDeleteButton>
          </form>
        </section>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div style={{ fontSize: 12, fontWeight: 600, color: colors.muted }}>{label}</div>
      <div style={{ ...calSans, fontSize: 24, color: colors.ink, marginTop: 2 }}>{value}</div>
    </div>
  );
}

function CodeRow({ a, canManage }: { a: Assignment; canManage: boolean }) {
  const est = ESTADO_STYLES[a.estado] ?? ESTADO_STYLES.activo;
  const cierre = a.expira ? `${a.estado === "vencido" ? "Cerró" : "Cierra"} el ${formatExpiryDate(a.expira)}` : "Sin fecha de cierre";
  return (
    <div style={{ padding: "12px 22px 14px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 14, flexWrap: "wrap" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
        <CopyCode code={a.codigo} />
        <span style={{ fontSize: 11, fontWeight: 700, padding: "4px 9px", borderRadius: 100, color: est.color, background: est.bg }}>{est.label}</span>
        <span style={{ fontSize: 12.5, color: colors.muted }}>{cierre}</span>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 12.5, color: colors.muted }}>
          <UsersIcon />
          {a.participantes}
        </span>
      </div>
      {canManage && (
        <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
          {a.estado !== "vencido" && (
            <form action={setCodePaused}>
              <input type="hidden" name="codeId" value={a.id} />
              <input type="hidden" name="paused" value={a.estado === "pausado" ? "0" : "1"} />
              <button type="submit" className="btn-text" style={textButton} title={a.estado === "pausado" ? undefined : "Quien entre verá un aviso y no podrá jugar hasta que la reanudes"}>
                {a.estado === "pausado" ? "Reanudar" : "Pausar"}
              </button>
            </form>
          )}
          {/* La key cambia al guardar: el menú se vuelve a montar cerrado. */}
          <details key={a.expira ?? "sin-fecha"} className="report-menu" style={{ position: "relative" }}>
            <summary className="btn-text" style={{ ...textButton, listStyle: "none" }}>
              Cambiar fecha de cierre
            </summary>
            <form
              action={setCodeExpiry}
              style={{ position: "absolute", right: 0, top: "calc(100% + 6px)", zIndex: 20, background: "#fff", borderRadius: 12, padding: 14, boxShadow: "0 16px 40px rgba(15,24,29,0.16)", display: "flex", flexDirection: "column", gap: 10, width: 240 }}
            >
              <input type="hidden" name="codeId" value={a.id} />
              <label style={{ fontSize: 12, fontWeight: 600, color: colors.accentDark }} htmlFor={`expira-${a.id}`}>
                Último día para jugar
              </label>
              <input
                id={`expira-${a.id}`}
                name="expira"
                type="date"
                defaultValue={a.expira ?? ""}
                style={{ height: 40, borderRadius: 10, border: `1.5px solid ${colors.border}`, padding: "0 10px", fontSize: 13.5 }}
              />
              <span style={{ fontSize: 11.5, color: colors.muted, lineHeight: 1.4 }}>Déjalo vacío para que no cierre nunca.</span>
              <button type="submit" className="btn-filled" style={{ ...filledButton, height: 38, fontSize: 13 }}>
                Guardar fecha
              </button>
            </form>
          </details>
          <form action={archiveCode}>
            <input type="hidden" name="codeId" value={a.id} />
            <ConfirmDeleteButton confirmLabel="Sí, quitar">Quitar</ConfirmDeleteButton>
          </form>
        </div>
      )}
    </div>
  );
}

const textButton = {
  background: "none",
  border: "none",
  padding: 0,
  cursor: "pointer",
  fontSize: 12.5,
  fontWeight: 600,
  color: colors.accent,
} as const;
