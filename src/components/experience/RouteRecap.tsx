import type { CSSProperties } from "react";
import PixelIcon from "./PixelIcon";
import { colors, calSans } from "@/lib/theme";
import { card } from "@/lib/styles";
import type { BrandPalette } from "@/lib/brand-palette";
import type { Recap, RecapStatus } from "@/lib/experiences/recap";

// El cierre personal de la ruta: sin JavaScript (el repaso usa <details>), para que la
// pantalla de "misión cumplida" cargue rápido aun con señal débil.

const STATUS: Record<RecapStatus, { label: string; dot: string }> = {
  primera: { label: "A la primera", dot: "#3E9B4F" },
  otra: { label: "Lo encontraste, con otra opción", dot: "#E0A100" },
  revelado: { label: "Se te pasó", dot: colors.danger },
};

const eyebrow: CSSProperties = {
  margin: 0,
  fontSize: 11.5,
  fontWeight: 700,
  letterSpacing: 0.6,
  textTransform: "uppercase",
};

/** Lo que va dentro del pase: números, insignias y lo que se lleva al turno. */
export function RecapSummary({ recap, pal }: { recap: Recap; pal: BrandPalette }) {
  const stat = (value: string, label: string) => (
    <div style={{ flex: 1, padding: "10px 4px", borderRadius: 12, background: pal.tint, textAlign: "center" }}>
      <div style={{ ...calSans, fontSize: 22, color: pal.strong }}>{value}</div>
      <div style={{ fontSize: 12, color: colors.inkSoft }}>{label}</div>
    </div>
  );

  return (
    <div data-pass-item style={{ display: "flex", flexDirection: "column", gap: 16, textAlign: "left", paddingBottom: 18 }}>
      <div style={{ display: "flex", gap: 8 }}>
        {stat(`${recap.correct}/${recap.total}`, "a la primera")}
        {stat(`${recap.found}/${recap.total}`, "encontrados")}
        {stat(String(recap.grains), "granos")}
      </div>

      <ul aria-label="Insignias ganadas" style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexWrap: "wrap", gap: 6 }}>
        {recap.stations.map((s) => (
          <li
            key={s.key}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              padding: "4px 10px 4px 6px",
              borderRadius: 999,
              background: "#fff",
              border: `1px solid ${pal.border}`,
              fontSize: 12.5,
              fontWeight: 600,
              color: colors.ink,
            }}
          >
            <PixelIcon name="insignia" size={20} />
            {s.badge}
          </li>
        ))}
      </ul>

      <div>
        <p style={{ ...eyebrow, color: pal.accent, marginBottom: 8 }}>Llévate a tu turno</p>
        {recap.takeaways.length > 0 ? (
          <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 10 }}>
            {recap.takeaways.map((t) => (
              <li key={t.id} style={{ fontSize: 14, lineHeight: 1.5, color: colors.ink }}>
                <b>{t.title}.</b> <span style={{ color: colors.inkSoft }}>{t.practice}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p style={{ margin: 0, fontSize: 14, lineHeight: 1.5, color: colors.inkSoft }}>
            No se te pasó ninguno. Ahora toca lo más importante: aplicarlo en tu turno.
          </p>
        )}
      </div>
    </div>
  );
}

/** El repaso completo: cada estación se abre para ver todos sus riesgos con la explicación. */
export function RecapReview({ recap, pal }: { recap: Recap; pal: BrandPalette }) {
  // Se abre sola la primera estación con algo por repasar.
  const firstWithMisses = recap.stations.findIndex((s) => s.risks.some((r) => r.status !== "primera"));

  return (
    <section aria-labelledby="repaso-title" style={{ ...card, width: "100%", display: "flex", flexDirection: "column", gap: 12 }}>
      <div>
        <h2 id="repaso-title" style={{ ...calSans, fontSize: 20, margin: 0, color: colors.ink }}>
          Repasa lo que viste
        </h2>
        <p style={{ margin: "4px 0 0", fontSize: 13.5, lineHeight: 1.5, color: colors.inkSoft }}>
          Cada riesgo con su explicación y la práctica correcta. Puedes volver cuando quieras.
        </p>
      </div>

      {recap.stations.map((s, i) => (
        <details
          key={s.key}
          open={i === firstWithMisses}
          style={{ borderRadius: 12, background: pal.tint, padding: "10px 14px" }}
        >
          <summary style={{ cursor: "pointer", fontWeight: 700, fontSize: 14.5, color: pal.strong, minHeight: 28 }}>
            {recap.stations.length === 1 ? s.title : `Estación ${s.station}: ${s.title}`}
            <span style={{ fontWeight: 500, color: colors.inkSoft }}>
              {" "}
              · {s.correct} de {s.risks.length} a la primera
            </span>
          </summary>
          <ul style={{ listStyle: "none", margin: "12px 0 4px", padding: 0, display: "flex", flexDirection: "column", gap: 10 }}>
            {s.risks.map((r) => (
              <li key={r.id} style={{ background: "#fff", borderRadius: 10, padding: "12px 14px", display: "flex", flexDirection: "column", gap: 6 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span aria-hidden style={{ width: 9, height: 9, borderRadius: 999, background: STATUS[r.status].dot, flexShrink: 0 }} />
                  <b style={{ fontSize: 14.5, color: colors.ink }}>{r.title}</b>
                </div>
                <p style={{ margin: 0, fontSize: 12, color: colors.muted }}>
                  {r.category} · {STATUS[r.status].label}
                </p>
                {r.status !== "primera" && (
                  <p style={{ margin: 0, fontSize: 13.5, lineHeight: 1.5, color: colors.inkSoft }}>
                    {r.yours && (
                      <>
                        Elegiste: {r.yours}.
                        <br />
                      </>
                    )}
                    Lo correcto: <b style={{ color: colors.ink }}>{r.correct}</b>
                  </p>
                )}
                <p style={{ margin: 0, fontSize: 13.5, lineHeight: 1.5, color: colors.inkSoft }}>{r.explanation}</p>
                <p style={{ margin: 0, fontSize: 13.5, lineHeight: 1.5, color: colors.ink }}>
                  <b style={{ color: pal.accent }}>En tu turno:</b> {r.practice}
                </p>
              </li>
            ))}
          </ul>
        </details>
      ))}
    </section>
  );
}
