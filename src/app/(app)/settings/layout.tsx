import { SettingsTabs } from "@/components/dashboard/SettingsTabs";

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div>
      <h1 className="mb-5 text-[28px] font-normal tracking-[-0.02em]">Settings</h1>
      <SettingsTabs />
      {children}
    </div>
  );
}
