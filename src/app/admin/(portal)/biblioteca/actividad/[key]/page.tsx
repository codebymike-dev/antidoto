import Link from "next/link";
import { notFound } from "next/navigation";
import { currentUser } from "@/lib/auth";
import { listLibrary } from "@/lib/experience-data";
import { getExperienceActivity } from "@/lib/experiences/catalog";
import { colors, calSans } from "@/lib/theme";
import { filledButton, secondaryButton } from "@/lib/styles";
import { ArrowRightIcon } from "@/components/icons";
import SceneThumb from "@/components/experience/SceneThumb";
import DealGrid from "@/components/motion/DealGrid";
import {
  cardBody,
  cardDescription,
  cardFooter,
  cardShell,
  cardStats,
  libraryGrid,
  statLink,
  tagChip,
  textLink,
  ThumbNote,
  TypeChip,
} from "@/components/admin/LibraryCard";

export const dynamic = "force-dynamic";

/** Una actividad de escenas con todas sus estaciones: se asigna y se juega completa con un código. */
export default async function ActividadPage({ params }: { params: Promise<{ key: string }> }) {
  const user = (await currentUser())!;
  const isSuper = user.role === "super";
  const { key } = await params;
  const activity = getExperienceActivity(key);
  if (!activity) notFound();

  const items = await listLibrary(user);
  const usage = items.find((i) => i.def.key === activity.key)!;
  const risks = activity.stations.reduce((n, s) => n + s.risks.length, 0);
  const participantes = usage.participantes === 1 ? "1 participante" : `${usage.participantes} participantes`;

  return (
    <div>
      <Link href="/admin/biblioteca" style={{ fontSize: 13, color: colors.accentDark, fontWeight: 600 }}>
        ‹ Biblioteca
      </Link>
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: 20,
          flexWrap: "wrap",
          margin: "14px 0 22px",
        }}
      >
        <div style={{ maxWidth: 640, display: "flex", flexDirection: "column", gap: 8 }}>
          <span style={tagChip}>{activity.tag}</span>
          <h1 style={{ ...calSans, fontSize: 28, margin: 0, color: colors.ink }}>{activity.name}</h1>
          <p style={{ fontSize: 14, color: colors.muted, margin: 0, lineHeight: 1.5 }}>{activity.description}</p>
          <div style={{ ...cardStats, fontSize: 13 }}>
            <span>Escena interactiva</span>
            <span>{activity.stations.length} estaciones</span>
            <span>{risks} riesgos</span>
            {usage.missionId ? (
              <Link href={`/admin/actividades/${usage.missionId}`} className="btn-text" title="Ver resultados" style={statLink}>
                {participantes}
                <ArrowRightIcon />
              </Link>
            ) : (
              <span>{participantes}</span>
            )}
          </div>
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <Link
            href={`/admin/escena/${activity.key}`}
            className="btn-secondary"
            style={{ ...secondaryButton, display: "inline-flex", alignItems: "center" }}
          >
            Probar desde el inicio
          </Link>
          {isSuper && (
            <Link
              href={`/admin/asignar?actividad=${activity.key}`}
              className="btn-filled"
              style={{ ...filledButton, display: "inline-flex", alignItems: "center" }}
            >
              Asignar a una empresa
            </Link>
          )}
        </div>
      </div>

      <h2 style={{ ...calSans, fontSize: 19, margin: "0 0 4px 0", color: colors.ink }}>Estaciones</h2>
      <p style={{ fontSize: 13.5, color: colors.muted, margin: "0 0 16px 0" }}>
        Se juegan en orden con el mismo código: al terminar una se abre la siguiente.
      </p>

      <DealGrid storageKey="antidoto:actividad-estaciones" className="" style={libraryGrid}>
        {activity.stations.map((def) => {
          const edited = items.find((i) => i.def.key === def.key)?.edited ?? 0;
          return (
            <article key={def.key} className="mission-card-link" style={cardShell}>
              <Link href={`/admin/escena/${def.key}`} aria-label={`Probar ${def.title}`} style={{ position: "relative", display: "block" }}>
                <SceneThumb scene={def.scene} label={`Escena de ${def.title}`} />
                <TypeChip type="escenas" />
                <ThumbNote>Estación {def.station}</ThumbNote>
              </Link>
              <div style={cardBody}>
                <h3 style={{ ...calSans, fontSize: 18, margin: 0, color: colors.ink }}>
                  {def.station} · {def.title}
                </h3>
                <p style={cardDescription}>{def.description}</p>
                <div style={cardStats}>
                  <span>{def.risks.length} riesgos</span>
                  <span>{def.minutes}</span>
                  {edited > 0 && <span style={{ color: colors.accentDark, fontWeight: 600 }}>{edited} textos editados</span>}
                </div>
                <div style={cardFooter}>
                  <Link
                    href={`/admin/escena/${def.key}`}
                    className="btn-secondary"
                    style={{ ...secondaryButton, height: 36, display: "inline-flex", alignItems: "center" }}
                  >
                    Probar
                  </Link>
                  <Link href={`/admin/biblioteca/${def.key}`} className="btn-text" style={textLink}>
                    {isSuper ? "Editar textos" : "Ver riesgos"}
                    <ArrowRightIcon />
                  </Link>
                </div>
              </div>
            </article>
          );
        })}
      </DealGrid>
    </div>
  );
}
