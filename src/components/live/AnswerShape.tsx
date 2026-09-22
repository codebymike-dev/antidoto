// Las 4 respuestas del juego (editor, proyector y celular). Cuatro matices bien
// distintos (se reconocen desde el fondo de una sala con proyector lavado), con el
// cian de marca como uno de ellos. Cada una lleva además su forma, para no depender
// solo del color.
//
// `bg` es el fondo de los botones: oscurecido hasta contraste 4.5:1 con su texto,
// porque el proyector lava los colores. `bright` es el mismo matiz más luminoso, para
// usar como texto o decoración sobre el fondo oscuro del juego.

export const ANSWER_STYLES = [
  { name: "triángulo", bg: "#C94950", fg: "#FFFFFF", bright: "#F2545B" },
  { name: "rombo", bg: "#197DA4", fg: "#FFFFFF", bright: "#3BC8F3" },
  { name: "círculo", bg: "#E8A33D", fg: "#0F181D", bright: "#E8A33D" },
  { name: "cuadrado", bg: "#278458", fg: "#FFFFFF", bright: "#2FA66A" },
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
