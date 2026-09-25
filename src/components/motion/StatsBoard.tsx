"use client";

import SplitFlap from "./SplitFlap";

/**
 * Franja de cifras del dashboard con el mismo tablero split-flap del login. Las cifras son
 * reales (las calcula la página); solo giran en la primera visita de la sesión.
 */
export default function StatsBoard({
  stats,
  introKey,
}: {
  stats: { label: string; value: string }[];
  introKey: string;
}) {
  return (
    <dl className="stats-board">
      {stats.map((s, i) => (
        <div key={s.label}>
          <dt>{s.label}</dt>
          <dd>
            <SplitFlap text={s.value} tone="dark" introKey={introKey} delay={0.1 + i * 0.12} />
          </dd>
        </div>
      ))}
    </dl>
  );
}
