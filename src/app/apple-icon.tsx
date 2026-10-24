import { ImageResponse } from "next/og";
import { LOGO_PATHS } from "@/components/Logo";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

/** iOS home-screen icon: the SE monogram on an ink tile. */
export default function AppleIcon() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "#111214" }}>
        <svg width="150" height="150" viewBox="0 0 32 32" fill="none">
          <path d={LOGO_PATHS.s} stroke="#fafafa" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
          <path d={LOGO_PATHS.e} stroke="#fafafa" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
          <path d={LOGO_PATHS.link} stroke="#c6f04f" strokeWidth="2.6" strokeLinecap="round" />
        </svg>
      </div>
    ),
    size,
  );
}
