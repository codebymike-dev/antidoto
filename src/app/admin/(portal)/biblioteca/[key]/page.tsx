import Link from "next/link";
import { notFound } from "next/navigation";
import { currentUser } from "@/lib/auth";
import { getExperience } from "@/lib/experiences/catalog";
import { loadOverrides } from "@/lib/experience-data";
import { adoptExperience } from "@/lib/experience-actions";
import { riskTexts } from "@/lib/experiences/texts";
import { colors, calSans } from "@/lib/theme";
import { card, filledButton, secondaryButton } from "@/lib/styles";
import RiskTextsEditor from "@/components/admin/RiskTextsEditor";

export const dynamic = "force-dynamic";

const OPTION_KEYS = ["A", "B", "C"];

export default async function ExperienciaPage({ params }: { params: Promise<{ key: string }> }) {
  const user = (await currentUser())!;
  const isSuper = user.role === "super";
  const { key } = await params;
  const def = getExperience(key);
  if (!def) notFound();
  const overrides = await loadOverrides(def.key);

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
        <div style={{ maxWidth: 620 }}>
          <span style={{ fontSize: 11.5, fontWeight: 700, color: colors.accent, letterSpacing: 1 }}>
            {def.series.toUpperCase()} · ESTACIÓN {def.station}
          </span>
          <h1 style={{ ...calSans, fontSize: 26, margin: "4px 0 6px 0", color: colors.ink }}>{def.title}</h1>
          <p style={{ fontSize: 14, color: colors.muted, margin: 0, lineHeight: 1.5 }}>{def.description}</p>
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <Link
            href={`/admin/escena/${def.key}`}
            className="btn-secondary"
            style={{ ...secondaryButton, display: "inline-flex", alignItems: "center" }}
          >
            Probar la escena
          </Link>
          {isSuper && (
            <form action={adoptExperience}>
              <input type="hidden" name="experience" value={def.key} />
              <button type="submit" className="btn-filled" style={filledButton}>
                Usar con una empresa
              </button>
            </form>
          )}
        </div>
      </div>

      <h2 style={{ ...calSans, fontSize: 19, margin: "0 0 4px 0", color: colors.ink }}>Riesgos de la escena</h2>
      <p style={{ fontSize: 13.5, color: colors.muted, margin: "0 0 16px 0", maxWidth: 640, lineHeight: 1.5 }}>
        {isSuper
          ? "Edita lo que ve el participante en cada riesgo. Dónde aparece cada uno en la escena depende del dibujo y no se cambia aquí. Las respuestas ya guardadas conservan el texto que eligió cada persona."
          : "Lo que verá cada participante al encontrar un riesgo, con la respuesta correcta marcada."}
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {def.risks.map((risk, n) => {
          const texts = riskTexts(risk, overrides);
          const edited = overrides.has(risk.id);
          return (
            <section key={risk.id} style={{ ...card, padding: 20 }} aria-labelledby={`riesgo-${risk.id}`}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14, flexWrap: "wrap" }}>
                <span style={numberBadge}>{n + 1}</span>
                <h3 id={`riesgo-${risk.id}`} style={{ ...calSans, fontSize: 16.5, margin: 0, color: colors.ink }}>
                  {texts.title}
                </h3>
                <span style={chip}>{risk.category}</span>
                {edited && <span style={{ ...chip, background: "#FFF3D6", color: "#A66B00" }}>Editado</span>}
              </div>
              {isSuper ? (
                <RiskTextsEditor experience={def.key} riskId={risk.id} texts={texts} edited={edited} />
              ) : (
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 8,
                    fontSize: 14,
                    color: colors.inkSoft,
                    lineHeight: 1.5,
                  }}
                >
                  <p style={{ margin: 0, fontWeight: 600, color: colors.ink }}>{texts.prompt}</p>
                  <ol style={{ margin: 0, paddingLeft: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 4 }}>
                    {texts.options.map((o, i) => (
                      <li
                        key={i}
                        style={{
                          fontWeight: i === texts.correct ? 700 : 400,
                          color: i === texts.correct ? "#1F8A4C" : colors.inkSoft,
                        }}
                      >
                        {OPTION_KEYS[i]}. {o} {i === texts.correct && "✓"}
                      </li>
                    ))}
                  </ol>
                  <p style={{ margin: 0 }}>{texts.explanation}</p>
                  <p style={{ margin: 0 }}>
                    <b>Así sí:</b> {texts.practice}
                  </p>
                </div>
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
}

const chip = {
  fontSize: 11,
  fontWeight: 700,
  color: colors.accentDark,
  background: colors.accentTint,
  padding: "3px 9px",
  borderRadius: 999,
};

const numberBadge = {
  width: 26,
  height: 26,
  borderRadius: 8,
  background: colors.ink,
  color: "#fff",
  fontSize: 13,
  fontWeight: 700,
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
};
