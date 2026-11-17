import { redirect } from "next/navigation";
import { marketingEnabled } from "@/lib/features";

// Broadcasts are part of the marketing features, which are switched off.
export default function BroadcastsLayout({ children }: { children: React.ReactNode }) {
  if (!marketingEnabled()) redirect("/overview");
  return children;
}
