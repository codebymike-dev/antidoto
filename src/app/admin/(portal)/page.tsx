import Link from "next/link";
import { currentUser } from "@/lib/auth";
import { listMissions } from "@/lib/queries";
import { duplicateMission } from "@/lib/actions";
import { colors, calSans } from "@/lib/theme";
import { filledButton, cardAccent } from "@/lib/styles";

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
        <Link href="/admin/config" style={{ ...filledButton, display: "inline-flex", alignItems: "center" }}>
          ＋ Nueva actividad
        </Link>
      </div>

      <form style={{ marginBottom: 20 }}>
        <input
          name="q"
          defaultValue={q}
          placeholder="Buscar actividad..."
          aria-label="Buscar actividad"
          style={{
            height: 42,
            borderRadius: 10,
            border: `1.5px solid ${colors.border}`,
            padding: "0 14px",
            fontSize: 13.5,
            maxWidth: 280,
            display: "block",
            width: "100%",
          }}
        />
      </form>

      {missions.length === 0 && (
        <p style={{ fontSize: 14, color: colors.muted }}>
          No hay actividades que coincidan. Crea un código desde Configuración para empezar.
        </p>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 20 }}>
        {missions.map((m) => (
          <div key={m.id} style={cardAccent}>
            <Link
              href={`/admin/actividades/${m.id}`}
              style={{ display: "flex", flexDirection: "column", gap: 14, color: "inherit" }}
            >
              <span style={{ fontSize: 11.5, fontWeight: 700, color: colors.accent, letterSpacing: 1 }}>{m.tag}</span>
              <h3 style={{ ...calSans, fontSize: 19, margin: 0, color: colors.ink }}>{m.title}</h3>
              <div style={{ display: "flex", gap: 16, fontSize: 13, color: colors.muted }}>
                <span>{m.groupsCount} grupos</span>
                <span>{m.totalParticipantes} participantes</span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    fontSize: 12.5,
                    color: colors.accentDark,
                    fontWeight: 600,
                  }}
                >
                  <span>Avance promedio</span>
                  <span>{m.avgAvance}%</span>
                </div>
                <div style={{ height: 8, background: colors.accentTint, borderRadius: 8, overflow: "hidden" }}>
                  <div
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
            {user.role === "super" && (
              <form
                action={duplicateMission}
                style={{ display: "flex", gap: 12, fontSize: 12, borderTop: "1px solid #F1FAFD", paddingTop: 12, marginTop: 14 }}
              >
                <input type="hidden" name="missionId" value={m.id} />
                <button
                  type="submit"
                  style={{ background: "none", border: "none", cursor: "pointer", color: colors.muted, fontWeight: 600, fontSize: 12, padding: 0 }}
                >
                  Duplicar
                </button>
              </form>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
