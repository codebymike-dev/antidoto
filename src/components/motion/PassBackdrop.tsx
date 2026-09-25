import { rosettePath } from "@/lib/guilloche";

// Rosetas precalculadas una sola vez por proceso: son constantes y el HTML las cachea igual.
const ROSETTES = [
  { R: 420, r: 165, d: 150, steps: 64, tone: "#1C99CA" },
  { R: 420, r: 165, d: 95, steps: 64, tone: "#3BC8F3" },
  { R: 300, r: 110, d: 165, steps: 64, tone: "#80DCFF" },
].map(({ tone, ...o }) => ({ tone, d: rosettePath(o) }));

/**
 * Fondo de impresión de seguridad (guilloche) para las pantallas de acceso: tinta cian muy
 * tenue, dos rosetas que giran despacio en sentidos opuestos. Solo CSS; con movimiento
 * reducido se quedan quietas. Reemplaza a las manchas difuminadas en / y /admin/login.
 */
export default function PassBackdrop() {
  return (
    <div className="guilloche" aria-hidden="true">
      <svg viewBox="-480 -480 960 960" className="guilloche-a">
        {ROSETTES.slice(0, 2).map((r, i) => (
          <path key={i} d={r.d} stroke={r.tone} />
        ))}
      </svg>
      <svg viewBox="-480 -480 960 960" className="guilloche-b">
        <path d={ROSETTES[2].d} stroke={ROSETTES[2].tone} />
      </svg>
    </div>
  );
}
