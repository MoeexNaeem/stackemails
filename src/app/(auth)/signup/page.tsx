import type { Metadata } from "next";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { AuthForm } from "@/components/AuthForm";
import { getCurrentUser } from "@/lib/auth/session";

export const metadata: Metadata = {
  title: "Create your free account",
  description: "Start sending transactional and marketing email with Stack Emails. Free plan includes 3,000 emails a month. No credit card required.",
  alternates: { canonical: "/signup" },
};

export default async function SignupPage() {
  if (await getCurrentUser()) redirect("/overview");
  return (
    <Suspense>
      <AuthForm mode="signup" />
    </Suspense>
  );
}
