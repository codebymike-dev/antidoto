import { ImageResponse } from "next/og";
import { colors } from "@/lib/theme";
import { LOGO_O_PATH, LOGO_O_VIEWBOX } from "@/lib/logo-o";

export const contentType = "image/png";

// Maskable icons need the glyph inside the ~80% "safe zone" circle, since the
// OS can crop the outer edge into a circle/squircle. Extra padding vs. the
// regular icon keeps the shape from getting clipped.
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
        }}
      >
        <svg width="240" height="240" viewBox={LOGO_O_VIEWBOX}>
          <path fill="white" d={LOGO_O_PATH} />
        </svg>
      </div>
    ),
    { width: 512, height: 512 }
  );
}
