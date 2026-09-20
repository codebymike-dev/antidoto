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
          borderRadius: 108,
          color: "white",
          fontSize: 320,
          fontWeight: 700,
        }}
      >
        A
      </div>
    ),
    { width: 512, height: 512 }
  );
}
