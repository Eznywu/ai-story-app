import { ImageResponse } from "next/og";

export const runtime = "edge";

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
          background: "linear-gradient(145deg, #0c1222 0%, #162038 55%, #1a2840 100%)",
          color: "#fef3c7",
          fontSize: 96,
          fontWeight: 800,
        }}
      >
        ☾
      </div>
    ),
    { ...size },
  );
}
