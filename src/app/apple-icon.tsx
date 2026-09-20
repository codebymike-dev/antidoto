import { ImageResponse } from "next/og";
import { colors } from "@/lib/theme";
import { LOGO_O_PATH, LOGO_O_VIEWBOX } from "@/lib/logo-o";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
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
        }}
      >
        <svg width="124" height="124" viewBox={LOGO_O_VIEWBOX}>
          <path fill="white" d={LOGO_O_PATH} />
        </svg>
      </div>
    ),
    { ...size }
  );
}
