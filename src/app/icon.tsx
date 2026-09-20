import { ImageResponse } from "next/og";
import { colors } from "@/lib/theme";
import { LOGO_O_PATH, LOGO_O_VIEWBOX } from "@/lib/logo-o";

export const size = { width: 64, height: 64 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: colors.buttonGradient,
          borderRadius: 16,
        }}
      >
        <svg width="44" height="44" viewBox={LOGO_O_VIEWBOX}>
          <path fill="white" d={LOGO_O_PATH} />
        </svg>
      </div>
    ),
    { ...size }
  );
}
