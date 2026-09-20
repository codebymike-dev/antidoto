import { ImageResponse } from "next/og";
import { colors } from "@/lib/theme";

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
          color: "white",
          fontSize: 120,
          fontWeight: 700,
        }}
      >
        A
      </div>
    ),
    { width: 192, height: 192 }
  );
}
