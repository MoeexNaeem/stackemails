import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

/** iOS home-screen icon: the stacked-envelope mark on an ink tile. */
export default function AppleIcon() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "#15171a" }}>
        <div style={{ position: "relative", width: 112, height: 92, display: "flex" }}>
          <div style={{ position: "absolute", left: 24, top: 0, width: 88, height: 62, borderRadius: 14, background: "#b77fe0", display: "flex" }} />
          <div style={{ position: "absolute", left: 0, top: 28, width: 88, height: 62, borderRadius: 14, background: "#c6f04f", display: "flex" }} />
        </div>
      </div>
    ),
    size,
  );
}
