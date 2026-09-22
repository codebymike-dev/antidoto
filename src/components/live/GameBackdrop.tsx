import AnswerShape, { ANSWER_STYLES } from "./AnswerShape";

// Formas de respuesta grandes y translúcidas flotando detrás del juego.
const SHAPES = [
  { top: "8%", left: "-4%", size: 260, delay: "0s" },
  { top: "62%", left: "6%", size: 180, delay: "-4s" },
  { top: "12%", left: "84%", size: 220, delay: "-8s" },
  { top: "70%", left: "78%", size: 300, delay: "-2s" },
];

export default function GameBackdrop() {
  return (
    <div aria-hidden style={{ position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none" }}>
      {SHAPES.map((s, i) => (
        <div
          key={i}
          className="live-float"
          style={{ position: "absolute", top: s.top, left: s.left, opacity: 0.07, animationDelay: s.delay }}
        >
          <AnswerShape index={i} size={s.size} color={ANSWER_STYLES[i].bg} />
        </div>
      ))}
    </div>
  );
}
