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
          borderRadius: 108,
        }}
      >
        <svg width="352" height="352" viewBox={LOGO_O_VIEWBOX}>
          <path fill="white" d={LOGO_O_PATH} />
        </svg>
      </div>
    ),
    { width: 512, height: 512 }
  );
}
