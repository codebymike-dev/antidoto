import Link from "next/link";
import { notFound } from "next/navigation";
import { currentUser } from "@/lib/auth";
import { getTeamMode } from "@/lib/bricks/team";
import { recentSessions } from "@/lib/brick-session";
import { colors, calSans } from "@/lib/theme";
import { card } from "@/lib/styles";
import BuildThumb from "@/components/bricks/BuildThumb";
import TeamLaunchForm from "@/components/admin/TeamLaunchForm";
import { tagChip } from "@/components/admin/LibraryCard";

export const dynamic = "force-dynamic";

const STATUS = { lobby: "Esperando gente", building: "Construyendo", finished: "Terminada" } as const;

/** Un modo de construcción en equipo: cómo funciona, abrir una sala y las últimas sesiones. */
export default async function ModoEquipoPage({ params }: { params: Promise<{ mode: string }> }) {
  const user = (await currentUser())!;
  const mode = getTeamMode((await params).mode);
  if (!mode) notFound();
  const sessions = (await recentSessions(user, 10)).filter((s) => s.mode === mode.key);

  return (
    <div>
      <Link href="/admin/biblioteca?tipo=construccion" style={{ fontSize: 13, color: colors.accentDark, fontWeight: 600 }}>
        ‹ Biblioteca
      </Link>
      <div style={{ maxWidth: 680, display: "flex", flexDirection: "column", gap: 8, margin: "14px 0 22px" }}>
        <span style={tagChip}>{mode.tag}</span>
        <h1 style={{ ...calSans, fontSize: 28, margin: 0, color: colors.ink }}>{mode.title}</h1>
        <p style={{ fontSize: 14, color: colors.muted, margin: 0, lineHeight: 1.5 }}>{mode.description}</p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 18, alignItems: "start" }}>
        <section style={{ ...card, padding: 0, overflow: "hidden" }} aria-label="Cómo se juega">
          <BuildThumb kind={mode.key === "torre-equipos" ? "presupuesto" : "tema"} label={`Ladrillos de ${mode.title}`} />
          <div style={{ padding: 18, display: "flex", flexDirection: "column", gap: 10, fontSize: 14, lineHeight: 1.55, color: colors.inkSoft }}>
            <p style={{ margin: 0 }}>
              <b style={{ color: colors.ink }}>Lo que lee cada equipo:</b> {mode.prompt}
            </p>
            <p style={{ margin: 0 }}>
              El proyector muestra el PIN y el QR; cada persona entra desde su celular en <b>/construir</b>. Mientras construyen, el
              proyector muestra todas las obras creciendo en vivo{mode.key === "torre-equipos" ? " y quién va más alto" : ""}; al final, un
              recorrido por cada una.
            </p>
          </div>
        </section>

        <section style={{ ...card, padding: 22 }} aria-labelledby="abrir-sala">
          <h2 id="abrir-sala" style={{ ...calSans, fontSize: 19, margin: "0 0 16px", color: colors.ink }}>
            Abrir una sala
          </h2>
          <TeamLaunchForm mode={mode.key} times={mode.times} />
        </section>
      </div>

      {sessions.length > 0 && (
        <section style={{ ...card, padding: 20, marginTop: 18 }} aria-labelledby="sesiones">
          <h2 id="sesiones" style={{ ...calSans, fontSize: 18, margin: "0 0 12px", color: colors.ink }}>
            Últimas sesiones
          </h2>
          <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 8 }}>
            {sessions.map((s) => (
              <li key={s.id} style={{ display: "flex", gap: 14, alignItems: "center", flexWrap: "wrap", fontSize: 14 }}>
                <span style={{ fontWeight: 700, color: colors.ink, fontVariantNumeric: "tabular-nums" }}>PIN {s.pin}</span>
                <span style={{ color: colors.muted }}>{STATUS[s.status]}</span>
                <span style={{ color: colors.muted }}>{s.players === 1 ? "1 persona" : `${s.players} personas`}</span>
                <Link href={`/admin/equipos/${s.id}`} style={{ fontWeight: 700, color: colors.accent }}>
                  {s.status === "finished" ? "Ver obras ›" : "Volver a la sala ›"}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
