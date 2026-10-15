import { redirect } from "next/navigation";
import { AuthForm } from "@/components/AuthForm";
import { getCurrentUser } from "@/lib/auth/session";

export default async function SignupPage() {
  if (await getCurrentUser()) redirect("/emails");
  return <AuthForm mode="signup" />;
}
