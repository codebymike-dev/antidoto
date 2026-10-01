import Link from "next/link";
import { currentUser } from "@/lib/auth";
import { listLibrary } from "@/lib/experience-data";
import { experienceActivities } from "@/lib/experiences/catalog";
import { listGames } from "@/lib/live-games";
import { createGame, launchMatch } from "@/lib/live-games-actions";
import { canEditGame } from "@/lib/scope";
import { colors, calSans } from "@/lib/theme";
import { card, filledButton, secondaryButton, tabButton, tabButtonActive } from "@/lib/styles";
import { ArrowRightIcon, PlayIcon } from "@/components/icons";
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
  type ActivityType,
} from "@/components/admin/LibraryCard";

export const dynamic = "force-dynamic";

export default async function BibliotecaPage({ searchParams }: { searchParams: Promise<{ tipo?: string }> }) {
  const user = (await currentUser())!;
  const isSuper = user.role === "super";
  const { tipo } = await searchParams;
  const filter: ActivityType | null = tipo === "escenas" || tipo === "juegos" ? tipo : null;
  const show = (t: ActivityType) => filter === null || filter === t;

  const [items, games] = await Promise.all([listLibrary(user), listGames(user, false)]);
  // Una tarjeta por actividad: las estaciones de una serie son partes de la misma.
  const activities = experienceActivities().map((a) => ({ ...a, usage: items.find((i) => i.def.key === a.key)! }));
  const empty = (filter === "juegos" || activities.length === 0) && games.length === 0;

  return (
    <div>
      <div style={{ marginBottom: 18 }}>
        <h1 style={{ ...calSans, fontSize: 28, margin: "0 0 4px 0", color: colors.ink }}>Biblioteca</h1>
        <p style={{ fontSize: 14, color: colors.muted, margin: 0, maxWidth: 640 }}>
          Todas las actividades en un solo lugar. Las escenas interactivas se juegan a su ritmo, cada participante encuentra
          los errores y aprende la forma correcta; los juegos en vivo se proyectan en sala y se responden desde el celular.
        </p>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", marginBottom: 22 }}>
        {[
          { label: "Todas", on: filter === null, href: "/admin/biblioteca", count: activities.length + games.length },
          { label: "Escenas interactivas", on: filter === "escenas", href: "/admin/biblioteca?tipo=escenas", count: activities.length },
          { label: "Juegos en vivo", on: filter === "juegos", href: "/admin/biblioteca?tipo=juegos", count: games.length },
        ].map((t) => (
          <Link key={t.label} href={t.href} className={t.on ? "btn-tab-active" : "btn-tab"} style={t.on ? tabButtonActive : tabButton}>
            {t.label} <span style={{ opacity: 0.6, fontWeight: 500 }}>{t.count}</span>
          </Link>
        ))}
        <div style={{ flex: 1 }} />
        <form action={createGame}>
          <button type="submit" className="btn-filled" style={{ ...filledButton, height: 36, padding: "0 14px", fontSize: 13 }}>
            ＋ Nuevo juego en vivo
          </button>
        </form>
      </div>

      {empty && (
        <p style={{ ...card, fontSize: 13.5, color: colors.muted, margin: 0 }}>
          Aún no hay juegos en vivo. Crea uno con quiz, verdadero o falso, encuestas o nube de palabras.
        </p>
      )}

      <DealGrid storageKey="antidoto:biblioteca-vista" className="" style={libraryGrid}>
        {show("escenas") &&
          activities.map(({ key, name, description, tag, stations, usage }) => {
            const risks = stations.reduce((n, s) => n + s.risks.length, 0);
            return (
              <article key={key} className="mission-card-link" style={cardShell}>
                <Link href={`/admin/biblioteca/actividad/${key}`} aria-label={`Abrir ${name}`} style={{ position: "relative", display: "block" }}>
                  <SceneThumb scene={stations[0].scene} label={`Escena de ${name}`} />
                  <TypeChip type="escenas" />
                  <ThumbNote>{stations.length === 1 ? "1 escena" : `${stations.length} estaciones`}</ThumbNote>
                </Link>
                <div style={cardBody}>
                  <span style={tagChip}>{tag}</span>
                  <h3 style={{ ...calSans, fontSize: 18, margin: 0, color: colors.ink }}>{name}</h3>
                  <p style={cardDescription}>{description}</p>
                  <div style={cardStats}>
                    <span>{stations.length} estaciones</span>
                    <span>{risks} riesgos</span>
                    {usage.missionId ? (
                      <Link href={`/admin/actividades/${usage.missionId}`} className="btn-text" title="Ver resultados" style={statLink}>
                        {usage.participantes === 1 ? "1 participante" : `${usage.participantes} participantes`}
                        <ArrowRightIcon />
                      </Link>
                    ) : (
                      <span>{usage.participantes === 1 ? "1 participante" : `${usage.participantes} participantes`}</span>
                    )}
                  </div>
                  <div style={cardFooter}>
                    <Link
                      href={`/admin/biblioteca/actividad/${key}`}
                      className="btn-secondary"
                      style={{ ...secondaryButton, height: 36, display: "inline-flex", alignItems: "center" }}
                    >
                      Ver estaciones
                    </Link>
                    {isSuper && (
                      <Link
                        href={`/admin/asignar?actividad=${key}`}
                        className="btn-filled"
                        title="Asignar a una empresa"
                        style={{ ...filledButton, height: 36, padding: "0 14px", fontSize: 13, display: "inline-flex", alignItems: "center" }}
                      >
                        Asignar
                      </Link>
                    )}
                  </div>
                </div>
              </article>
            );
          })}

        {show("juegos") &&
          games.map((g) => {
            const editable = canEditGame(user.role, user.company_id, g.company_id);
            return (
              <article key={`juego-${g.id}`} className="mission-card-link" style={cardShell}>
                <Link href={`/admin/juegos/${g.id}`} aria-label={`Abrir ${g.title}`} style={{ position: "relative", display: "block" }}>
                  <GameThumb />
                  <TypeChip type="juegos" />
                  <ThumbNote>{g.questions === 1 ? "1 pregunta" : `${g.questions} preguntas`}</ThumbNote>
                </Link>
                <div style={cardBody}>
                  <span style={tagChip}>{g.company_id === null ? "GLOBAL" : g.company_name?.toUpperCase()}</span>
                  <h3 style={{ ...calSans, fontSize: 18, margin: 0, color: colors.ink }}>{g.title}</h3>
                  <p style={cardDescription}>{g.description || "Sin descripción."}</p>
                  <div style={cardStats}>
                    <span>{g.questions === 1 ? "1 pregunta" : `${g.questions} preguntas`}</span>
                    <span>{g.matches === 1 ? "1 partida" : `${g.matches} partidas`}</span>
                  </div>
                  <div style={cardFooter}>
                    <Link href={`/admin/juegos/${g.id}`} className="btn-text" style={textLink}>
                      {editable && g.matches === 0 ? "Editar preguntas" : "Ver juego"}
                      <ArrowRightIcon />
                    </Link>
                    <div style={{ flex: 1 }} />
                    {g.questions > 0 && (
                      <form action={launchMatch}>
                        <input type="hidden" name="id" value={g.id} />
                        <button type="submit" className="btn-filled" style={{ ...filledButton, height: 36, padding: "0 14px", fontSize: 13 }}>
                          ▸ Jugar
                        </button>
                      </form>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
      </DealGrid>
    </div>
  );
}

/** Portada de un juego en vivo: no tiene escena, así que se dibuja una pantalla de proyector. */
function GameThumb() {
  return (
    <div
      style={{
        aspectRatio: "400 / 250",
        background: `radial-gradient(circle at 70% 20%, ${colors.accent} 0%, transparent 55%), linear-gradient(150deg, ${colors.accentDark}, ${colors.ink})`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "#fff",
      }}
    >
      <span
        style={{
          width: 64,
          height: 64,
          borderRadius: 999,
          background: "rgba(255,255,255,0.12)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          transform: "scale(1.6)",
        }}
      >
        <PlayIcon />
      </span>
    </div>
  );
}
