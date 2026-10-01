import Link from "next/link";
import type { ReactNode } from "react";
import { currentUser } from "@/lib/auth";
import { listLibrary } from "@/lib/experience-data";
import { listGames } from "@/lib/live-games";
import { createGame, launchMatch } from "@/lib/live-games-actions";
import { canEditGame } from "@/lib/scope";
import { colors, calSans } from "@/lib/theme";
import { card, filledButton, secondaryButton, tabButton, tabButtonActive } from "@/lib/styles";
import { ArrowRightIcon, PlayIcon } from "@/components/icons";
import SceneThumb from "@/components/experience/SceneThumb";
import DealGrid from "@/components/motion/DealGrid";

export const dynamic = "force-dynamic";

/** Tipos de actividad que viven en la biblioteca. Cada tarjeta lleva la etiqueta del suyo. */
const TYPES = {
  escenas: { label: "Escena interactiva", dot: colors.accentLight },
  juegos: { label: "Juego en vivo", dot: "#FF5A4E" },
} as const;
type ActivityType = keyof typeof TYPES;

export default async function BibliotecaPage({ searchParams }: { searchParams: Promise<{ tipo?: string }> }) {
  const user = (await currentUser())!;
  const isSuper = user.role === "super";
  const { tipo } = await searchParams;
  const filter: ActivityType | null = tipo === "escenas" || tipo === "juegos" ? tipo : null;
  const show = (t: ActivityType) => filter === null || filter === t;

  const [items, games] = await Promise.all([listLibrary(user), listGames(user, false)]);
  const series = [...new Set(items.map((i) => i.def.series))];

  return (
    <div>
      <div style={{ marginBottom: 18 }}>
        <h1 style={{ ...calSans, fontSize: 28, margin: "0 0 4px 0", color: colors.ink }}>Biblioteca</h1>
        <p style={{ fontSize: 14, color: colors.muted, margin: 0, maxWidth: 640 }}>
          Todas las actividades en un solo lugar. Las escenas interactivas se juegan a su ritmo, cada participante encuentra
          los errores y aprende la forma correcta; los juegos en vivo se proyectan en sala y se responden desde el celular.
        </p>
      </div>

      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 22 }}>
        {[
          { label: "Todas", on: filter === null, href: "/admin/biblioteca", count: items.length + games.length },
          { label: "Escenas interactivas", on: filter === "escenas", href: "/admin/biblioteca?tipo=escenas", count: items.length },
          { label: "Juegos en vivo", on: filter === "juegos", href: "/admin/biblioteca?tipo=juegos", count: games.length },
        ].map((t) => (
          <Link key={t.label} href={t.href} className={t.on ? "btn-tab-active" : "btn-tab"} style={t.on ? tabButtonActive : tabButton}>
            {t.label} <span style={{ opacity: 0.6, fontWeight: 500 }}>{t.count}</span>
          </Link>
        ))}
      </div>

      {show("escenas") &&
        series.map((name) => (
          <section key={name} style={{ marginBottom: 32 }}>
            <SectionHeader title={name}>
              De la finca a la taza, una estación por cada eslabón. Se juega completa con un solo código.
            </SectionHeader>
            <DealGrid storageKey="antidoto:biblioteca-vista" className="" style={grid}>
              {items
                .filter((i) => i.def.series === name)
                .map(({ def, missionId, participantes, edited }) => (
                  <article key={def.key} className="mission-card-link" style={cardShell}>
                    <Link href={`/admin/escena/${def.key}`} aria-label={`Probar ${def.title}`} style={{ position: "relative", display: "block" }}>
                      <SceneThumb scene={def.scene} label={`Escena de ${def.title}`} />
                      <TypeChip type="escenas" />
                    </Link>
                    <div style={cardBody}>
                      <span style={tagChip}>{def.tag}</span>
                      <h3 style={{ ...calSans, fontSize: 18, margin: 0, color: colors.ink }}>
                        Estación {def.station} · {def.title}
                      </h3>
                      <p style={{ fontSize: 13, color: colors.muted, margin: 0, lineHeight: 1.5 }}>{def.description}</p>
                      <div style={stats}>
                        <span>{def.risks.length} riesgos</span>
                        <span>{def.minutes}</span>
                        <span>{participantes === 1 ? "1 participante" : `${participantes} participantes`}</span>
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
                        <div style={{ flex: 1 }} />
                        {missionId && (
                          <Link
                            href={`/admin/actividades/${missionId}`}
                            className="btn-text"
                            style={{ fontSize: 13, fontWeight: 600, color: colors.muted }}
                          >
                            Resultados
                          </Link>
                        )}
                        {isSuper && def.station > 1 && (
                          <span style={{ fontSize: 12, color: colors.muted, maxWidth: 150, lineHeight: 1.35 }}>
                            Se juega con el código de la estación 1, al terminarla.
                          </span>
                        )}
                        {isSuper && def.station === 1 && (
                          <Link
                            href={`/admin/asignar?actividad=${def.key}`}
                            className="btn-filled"
                            style={{ ...filledButton, height: 36, padding: "0 14px", fontSize: 13, display: "inline-flex", alignItems: "center" }}
                          >
                            Asignar a una empresa
                          </Link>
                        )}
                      </div>
                    </div>
                  </article>
                ))}
            </DealGrid>
          </section>
        ))}

      {show("juegos") && (
        <section style={{ marginBottom: 32 }}>
          <SectionHeader
            title="Juegos en vivo"
            action={
              <Link href="/admin/juegos" className="btn-text" style={textLink}>
                Gestionar juegos
                <ArrowRightIcon />
              </Link>
            }
          >
            Sets de preguntas para jugar en tiempo real, con proyector y celulares.
          </SectionHeader>

          {games.length === 0 ? (
            <div style={{ ...card, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
              <p style={{ fontSize: 13.5, color: colors.muted, margin: 0 }}>
                Aún no hay juegos en vivo. Crea uno con quiz, verdadero o falso, encuestas o nube de palabras.
              </p>
              <form action={createGame}>
                <button type="submit" className="btn-filled" style={{ ...filledButton, height: 36, padding: "0 14px", fontSize: 13 }}>
                  ＋ Nuevo juego
                </button>
              </form>
            </div>
          ) : (
            <DealGrid storageKey="antidoto:biblioteca-juegos" className="" style={grid}>
              {games.map((g) => {
                const editable = canEditGame(user.role, user.company_id, g.company_id);
                return (
                  <article key={g.id} className="mission-card-link" style={cardShell}>
                    <Link href={`/admin/juegos/${g.id}`} aria-label={`Abrir ${g.title}`} style={{ position: "relative", display: "block" }}>
                      <GameThumb questions={g.questions} />
                      <TypeChip type="juegos" />
                    </Link>
                    <div style={cardBody}>
                      <span style={tagChip}>{g.company_id === null ? "GLOBAL" : g.company_name?.toUpperCase()}</span>
                      <h3 style={{ ...calSans, fontSize: 18, margin: 0, color: colors.ink }}>{g.title}</h3>
                      {g.description && (
                        <p
                          style={{
                            fontSize: 13,
                            color: colors.muted,
                            margin: 0,
                            lineHeight: 1.5,
                            display: "-webkit-box",
                            WebkitLineClamp: 3,
                            WebkitBoxOrient: "vertical",
                            overflow: "hidden",
                          }}
                        >
                          {g.description}
                        </p>
                      )}
                      <div style={stats}>
                        <span>{g.questions === 1 ? "1 pregunta" : `${g.questions} preguntas`}</span>
                        <span>{g.matches === 1 ? "1 partida" : `${g.matches} partidas`}</span>
                      </div>
                      <div style={cardFooter}>
                        {g.questions > 0 && (
                          <form action={launchMatch}>
                            <input type="hidden" name="id" value={g.id} />
                            <button
                              type="submit"
                              className="btn-filled"
                              style={{ ...filledButton, height: 36, padding: "0 14px", fontSize: 13 }}
                            >
                              ▸ Jugar
                            </button>
                          </form>
                        )}
                        <Link href={`/admin/juegos/${g.id}`} className="btn-text" style={textLink}>
                          {editable && g.matches === 0 ? "Editar preguntas" : "Ver juego"}
                          <ArrowRightIcon />
                        </Link>
                      </div>
                    </div>
                  </article>
                );
              })}
            </DealGrid>
          )}
        </section>
      )}
    </div>
  );
}

function SectionHeader({ title, action, children }: { title: string; action?: ReactNode; children: ReactNode }) {
  return (
    <div style={{ display: "flex", alignItems: "baseline", gap: 10, flexWrap: "wrap", marginBottom: 12 }}>
      <h2 style={{ ...calSans, fontSize: 19, margin: 0, color: colors.ink }}>{title}</h2>
      <span style={{ fontSize: 12.5, color: colors.muted }}>{children}</span>
      {action && <span style={{ marginLeft: "auto" }}>{action}</span>}
    </div>
  );
}

/** Etiqueta del tipo de actividad, sobre la miniatura de la tarjeta. */
function TypeChip({ type }: { type: ActivityType }) {
  const t = TYPES[type];
  return (
    <span style={thumbChip}>
      <span aria-hidden style={{ width: 8, height: 8, borderRadius: 999, background: t.dot, boxShadow: `0 0 0 3px ${t.dot}33` }} />
      {t.label}
    </span>
  );
}

/** Portada de un juego en vivo: no tiene escena, así que se dibuja una pantalla de proyector. */
function GameThumb({ questions }: { questions: number }) {
  return (
    <div
      style={{
        aspectRatio: "400 / 250",
        background: `radial-gradient(circle at 70% 20%, ${colors.accent} 0%, transparent 55%), linear-gradient(150deg, ${colors.accentDark}, ${colors.ink})`,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 10,
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
      <span style={{ fontSize: 12, fontWeight: 600, opacity: 0.8, marginTop: 14 }}>
        {questions === 1 ? "1 pregunta" : `${questions} preguntas`} · proyector y celulares
      </span>
    </div>
  );
}

const grid = { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 18 };

const cardShell = { ...card, padding: 0, overflow: "hidden", display: "flex", flexDirection: "column" as const };

const cardBody = { padding: 18, display: "flex", flexDirection: "column" as const, gap: 10, flex: 1 };

const stats = { display: "flex", gap: 14, flexWrap: "wrap" as const, fontSize: 12.5, color: colors.muted };

const cardFooter = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  flexWrap: "wrap" as const,
  marginTop: "auto",
  paddingTop: 12,
  borderTop: `1px solid ${colors.accentTint}`,
};

const textLink = {
  display: "inline-flex",
  alignItems: "center",
  gap: 4,
  fontSize: 13,
  fontWeight: 700,
  color: colors.accent,
};

const tagChip = {
  alignSelf: "flex-start" as const,
  fontSize: 10.5,
  fontWeight: 700,
  color: colors.accentDark,
  letterSpacing: 0.5,
  background: colors.accentTint,
  padding: "4px 10px",
  borderRadius: 999,
};

const thumbChip = {
  position: "absolute" as const,
  left: 10,
  top: 10,
  display: "inline-flex",
  alignItems: "center",
  gap: 8,
  padding: "5px 10px",
  borderRadius: 8,
  background: "rgba(15,24,29,0.85)",
  color: "#fff",
  fontSize: 12,
  fontWeight: 600,
};
