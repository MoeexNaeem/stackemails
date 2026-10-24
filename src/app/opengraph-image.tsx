import { ogCard, OG_SIZE } from "@/lib/og";

export const alt = "Stack Emails, the email API for developers";
export const size = OG_SIZE;
export const contentType = "image/png";

export default function Image() {
  return ogCard({ eyebrow: "Email API", title: "Email for developers, done right." });
}
