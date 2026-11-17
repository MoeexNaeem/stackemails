import { redirect } from "next/navigation";
import { marketingEnabled } from "@/lib/features";

// Automations are part of the marketing features, which are switched off.
export default function AutomationsLayout({ children }: { children: React.ReactNode }) {
  if (!marketingEnabled()) redirect("/overview");
  return children;
}
