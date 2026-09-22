import Link from "next/link";
import { notFound } from "next/navigation";
import { currentUser } from "@/lib/auth";
import { getMission, listGroups, getTrend, listParticipants } from "@/lib/queries";
import { colors, calSans } from "@/lib/theme";
import { filledButton, secondaryButton, card, tabButton, tabButtonActive } from "@/lib/styles";
import { trendToPoints } from "@/lib/utils";
import GroupsTable from "@/components/admin/GroupsTable";
import type { Estado } from "@/lib/types";

export const dynamic = "force-dynamic";

const ESTADOS: ("todos" | Estado)[] = ["todos", "activo", "pausado", "vencido"];

export default async function DetallePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ q?: string; estado?: string }>;
}) {
  const { id } = await params;
  const { q = "", estado = "todos" } = await searchParams;
  const user = (await currentUser())!;

  const mission = await getMission(id);
  if (!mission) notFound();

  const allGroups = await listGroups(id, user);
  // Un admin de empresa sin códigos en esta misión no debe ver ni su metadata.
  if (user.role === "empresa" && allGroups.length === 0) notFound();

  const trend = await getTrend(id, user);

  const groups = allGroups.filter(
    (g) =>
      (estado === "todos" || g.estado === estado) &&
      (!q.trim() || g.empresa.toLowerCase().includes(q.trim().toLowerCase()))
  );

  // La muestra de participantes se carga por grupo para la fila expandible.
  const withParticipants = await Promise.all(
    groups.map(async (g) => ({ ...g, participantsPreview: await listParticipants(g.id) }))
  );

  const totalParticipantes = allGroups.reduce((a, g) => a + g.participantes, 0);
  const avgAvance = allGroups.length
    ? Math.round(allGroups.reduce((a, g) => a + g.avance, 0) / allGroups.length)
    : 0;

  const exportQuery = new URLSearchParams({ q, estado }).toString();

  return (
    <div>
      <Link href="/admin" style={{ fontSize: 13, color: colors.accentDark, fontWeight: 600 }}>
        ‹ Actividades
      </Link>
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: 20,
          flexWrap: "wrap",
          margin: "14px 0 20px 0",
        }}
      >
        <div>
          <span style={{ fontSize: 11.5, fontWeight: 700, color: colors.accent, letterSpacing: 1 }}>
            {mission.tag}
          </span>
          <h1 style={{ ...calSans, fontSize: 26, margin: "4px 0 6px 0", color: colors.ink }}>{mission.title}</h1>
          <p style={{ fontSize: 14, color: colors.muted, margin: 0, maxWidth: 520 }}>{mission.description}</p>
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <
            href={`/admin/actividades/${id}/export?${exportQuery}`}
            className="btn-secondary"
            style={{ ...secondaryButton, display: "inline-flex", alignItems: "center" }}
          >
            Exportar CSV
          </a>
          <Link
            href={`/admin/config?mission=${id}`}
            className="btn-filled"
            style={{ ...filledButton, padding: "0 18px", fontSize: 13.5, display: "inline-flex", alignItems: "center" }}
          >
            ＋ Nuevo código
          </Link>
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
          gap: 16,
          marginBottom: 22,
        }}
      >
        <div style={{ ...card, padding: "18px 20px" }}>
          <div style={statLabel}>Participantes</div>
          <div style={statValue}>{totalParticipantes}</div>
        </div>
        <div style={{ ...card, padding: "18px 20px" }}>
          <div style={statLabel}>Avance promedio</div>
          <div style={statValue}>{avgAvance}%</div>
        </div>
        <div style={{ ...card, padding: "18px 20px" }}>
          <div style={statLabel}>Grupos activos</div>
          <div style={statValue}>{allGroups.length}</div>
        </div>
        <div style={{ ...card, padding: "18px 20px" }}>
          <div style={{ ...statLabel, marginBottom: 8 }}>Tendencia · 6 semanas</div>
          <svg width="140" height="40" viewBox="0 0 140 40" style={{ display: "block" }} role="img" aria-label="Tendencia de avance">
            <polyline
              points={trendToPoints(trend)}
              fill="none"
              stroke={colors.accent}
              strokeWidth={2.5}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
      </div>

      <form style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center", marginBottom: 14 }}>
        <input
          name="q"
          defaultValue={q}
          placeholder="Buscar empresa o grupo..."
          aria-label="Buscar empresa o grupo"
          style={{
            height: 40,
            borderRadius: 10,
            border: `1.5px solid ${colors.border}`,
            padding: "0 12px",
            fontSize: 13.5,
            minWidth: 220,
            flex: 1,
          }}
        />
        {ESTADOS.map((value) => (
          <Link
            key={value}
            href={`/admin/actividades/${id}?${new URLSearchParams({ q, estado: value })}`}
            className={estado === value ? "btn-tab-active" : "btn-tab"}
            style={{
              ...(estado === value ? tabButtonActive : tabButton),
              fontSize: 12.5,
              color: estado === value ? colors.accentDark : colors.muted,
            }}
          >
            {value === "todos" ? "Todos" : value.charAt(0).toUpperCase() + value.slice(1)}
          </Link>
        ))}
      </form>

      <GroupsTable groups={withParticipants} />
    </div>
  );
}

const statLabel = {
  fontSize: 12,
  color: colors.muted,
  fontWeight: 600 as const,
  textTransform: "uppercase" as const,
  letterSpacing: 0.4,
};

const statValue = { ...calSans, fontSize: 26, color: colors.ink, marginTop: 4 };
