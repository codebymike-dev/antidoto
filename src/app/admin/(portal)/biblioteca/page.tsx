import Link from "next/link";
import { currentUser } from "@/lib/auth";
import { listLibrary } from "@/lib/experience-data";
import { adoptExperience } from "@/lib/experience-actions";
import { colors, calSans } from "@/lib/theme";
import { card, filledButton, secondaryButton } from "@/lib/styles";
import { ArrowRightIcon, PlayIcon } from "@/components/icons";
import SceneThumb from "@/components/experience/SceneThumb";

export const dynamic = "force-dynamic";

export default async function BibliotecaPage() {
  const user = (await currentUser())!;
  const isSuper = user.role === "super";
  const items = await listLibrary(user);
  const series = [...new Set(items.map((i) => i.def.series))];

  return (
    <div>
      <div style={{ marginBottom: 22 }}>
        <h1 style={{ ...calSans, fontSize: 28, margin: "0 0 4px 0", color: colors.ink }}>Biblioteca</h1>
        <p style={{ fontSize: 14, color: colors.muted, margin: 0, maxWidth: 620 }}>
          Experiencias interactivas listas para usar: escenas donde cada participante encuentra los errores y aprende la forma
          correcta.{" "}
          {isSuper ? "Asígnalas a una empresa con un código de actividad." : "Pide a Antídoto el código para tu equipo."}
        </p>
      </div>

      {series.map((name) => (
        <section key={name} style={{ marginBottom: 28 }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 12 }}>
            <h2 style={{ ...calSans, fontSize: 19, margin: 0, color: colors.ink }}>{name}</h2>
            <span style={{ fontSize: 12.5, color: colors.muted }}>De la finca a la taza, una estación por cada eslabón.</span>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 18 }}>
            {items
              .filter((i) => i.def.series === name)
              .map(({ def, missionId, participantes, edited }) => (
                <article
                  key={def.key}
                  className="mission-card-link"
                  style={{ ...card, padding: 0, overflow: "hidden", display: "flex", flexDirection: "column" }}
                >
                  <Link
                    href={`/admin/escena/${def.key}`}
                    aria-label={`Probar ${def.title}`}
                    style={{ position: "relative", display: "block" }}
                  >
                    <SceneThumb label={`Escena de ${def.title}`} />
                    <span style={thumbChip}>
                      <PlayIcon />
                      Escena interactiva
                    </span>
                  </Link>
                  <div style={{ padding: 18, display: "flex", flexDirection: "column", gap: 10, flex: 1 }}>
                    <span style={tagChip}>{def.tag}</span>
                    <h3 style={{ ...calSans, fontSize: 18, margin: 0, color: colors.ink }}>
                      Estación {def.station} · {def.title}
                    </h3>
                    <p style={{ fontSize: 13, color: colors.muted, margin: 0, lineHeight: 1.5 }}>{def.description}</p>
                    <div style={{ display: "flex", gap: 14, flexWrap: "wrap", fontSize: 12.5, color: colors.muted }}>
                      <span>{def.risks.length} riesgos</span>
                      <span>{def.minutes}</span>
                      <span>{participantes === 1 ? "1 participante" : `${participantes} participantes`}</span>
                      {edited > 0 && <span style={{ color: colors.accentDark, fontWeight: 600 }}>{edited} textos editados</span>}
                    </div>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        flexWrap: "wrap",
                        marginTop: "auto",
                        paddingTop: 12,
                        borderTop: `1px solid ${colors.accentTint}`,
                      }}
                    >
                      <Link
                        href={`/admin/escena/${def.key}`}
                        className="btn-secondary"
                        style={{ ...secondaryButton, height: 36, display: "inline-flex", alignItems: "center" }}
                      >
                        Probar
                      </Link>
                      <Link
                        href={`/admin/biblioteca/${def.key}`}
                        className="btn-text"
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 4,
                          fontSize: 13,
                          fontWeight: 700,
                          color: colors.accent,
                        }}
                      >
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
                      {isSuper && (
                        <form action={adoptExperience}>
                          <input type="hidden" name="experience" value={def.key} />
                          <button
                            type="submit"
                            className="btn-filled"
                            style={{ ...filledButton, height: 36, padding: "0 14px", fontSize: 13 }}
                          >
                            Usar con una empresa
                          </button>
                        </form>
                      )}
                    </div>
                  </div>
                </article>
              ))}
            <article
              style={{
                borderRadius: 18,
                border: `2px dashed ${colors.border}`,
                padding: 22,
                display: "flex",
                flexDirection: "column",
                justifyContent: "center",
                gap: 8,
                minHeight: 220,
                color: colors.muted,
              }}
            >
              <span style={{ ...tagChip, background: "#F1F5F7", color: colors.muted }}>EN CONSTRUCCIÓN</span>
              <h3 style={{ ...calSans, fontSize: 18, margin: 0, color: colors.inkSoft }}>Estación 2 · Transporte y conducción</h3>
              <p style={{ fontSize: 13, margin: 0, lineHeight: 1.5 }}>
                La siguiente parada de la ruta: los riesgos de transportar el café y de conducir.
              </p>
            </article>
          </div>
        </section>
      ))}
    </div>
  );
}

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
  gap: 6,
  padding: "5px 10px",
  borderRadius: 8,
  background: "rgba(15,24,29,0.85)",
  color: "#fff",
  fontSize: 12,
  fontWeight: 600,
};
