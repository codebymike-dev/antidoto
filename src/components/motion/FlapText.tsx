import type { CSSProperties } from "react";

/**
 * Texto en celdas split-flap. Es marcado puro (sirve en componentes de servidor): pinta el
 * estado final y un script cliente lo hace girar con `flapTimeline`. El lector de pantalla
 * lee el texto completo; las celdas son decorativas.
 */
export default function FlapText({
  text,
  tone = "light",
  className = "",
  style,
}: {
  text: string;
  tone?: "light" | "dark";
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <span className={`flap flap--${tone} ${className}`} data-flap={text} style={style}>
      <span className="flap-sr">{text.trim()}</span>
      <span className="flap-cells" aria-hidden="true">
        {Array.from(text).map((ch, i) => (
          <span key={i} className={ch === " " ? "flap-cell flap-cell--blank" : "flap-cell"}>
            <span className="flap-char">{ch === " " ? " " : ch}</span>
          </span>
        ))}
      </span>
    </span>
  );
}
