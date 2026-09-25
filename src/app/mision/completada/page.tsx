import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { currentParticipation } from "@/lib/participation";
import { leaveActivity } from "@/lib/actions";
import { colors, LOGO_SRC, calSans } from "@/lib/theme";
import { primaryButton } from "@/lib/styles";
import Blobs from "@/components/Blobs";
import { getCompanyBrand } from "@/lib/company-brand";
import { brandCssVars, brandPalette } from "@/lib/brand-palette";
import BrandLogo, { WithAntidoto } from "@/components/BrandLogo";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Misión completada",
  robots: { index: false, follow: false },
};

export default async function MisionCompletadaPage() {
  const p = await currentParticipation();
  if (!p) redirect("/");
  const brand = await getCompanyBrand(p.company_id);
  const pal = brandPalette(brand);

  return (
    <div
      style={{
        position: "relative",
        minHeight: "100vh",
        overflow: "hidden",
        background: pal.pageGradient,
        ...brandCssVars(pal),
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "32px 20px",
      }}
    >
      <Blobs colors={brand ? [pal.soft, pal.graphic, pal.button] : undefined} />
      <div
        style={{
          position: "relative",
          zIndex: 1,
          width: "100%",
          maxWidth: 440,
          background: "#fff",
          borderRadius: 20,
          padding: "34px 28px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 14,
          textAlign: "center",
          boxShadow: colors.cardShadow,
          borderTop: `4px solid ${pal.soft}`,
        }}
      >
        {brand ? (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10, marginBottom: 4 }}>
            <BrandLogo brand={brand} surface="claro" height={64} />
            <WithAntidoto surface="claro" size={16} />
          </div>
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={LOGO_SRC} alt="Antídoto" style={{ height: 90 }} />
        )}
        <h2 style={{ ...calSans, fontSize: 26, margin: 0, color: colors.ink }}>
          ¡Gran trabajo, {p.participant_name}!
        </h2>
        <p style={{ fontSize: 14.5, lineHeight: 1.6, color: colors.inkSoft, margin: 0 }}>
          Completaste &quot;{p.mission_title}&quot;. Tu equipo {p.empresa} va en {p.company_avance}% de avance
          colectivo.
        </p>
        <form action={leaveActivity}>
          <button type="submit" className="btn-primary" style={{ ...primaryButton, boxShadow: pal.buttonShadow, height: 50, padding: "0 30px", fontSize: 15 }}>
            Volver al inicio
          </button>
        </form>
      </div>
    </div>
  );
}
