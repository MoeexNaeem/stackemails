import { SettingsTabs } from "@/components/dashboard/SettingsTabs";

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight mb-6">Settings</h1>
      <SettingsTabs />
      {children}
    </div>
  );
}
