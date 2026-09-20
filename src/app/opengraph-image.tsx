import { ImageResponse } from "next/og";
import { colors } from "@/lib/theme";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(160deg,#EAFBFF 0%,#FFFFFF 60%)",
          fontSize: 72,
          fontWeight: 700,
          color: colors.ink,
        }}
      >
        <div
          style={{
            display: "flex",
            width: 160,
            height: 160,
            borderRadius: 40,
            alignItems: "center",
            justifyContent: "center",
            background: colors.buttonGradient,
            color: "white",
            fontSize: 84,
            marginBottom: 32,
          }}
        >
          A
        </div>
        <div style={{ display: "flex" }}>Antídoto</div>
        <div style={{ display: "flex", fontSize: 32, fontWeight: 500, color: colors.inkSoft, marginTop: 12 }}>
          Misiones interactivas para tu equipo
        </div>
      </div>
    ),
    { ...size }
  );
}
