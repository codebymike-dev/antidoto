import { colors } from "@/lib/theme";
import { card } from "@/lib/styles";

/**
 * Lo que se ve mientras llega una página del portal (todas son dinámicas). Sin esto, al
 * tocar un enlace la pantalla se quedaba quieta y parecía que no había pasado nada.
 */
export default function PortalLoading() {
  return (
    <div role="status" aria-live="polite" style={{ display: "flex", flexDirection: "column", gap: 22, maxWidth: 980 }}>
      <span className="sr-only">Cargando…</span>
      <div aria-hidden style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <span className="skeleton" style={{ width: 260, height: 30 }} />
        <span className="skeleton" style={{ width: 180, height: 14 }} />
      </div>
      {[0, 1].map((i) => (
        <div key={i} aria-hidden style={{ ...card, display: "flex", flexDirection: "column", gap: 14, padding: "22px 22px 26px" }}>
          <span className="skeleton" style={{ width: "40%", height: 18 }} />
          <span className="skeleton" style={{ width: "100%", height: 12, background: colors.accentTint }} />
          <span className="skeleton" style={{ width: "85%", height: 12, background: colors.accentTint }} />
          <span className="skeleton" style={{ width: "60%", height: 12, background: colors.accentTint }} />
        </div>
      ))}
    </div>
  );
}
