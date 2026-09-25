import Link from "next/link";
import { redirect } from "next/navigation";
import { currentUser } from "@/lib/auth";
import { listMissions } from "@/lib/queries";
import { colors, calSans } from "@/lib/theme";
import { filledButton } from "@/lib/styles";
import { SearchIcon, UsersIcon, GridIcon, ArrowRightIcon } from "@/components/icons";
import DealGrid from "@/components/motion/DealGrid";
import FlapText from "@/components/motion/FlapText";
import SplitFlap from "@/components/motion/SplitFlap";
import StatsBoard from "@/components/motion/StatsBoard";

// Las cifras y los tickets solo giran la primera vez que se abre el tablero en la sesión.
const INTRO_KEY = "antidoto:tablero-visto";

export const dynamic = "force-dynamic";

export default async function ActividadesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const user = (await currentUser())!;
  // El admin de empresa entra directo a su empresa.
  if (user.role === "empresa") redirect(`/admin/empresas/${user.company_id}`);
  const { q = "" } = await searchParams;
  const missions = await listMissions(user, q);

  // Totales de lo que se ve (si hay búsqueda, de lo filtrado). El avance se pondera por
  // participantes: una actividad con 3 personas no pesa lo mismo que una con 300.
  const grupos = missions.reduce((n, m) => n + m.groupsCount, 0);
  const participantes = missions.reduce((n, m) => n + m.totalParticipantes, 0);
  const avance = participantes
    ? Math.round(missions.reduce((n, m) => n + m.avgAvance * m.totalParticipantes, 0) / participantes)
    : 0;

  return (
    <div>
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: 20,
          flexWrap: "wrap",
          marginBottom: 16,
        }}
      >
        <div>
          <h1 style={{ ...calSans, fontSize: 28, margin: "0 0 4px 0", color: colors.ink }}>Actividades</h1>
          <p style={{ fontSize: 14, color: colors.muted, margin: 0 }}>
            Misiones activas y el avance de cada grupo participante.
          </p>
        </div>
        {user.role === "super" && (
          <Link
            href="/admin/asignar"
            className="btn-filled"
            style={{ ...filledButton, display: "inline-flex", alignItems: "center" }}
          >
            ＋ Asignar actividad
          </Link>
        )}
      </div>

      <StatsBoard
        introKey={INTRO_KEY}
        stats={[
          { label: "Actividades", value: String(missions.length) },
          { label: "Grupos", value: String(grupos) },
          { label: "Participantes", value: String(participantes) },
          { label: "Avance promedio", value: `${avance}%` },
        ]}
      />

      <form style={{ marginBottom: 20, maxWidth: 320 }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            height: 42,
            borderRadius: 10,
            border: `1.5px solid ${colors.border}`,
            padding: "0 14px",
            background: "#fff",
          }}
        >
          <span style={{ color: colors.mutedLight, display: "flex" }}>
            <SearchIcon />
          </span>
          <input
            name="q"
            defaultValue={q}
            placeholder="Buscar actividad..."
            aria-label="Buscar actividad"
            style={{ border: "none", outline: "none", fontSize: 13.5, width: "100%", background: "none", color: colors.ink }}
          />
        </div>
      </form>

      {missions.length === 0 && (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            textAlign: "center",
            gap: 12,
            maxWidth: 380,
            margin: "48px auto",
          }}
        >
          <div style={{ fontSize: 13, padding: "14px 16px", borderRadius: 14, background: "#fff", boxShadow: colors.cardShadowSmall }}>
            <SplitFlap text={q ? "SIN RESULTADOS" : "SIN ACTIVIDADES"} />
          </div>
          <h2 style={{ ...calSans, fontSize: 17, margin: 0, color: colors.ink }}>
            {q ? "No hay actividades que coincidan" : "Aún no tienes actividades"}
          </h2>
          <p style={{ fontSize: 13.5, color: colors.muted, margin: 0, lineHeight: 1.5 }}>
            {q
              ? "Prueba con otro término de búsqueda."
              : "Asigna una actividad a una empresa desde Empresas o desde la Biblioteca."}
          </p>
        </div>
      )}

      <DealGrid storageKey={INTRO_KEY}>
        {missions.map((m) => (
          <div key={m.id} className="ticket-slot">
            <div className="ticket" style={{ padding: 18, display: "flex", flexDirection: "column", gap: 12 }}>
              <Link
                href={`/admin/actividades/${m.id}`}
                style={{ display: "flex", flexDirection: "column", gap: 12, color: "inherit", textDecoration: "none", flex: 1 }}
              >
                <FlapText text={m.tag} style={{ alignSelf: "flex-start", fontSize: 12 }} />
                <h3 style={{ ...calSans, fontSize: 17, margin: 0, color: colors.ink }}>{m.title}</h3>
                <div style={{ display: "flex", gap: 14, fontSize: 12.5, color: colors.muted }}>
                  <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
                    <GridIcon />
                    {m.groupsCount} grupos
                  </span>
                  <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
                    <UsersIcon />
                    {m.totalParticipantes} participantes
                  </span>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: "auto" }}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      fontSize: 11.5,
                      color: colors.muted,
                      fontWeight: 600,
                    }}
                  >
                    <span>Avance promedio</span>
                    <FlapText text={`${m.avgAvance}%`} style={{ fontSize: 11 }} />
                  </div>
                  <div style={{ height: 7, background: colors.accentTint, borderRadius: 8, overflow: "hidden" }}>
                    <div
                      data-bar={m.avgAvance}
                      style={{
                        height: "100%",
                        background: colors.buttonGradient,
                        borderRadius: 8,
                        width: `${m.avgAvance}%`,
                      }}
                    />
                  </div>
                </div>
              </Link>
              <div className="ticket-perf">
                <Link
                  href={`/admin/actividades/${m.id}`}
                  className="btn-text"
                  style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12.5, fontWeight: 700, color: colors.accent }}
                >
                  Ver detalle
                  <ArrowRightIcon />
                </Link>
              </div>
            </div>
          </div>
        ))}
      </DealGrid>
    </div>
  );
}
