import { ImageResponse } from "next/og";
import { colors } from "@/lib/theme";

export const contentType = "image/png";

// Maskable icons need the glyph inside the ~80% "safe zone" circle, since the
// OS can crop the outer edge into a circle/squircle. Extra padding vs. the
// regular icon keeps the "A" from getting clipped.
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
          color: "white",
          fontSize: 220,
          fontWeight: 700,
        }}
      >
        A
      </div>
    ),
    { width: 512, height: 512 }
  );
}
