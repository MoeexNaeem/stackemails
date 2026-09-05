import Link from "next/link";
import { Logo } from "@/components/Logo";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-full flex flex-col items-center justify-center px-6 py-12 relative">
      <div
        className="absolute inset-0 -z-10 opacity-60"
        style={{
          background:
            "radial-gradient(600px circle at 50% 0%, rgba(99,102,241,0.14), transparent 55%)",
        }}
      />
      <Link href="/" className="mb-8">
        <Logo size={34} />
      </Link>
      <div className="w-full max-w-sm">{children}</div>
    </div>
  );
}
