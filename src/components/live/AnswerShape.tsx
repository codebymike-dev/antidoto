// Las 4 respuestas del juego (editor, proyector y celular). Salen de la paleta de
// marca, y cada una lleva además una forma para no depender solo del color.

export const ANSWER_STYLES = [
  { name: "triángulo", bg: "#3BC8F3", fg: "#0F181D" },
  { name: "rombo", bg: "#0C5C7D", fg: "#FFFFFF" },
  { name: "círculo", bg: "#80DCFF", fg: "#0F181D" },
  { name: "cuadrado", bg: "#0F181D", fg: "#FFFFFF" },
] as const;

const PATHS = [
  <polygon key="t" points="12 3 22 20 2 20" />,
  <polygon key="r" points="12 2 22 12 12 22 2 12" />,
  <circle key="c" cx="12" cy="12" r="9.5" />,
  <rect key="s" x="3" y="3" width="18" height="18" rx="1.5" />,
];

export default function AnswerShape({ index, size = 16, color }: { index: number; size?: number; color?: string }) {
  const style = ANSWER_STYLES[index % 4];
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={color ?? style.fg}
      aria-label={style.name}
      role="img"
      style={{ flexShrink: 0 }}
    >
      {PATHS[index % 4]}
    </svg>
  );
}
