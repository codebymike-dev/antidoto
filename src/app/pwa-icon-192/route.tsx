import { ImageResponse } from "next/og";
import { colors } from "@/lib/theme";
import { LOGO_O_PATH, LOGO_O_VIEWBOX } from "@/lib/logo-o";

export const contentType = "image/png";

export function GET() {
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
          borderRadius: 40,
        }}
      >
        <svg width="132" height="132" viewBox={LOGO_O_VIEWBOX}>
          <path fill="white" d={LOGO_O_PATH} />
        </svg>
      </div>
    ),
    { width: 192, height: 192 }
  );
}
