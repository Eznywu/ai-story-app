import { ImageResponse } from "next/og";

export const runtime = "edge";

export const size = { width: 512, height: 512 };
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
          background: "linear-gradient(145deg, #0c1222 0%, #162038 55%, #1a2840 100%)",
          color: "#fef3c7",
          fontSize: 220,
          fontWeight: 800,
        }}
      >
        ☾
      </div>
    ),
    { ...size },
  );
}
