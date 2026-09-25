import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { currentParticipation } from "@/lib/participation";
import { completeMission, leaveActivity } from "@/lib/actions";
import { colors, LOGO_SRC, calSans } from "@/lib/theme";
import { card, filledButton } from "@/lib/styles";
import { getCompanyBrand } from "@/lib/company-brand";
import { brandCssVars, brandPalette } from "@/lib/brand-palette";
import { CoBrand } from "@/components/BrandLogo";
import { GAME_MODE } from "@/lib/data";
import { loadAllOverrides, missionStations, participationAnswers, resultsFor } from "@/lib/experience-data";
import { publicExperience } from "@/lib/experiences/texts";
import ExperiencePlayer from "@/components/experience/ExperiencePlayer";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Tu misión",
  robots: { index: false, follow: false },
};

export default async function MisionPage() {
  const p = await currentParticipation();
  if (!p) redirect("/");
  if (p.completed_at) redirect("/mision/completada");
  const brand = await getCompanyBrand(p.company_id);

  // Las actividades de la biblioteca (escenas interactivas) tienen su propio jugador.
  // Una serie (la Ruta del café) se juega estación por estación con el mismo código.
  const stations = await missionStations(p.mission_id);
  if (stations) {
    const overrides = await loadAllOverrides(stations);
    const answers = await participationAnswers(p.id);
    return (
      <ExperiencePlayer
        stations={stations.map((d) => publicExperience(d, overrides.get(d.key)!))}
        participant={p.participant_name}
        initialResults={resultsFor(stations, overrides, answers)}
        mode="play"
        paused={p.estado !== "activo"}
        exitAction={leaveActivity}
        brand={brand}
      />
    );
  }

  const modeLabel =
    GAME_MODE === "sincronizado"
      ? "Modo en vivo · todo el equipo responde a la vez"
      : "Modo a tu ritmo · avanza cuando quieras";

  // Sin marca configurada, la paleta es la de Antídoto y la pantalla queda como siempre.
  const pal = brandPalette(brand);

  return (
    <div
      style={{
        position: "relative",
        minHeight: "100vh",
        background: pal.pageGradient,
        ...brandCssVars(pal),
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        padding: "32px 20px",
      }}
    >
      <div style={{ width: "100%", maxWidth: 640, display: "flex", flexDirection: "column", gap: 26 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <form action={leaveActivity}>
            <button
              type="submit"
              className="btn-text"
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                fontSize: 14,
                color: pal.strong,
                fontWeight: 600,
                padding: 0,
              }}
            >
              ‹ Volver
            </button>
          </form>
          {brand ? (
            <CoBrand brand={brand} surface="claro" height={44} />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={LOGO_SRC} alt="Antídoto" style={{ height: 120 }} />
          )}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <h2 style={{ ...calSans, fontSize: 28, margin: 0, color: colors.ink }}>¡Hola, {p.participant_name}!</h2>
          <div
            style={{
              display: "inline-flex",
              alignSelf: "flex-start",
              alignItems: "center",
              gap: 8,
              background: pal.tint,
              padding: "6px 14px",
              borderRadius: 100,
              fontSize: 13,
              color: pal.strong,
              fontWeight: 600,
            }}
          >
            Participas junto a {p.empresa} · {p.participantes}{" "}
            {p.participantes === 1 ? "persona ya se unió" : "personas ya se unieron"}
          </div>
          {brand?.welcome && (
            <p style={{ margin: "4px 0 0", fontSize: 14.5, lineHeight: 1.6, color: colors.inkSoft, maxWidth: 520 }}>{brand.welcome}</p>
          )}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {p.estado === "pausado" && (
            <div
              style={{
                background: "#FFF3D6",
                borderRadius: 12,
                padding: "12px 16px",
                fontSize: 13,
                color: "#A66B00",
                fontWeight: 600,
              }}
            >
              Esta actividad está pausada temporalmente por tu administrador.
            </div>
          )}
          <div style={{ ...card, borderTop: `4px solid ${pal.soft}`, display: "flex", flexDirection: "column", gap: 14, padding: "30px 26px" }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: pal.accent, letterSpacing: 1.2 }}>
              {p.mission_tag}
            </span>
            <h3 style={{ ...calSans, fontSize: 24, margin: 0, color: colors.ink }}>{p.mission_title}</h3>
            <p style={{ fontSize: 14.5, lineHeight: 1.6, color: colors.inkSoft, margin: 0 }}>
              {p.mission_description}
            </p>
            <span style={{ fontSize: 12.5, color: pal.accent, fontWeight: 600 }}>{modeLabel}</span>
            <form action={completeMission}>
              <button
                type="submit"
                className="btn-filled"
                style={{
                  ...filledButton,
                  alignSelf: "flex-start",
                  height: 50,
                  padding: "0 28px",
                  fontSize: 15,
                  marginTop: 8,
                  boxShadow: pal.buttonShadow,
                }}
              >
                Comenzar reto
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
