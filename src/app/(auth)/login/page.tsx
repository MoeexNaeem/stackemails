import type { Metadata } from "next";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { AuthForm } from "@/components/AuthForm";
import { getCurrentUser } from "@/lib/auth/session";

export const metadata: Metadata = {
  title: "Sign in",
  description: "Sign in to your Stack Emails dashboard to manage domains, API keys, emails and analytics.",
  alternates: { canonical: "/login" },
};

export default async function LoginPage() {
  if (await getCurrentUser()) redirect("/overview");
  return (
    <Suspense>
      <AuthForm mode="login" />
    </Suspense>
  );
}
