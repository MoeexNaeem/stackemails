import { ImageResponse } from "next/og";
import { LOGO_PATHS } from "@/components/Logo";

export const OG_SIZE = { width: 1200, height: 630 };

/** Shared 1200×630 social card in the marketing style (ink canvas, SE monogram). */
export function ogCard({ eyebrow, title, footer }: { eyebrow: string; title: string; footer?: string }) {
  const size = title.length > 70 ? 56 : title.length > 44 ? 66 : 78;
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", background: "#15171a", padding: "72px 80px", position: "relative" }}>
        <div style={{ position: "absolute", right: -120, top: -120, width: 520, height: 520, borderRadius: 9999, background: "radial-gradient(circle, rgba(115,102,254,0.45), rgba(115,102,254,0) 70%)", display: "flex" }} />
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          <div style={{ display: "flex", width: 56, height: 56, borderRadius: 15, background: "#1f2024", border: "1px solid #2e3036", alignItems: "center", justifyContent: "center" }}>
            <svg width="48" height="48" viewBox="0 0 32 32" fill="none">
              <path d={LOGO_PATHS.s} stroke="#fafafa" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
              <path d={LOGO_PATHS.e} stroke="#fafafa" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
              <path d={LOGO_PATHS.link} stroke="#c6f04f" strokeWidth="2.6" strokeLinecap="round" />
            </svg>
          </div>
          <div style={{ color: "#ffffff", fontSize: 32, fontWeight: 600, letterSpacing: -1 }}>Stack Emails</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
          <div style={{ display: "flex", color: "#d1ff19", fontSize: 24, textTransform: "uppercase", letterSpacing: 4 }}>{eyebrow}</div>
          <div style={{ display: "flex", color: "#ffffff", fontSize: size, fontWeight: 700, lineHeight: 1.05, letterSpacing: -2, maxWidth: 1000 }}>{title}</div>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", color: "#94a3b8", fontSize: 24 }}>
          <div style={{ display: "flex" }}>{footer ?? "The email API for developers"}</div>
          <div style={{ display: "flex" }}>stackemails.com</div>
        </div>
      </div>
    ),
    OG_SIZE,
  );
}
