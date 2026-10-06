import Link from "next/link";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { currentUser } from "@/lib/auth";
import { getCompany, listCompanyAssignments, listCompanyParticipants, listPortalUsers, type Assignment } from "@/lib/queries";
import { portalLoginUrl } from "@/lib/admin-guard";
import { getCompanyBrand } from "@/lib/company-brand";
import { archiveCode, archiveCompany, restoreCode, restoreCompany, setCodeExpiry, setCodePaused } from "@/lib/actions";
import { formatExpiryDate } from "@/lib/expiry";
import { brandPalette } from "@/lib/brand-palette";
import { lugar } from "@/lib/colombia";
import { colors, calSans } from "@/lib/theme";
import { card, filledButton, secondaryButton } from "@/lib/styles";
import BrandLogo from "@/components/BrandLogo";
import ConfirmDeleteButton from "@/components/admin/ConfirmDeleteButton";
import CopyCode from "@/components/admin/CopyCode";
import CodeShare from "@/components/admin/CodeShare";
import DropdownMenu from "@/components/admin/DropdownMenu";
import ExpandableList from "@/components/admin/ExpandableList";
import SavedToast from "@/components/admin/SavedToast";
import PortalUsersPanel from "@/components/admin/users/PortalUsersPanel";
import { ArrowRightIcon, GearIcon, InboxIcon, UsersIcon } from "@/components/icons";

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
  const [company, brand, assignments, portalUsers, loginUrl] = await Promise.all([
    getCompany(companyId),
    getCompanyBrand(companyId),
    listCompanyAssignments(companyId),
    // Quién entra al portal por la empresa: solo lo gestiona el superadmin.
    isSuper ? listPortalUsers(companyId) : [],
    isSuper ? portalLoginUrl() : "",
  ]);
  if (!company) notFound();

  const live = assignments.filter((a) => !a.archivado);
  const removed = assignments.filter((a) => a.archivado);
  const activities = byActivity(live);
  // La lista de quién entró, por actividad. Una empresa archivada no muestra resultados.
  const participantsByActivity = company.archived
    ? activities.map(() => [])
    : await Promise.all(activities.map((codes) => listCompanyParticipants(codes[0].mission_id, companyId)));
  const participantes = live.reduce((s, a) => s + a.participantes, 0);
  const justAssigned = asignada ? live.find((a) => a.codigo === asignada) : undefined;
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto = h.get("x-forwarded-proto") ?? (host?.startsWith("localhost") ? "http" : "https");
  const origin = `${proto}://${host ?? ""}`;
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
          Listo: {justAssigned.title} quedó asignada a {company.name}. Comparte el código <b>{justAssigned.codigo}</b> con los participantes: abajo, en &quot;Compartir&quot;, tienes el enlace, el QR y un mensaje listo para enviar.
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
        <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
          {isSuper && !company.archived ? (
            <>
              <DropdownMenu
                label={
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                    <GearIcon />
                    Ajustes de la empresa <span aria-hidden style={{ fontSize: 10 }}>▾</span>
                  </span>
                }
                summaryClassName="btn-text"
                summaryStyle={{ ...textButton, fontSize: 13.5, color: colors.inkSoft }}
                width={280}
              >
                <Link href={`/admin/empresas/${company.id}/marca`} className="report-menu-item" style={menuItem}>
                  {brand ? "Cambiar logo y colores" : "Ponerle logo y colores"}
                </Link>
                <div style={menuDivider} />
                <form action={archiveCompany} style={{ padding: "8px 10px" }}>
                  <input type="hidden" name="companyId" value={company.id} />
                  <ConfirmDeleteButton confirmLabel="Sí, archivar">Archivar empresa</ConfirmDeleteButton>
                  <p style={menuHint}>Para cuando ya no trabajas con ella: sus códigos dejan de funcionar. No se borra nada y se puede restaurar.</p>
                </form>
              </DropdownMenu>
              <Link
                href={`/admin/asignar?empresa=${company.id}`}
                className="btn-filled"
                style={{ ...filledButton, display: "inline-flex", alignItems: "center" }}
              >
                ＋ Asignar actividad
              </Link>
            </>
          ) : (
            <Link
              href={`/admin/empresas/${company.id}/marca`}
              className="btn-secondary"
              style={{ ...secondaryButton, display: "inline-flex", alignItems: "center" }}
            >
              {brand ? "Logo y colores" : "Ponerle logo y colores"}
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
                `Comparte el enlace o el QR del código (botón "Compartir"), o pide que entren a ${host ?? "la página de inicio"} y lo escriban.`,
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

      {activities.map((codes, i) => {
        const first = codes[0];
        const people = participantsByActivity[i];
        const total = codes.reduce((s, a) => s + a.participantes, 0);
        const done = codes.reduce((s, a) => s + a.completaron, 0);
        return (
          <section key={first.mission_id} style={{ ...card, padding: 0 }} aria-labelledby={`act-${first.mission_id}`}>
            <div style={{ padding: "20px 22px 0", display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
              <div style={{ minWidth: 0 }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: colors.accent, letterSpacing: 0.8 }}>{first.tag}</span>
                <h2 id={`act-${first.mission_id}`} style={{ ...calSans, fontSize: 20, margin: "2px 0 0", color: colors.ink }}>
                  {first.title}
                </h2>
                <p style={{ margin: "6px 0 0", fontSize: 14, color: colors.inkSoft }}>
                  {total === 0 ? (
                    "Nadie ha entrado todavía."
                  ) : (
                    <>
                      <b style={{ color: colors.ink }}>{total}</b> {total === 1 ? "persona entró" : "personas entraron"} ·{" "}
                      <b style={{ color: colors.ink }}>{done}</b> {done === 1 ? "terminó" : "terminaron"}
                    </>
                  )}
                </p>
              </div>
              {!company.archived && (
                <Link
                  href={`/admin/empresas/${company.id}/actividades/${first.mission_id}`}
                  className="btn-secondary"
                  style={{ ...secondaryButton, height: 40, display: "inline-flex", alignItems: "center", gap: 6 }}
                >
                  Ver resultados e informe
                  <ArrowRightIcon />
                </Link>
              )}
            </div>

            {!company.archived && (
              <div style={{ padding: "16px 22px 20px" }}>
                {people.length === 0 ? (
                  <div style={{ padding: "18px 16px", borderRadius: 12, background: "#F7FBFC", fontSize: 13.5, color: colors.muted, textAlign: "center" }}>
                    Cuando alguien entre con el código, aparecerá aquí con su avance.
                  </div>
                ) : (
                  <ParticipantsList people={people} />
                )}
              </div>
            )}

            {/* Sin overflow hidden en la tarjeta: el menú "Opciones del código" se sale de ella. */}
            <div style={{ background: "#F7FBFC", borderTop: `1px solid ${colors.accentTint}`, borderRadius: "0 0 18px 18px", padding: "14px 22px 6px" }}>
              <div style={{ fontSize: 13, color: colors.inkSoft, lineHeight: 1.5 }}>
                <b style={{ color: colors.ink }}>Para entrar:</b> comparte el enlace de &quot;Compartir&quot;, o cada persona va a{" "}
                <b style={{ color: colors.ink }}>{host ?? "la página de inicio"}</b> y escribe {codes.length === 1 ? "este código." : "uno de estos códigos."}
              </div>
              {codes.map((a) => (
                <CodeRow
                  key={a.id}
                  a={a}
                  canManage={isSuper && !company.archived}
                  showCount={codes.length > 1}
                  companyArchived={company.archived}
                  company={company.name}
                  origin={origin}
                  host={host ?? origin}
                />
              ))}
            </div>
          </section>
        );
      })}

      {isSuper && (
        <PortalUsersPanel
          title="Personas con acceso al portal"
          intro={`Ven solo lo de ${company.name} (avance, resultados e informes) y pueden lanzar sus propios juegos en vivo. No asignan actividades ni cambian códigos.`}
          users={portalUsers}
          companyId={company.id}
          currentUserId={user.id}
          loginUrl={loginUrl}
          canCreate={!company.archived}
        />
      )}

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

    </div>
  );
}

type Participant = Awaited<ReturnType<typeof listCompanyParticipants>>[number];

/** Cuántas personas se ven de entrada; el resto se abre con "Ver los N". */
const PREVIEW = 8;
const PEOPLE_COLUMNS = "minmax(0, 1fr) minmax(110px, 170px) 64px 104px";

function ParticipantsList({ people }: { people: Participant[] }) {
  const rows = (list: Participant[]) => list.map((x, i) => <ParticipantRow key={`${x.codigo}-${x.nombre}-${i}`} x={x} />);
  return (
    <div style={{ overflowX: "auto" }}>
      <div style={{ minWidth: 520 }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: PEOPLE_COLUMNS,
            gap: 14,
            padding: "0 0 8px",
            borderBottom: `1px solid ${colors.accentTint}`,
            fontSize: 11,
            fontWeight: 700,
            color: colors.muted,
            letterSpacing: 0.6,
            textTransform: "uppercase",
          }}
        >
          <span>Participante</span>
          <span>Avance</span>
          <span style={{ textAlign: "right" }}>Puntaje</span>
          <span>Estado</span>
        </div>
        {people.length > PREVIEW ? (
          <ExpandableList visible={rows(people.slice(0, PREVIEW))} hidden={rows(people.slice(PREVIEW))} total={people.length} />
        ) : (
          rows(people)
        )}
      </div>
    </div>
  );
}

function ParticipantRow({ x }: { x: Participant }) {
  const municipio = lugar(x.municipio)?.municipio;
  const detail = [x.cargo, municipio].filter(Boolean).join(" · ");
  const state = x.completed_at
    ? { label: "Terminó", color: "#1F8A4C", bg: "#E0F7EA" }
    : x.avance > 0
      ? { label: "En curso", color: colors.accentDark, bg: colors.accentTint }
      : { label: "Sin empezar", color: colors.muted, bg: "#EEF3F5" };
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: PEOPLE_COLUMNS,
        gap: 14,
        alignItems: "center",
        padding: "10px 0",
        borderBottom: `1px solid ${colors.accentTint}`,
      }}
    >
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: colors.ink, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{x.nombre}</div>
        {detail && (
          <div style={{ fontSize: 12, color: colors.muted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{detail}</div>
        )}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <div style={{ flex: 1, height: 7, borderRadius: 7, background: colors.accentTint, overflow: "hidden" }}>
          <div style={{ height: "100%", width: `${x.avance}%`, background: colors.buttonGradient, borderRadius: 7 }} />
        </div>
        <span style={{ fontSize: 12, fontWeight: 600, color: colors.inkSoft, width: 34, textAlign: "right" }}>{x.avance}%</span>
      </div>
      <span style={{ fontSize: 14, fontWeight: 600, color: x.puntaje === null ? colors.mutedLight : colors.ink, textAlign: "right" }}>
        {x.puntaje === null ? "–" : x.puntaje.toFixed(1).replace(".", ",")}
      </span>
      <span>
        <span style={{ fontSize: 11.5, fontWeight: 700, padding: "4px 9px", borderRadius: 100, color: state.color, background: state.bg, whiteSpace: "nowrap" }}>
          {state.label}
        </span>
      </span>
    </div>
  );
}

/** El estado del código dicho como se lo explicarías a alguien. */
function codeStatus(a: Assignment, companyArchived: boolean) {
  if (companyArchived) return { dot: colors.mutedLight, text: "No funciona: la empresa está archivada" };
  const fecha = a.expira ? formatExpiryDate(a.expira) : null;
  if (a.estado === "vencido") return { dot: colors.danger, text: `Cerró el ${fecha}: ya no se puede entrar` };
  if (a.estado === "pausado") return { dot: "#E0A100", text: "Pausado: nadie puede jugar por ahora" };
  return { dot: "#1F8A4C", text: fecha ? `Abierto hasta el ${fecha}` : "Abierto, sin fecha de cierre" };
}

function CodeRow({
  a,
  canManage,
  showCount,
  companyArchived,
  company,
  origin,
  host,
}: {
  a: Assignment;
  canManage: boolean;
  showCount: boolean;
  companyArchived: boolean;
  company: string;
  origin: string;
  host: string;
}) {
  const status = codeStatus(a, companyArchived);
  return (
    <CodeShare
      code={a.codigo}
      joinUrl={`${origin}/?codigo=${encodeURIComponent(a.codigo)}`}
      host={host}
      activity={a.title}
      company={company}
      // Un código cerrado no sirve para entrar; uno pausado sí se comparte, para cuando se reanude.
      shareable={!companyArchived && a.estado !== "vencido"}
      actions={canManage && <CodeOptions a={a} />}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
        <CopyCode code={a.codigo} size={17} />
        <span style={{ display: "inline-flex", alignItems: "center", gap: 7, fontSize: 13, color: colors.inkSoft }}>
          <span aria-hidden style={{ width: 8, height: 8, borderRadius: 8, background: status.dot }} />
          {status.text}
        </span>
        {showCount && (
          <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 12.5, color: colors.muted }}>
            <UsersIcon />
            {a.participantes} {a.participantes === 1 ? "persona" : "personas"}
          </span>
        )}
      </div>
    </CodeShare>
  );
}

function CodeOptions({ a }: { a: Assignment }) {
  return (
        // La key cambia al guardar: el menú se vuelve a montar cerrado.
        <DropdownMenu
          key={`${a.estado}-${a.expira ?? "sin-fecha"}`}
          label={
            <>
              Opciones del código <span aria-hidden style={{ fontSize: 10 }}>▾</span>
            </>
          }
          summaryClassName="btn-text"
          summaryStyle={textButton}
          width={270}
        >
          {a.estado !== "vencido" && (
            <>
              <form action={setCodePaused}>
                <input type="hidden" name="codeId" value={a.id} />
                <input type="hidden" name="paused" value={a.estado === "pausado" ? "0" : "1"} />
                <button type="submit" className="report-menu-item" style={menuButton}>
                  {a.estado === "pausado" ? "Reanudar: que puedan volver a jugar" : "Pausar: que nadie pueda jugar por ahora"}
                </button>
              </form>
              <div style={menuDivider} />
            </>
          )}
          <form action={setCodeExpiry} style={{ padding: "8px 10px", display: "flex", flexDirection: "column", gap: 8 }}>
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
            <button type="submit" className="btn-filled" style={{ ...filledButton, height: 36, fontSize: 13 }}>
              Guardar fecha
            </button>
          </form>
          <div style={menuDivider} />
          <form action={archiveCode} style={{ padding: "8px 10px" }}>
            <input type="hidden" name="codeId" value={a.id} />
            <ConfirmDeleteButton confirmLabel="Sí, quitar">Quitar este código</ConfirmDeleteButton>
            <p style={menuHint}>Deja de funcionar y sale de los informes. Los resultados se guardan y se puede restaurar.</p>
          </form>
        </DropdownMenu>
  );
}

const textButton = {
  background: "none",
  border: "none",
  padding: 0,
  cursor: "pointer",
  fontSize: 13,
  fontWeight: 600,
  color: colors.accent,
} as const;

const menuItem = {
  display: "block",
  padding: "9px 10px",
  borderRadius: 8,
  fontSize: 13.5,
  fontWeight: 600,
  color: colors.ink,
} as const;

const menuButton = {
  ...menuItem,
  width: "100%",
  textAlign: "left",
  background: "none",
  border: "none",
  cursor: "pointer",
} as const;

const menuDivider = { height: 1, background: colors.accentTint, margin: "4px 6px" } as const;

const menuHint = { margin: "6px 0 0", fontSize: 11.5, color: colors.muted, lineHeight: 1.4 } as const;
