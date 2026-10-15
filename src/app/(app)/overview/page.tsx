import { redirect } from "next/navigation";

// The dashboard now lands on Emails (matching the product). Keep this route
// working for any old bookmarks by redirecting.
export default function OverviewRedirect() {
  redirect("/emails");
}
