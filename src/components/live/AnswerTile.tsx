import AnswerShape, { ANSWER_STYLES } from "./AnswerShape";

interface Props {
  index: number;
  text: string;
  /** Tras revelar: las incorrectas se atenúan y la correcta lleva un check. */
  state?: "neutral" | "correct" | "dimmed";
  trailing?: React.ReactNode;
}

export default function AnswerTile({ index, text, state = "neutral", trailing }: Props) {
  const style = ANSWER_STYLES[index];
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 16,
        minHeight: "clamp(64px, 11vh, 120px)",
        padding: "12px 20px",
        borderRadius: 16,
        background: style.bg,
        color: style.fg,
        opacity: state === "dimmed" ? 0.35 : 1,
        boxShadow: "0 6px 0 rgba(0,0,0,0.25)",
        transition: "opacity 0.3s ease",
      }}
    >
      <AnswerShape index={index} size={34} />
      <span style={{ flex: 1, fontWeight: 700, fontSize: "clamp(18px, 2.4vw, 34px)", lineHeight: 1.2 }}>{text}</span>
      {state === "correct" && (
        <span aria-label="Respuesta correcta" style={{ fontSize: "clamp(22px, 2.8vw, 40px)", fontWeight: 900 }}>
          ✓
        </span>
      )}
      {trailing}
    </div>
  );
}
