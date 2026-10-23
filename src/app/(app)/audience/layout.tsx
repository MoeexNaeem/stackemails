import { AudienceTabs } from "@/components/audience/AudienceTabs";

export default function AudienceLayout({ children }: { children: React.ReactNode }) {
  return (
    <div>
      <h1 className="text-[28px] font-normal tracking-[-0.02em] mb-5">Audience</h1>
      <AudienceTabs />
      {children}
    </div>
  );
}
