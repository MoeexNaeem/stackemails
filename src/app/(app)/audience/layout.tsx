import { redirect } from "next/navigation";
import { AudienceTabs } from "@/components/audience/AudienceTabs";
import { marketingEnabled } from "@/lib/features";

export default function AudienceLayout({ children }: { children: React.ReactNode }) {
  // Contacts/segments/topics are part of the marketing features, which are switched off.
  if (!marketingEnabled()) redirect("/overview");
  return (
    <div>
      <h1 className="text-[28px] font-normal tracking-[-0.02em] mb-5">Audience</h1>
      <AudienceTabs />
      {children}
    </div>
  );
}
