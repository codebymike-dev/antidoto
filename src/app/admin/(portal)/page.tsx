import Link from "next/link";
import { currentUser } from "@/lib/auth";
import { listMissions } from "@/lib/queries";
import { duplicateMission } from "@/lib/actions";
import { colors, calSans } from "@/lib/theme";
import { filledButton, card } from "@/lib/styles";
import { SearchIcon, UsersIcon, GridIcon, CopyIcon, ArrowRightIcon, InboxIcon } from "@/components/icons";

export const dynamic = "force-dynamic";

export default async function ActividadesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const user = (await currentUser())!;
  const { q = "" } = await searchParams;
  const missions = await listMissions(user, q);

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
        <Link
          href="/admin/config"
          className="btn-filled"
          style={{ ...filledButton, display: "inline-flex", alignItems: "center" }}
        >
          ＋ Nueva actividad
        </Link>
      </div>

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
          <div
            style={{
              width: 72,
              height: 72,
              borderRadius: 18,
              background: colors.accentTint,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: colors.accent,
            }}
          >
            <InboxIcon />
          </div>
          <h2 style={{ ...calSans, fontSize: 17, margin: 0, color: colors.ink }}>
            {q ? "No hay actividades que coincidan" : "Aún no tienes actividades"}
          </h2>
          <p style={{ fontSize: 13.5, color: colors.muted, margin: 0, lineHeight: 1.5 }}>
            {q
              ? "Probá con otro término de búsqueda o creá un código nuevo desde Configuración."
              : "Creá un código desde Configuración para poner en marcha tu primer reto o misión."}
          </p>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 18 }}>
        {missions.map((m) => (
          <div key={m.id} className="mission-card-link" style={{ ...card, padding: 18, display: "flex", flexDirection: "column", gap: 12 }}>
            <Link href={`/admin/actividades/${m.id}`} style={{ display: "flex", flexDirection: "column", gap: 12, color: "inherit" }}>
              <span
                style={{
                  alignSelf: "flex-start",
                  fontSize: 10.5,
                  fontWeight: 700,
                  color: colors.accentDark,
                  letterSpacing: 0.5,
                  background: colors.accentTint,
                  padding: "4px 10px",
                  borderRadius: 999,
                }}
              >
                {m.tag}
              </span>
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
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    fontSize: 11.5,
                    color: colors.muted,
                    fontWeight: 600,
                  }}
                >
                  <span>Avance promedio</span>
                  <span style={{ color: colors.ink, fontWeight: 700 }}>{m.avgAvance}%</span>
                </div>
                <div style={{ height: 7, background: colors.accentTint, borderRadius: 8, overflow: "hidden" }}>
                  <div
                    style={{
                      height: "100%",
                      background: colors.accentLight,
                      borderRadius: 8,
                      width: `${m.avgAvance}%`,
                    }}
                  />
                </div>
              </div>
            </Link>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                borderTop: `1px solid ${colors.accentTint}`,
                paddingTop: 12,
              }}
            >
              <Link
                href={`/admin/actividades/${m.id}`}
                className="btn-text"
                style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12.5, fontWeight: 700, color: colors.accent }}
              >
                Ver detalle
                <ArrowRightIcon />
              </Link>
              {user.role === "super" && (
                <form action={duplicateMission}>
                  <input type="hidden" name="missionId" value={m.id} />
                  <button
                    type="submit"
                    className="btn-icon"
                    aria-label="Duplicar actividad"
                    title="Duplicar actividad"
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: 8,
                      border: `1px solid ${colors.border}`,
                      background: "none",
                      cursor: "pointer",
                      color: colors.muted,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <CopyIcon />
                  </button>
                </form>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
