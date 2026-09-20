import { ImageResponse } from "next/og";
import { colors } from "@/lib/theme";

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
          color: "white",
          fontSize: 40,
          fontWeight: 700,
        }}
      >
        A
      </div>
    ),
    { ...size }
  );
}
