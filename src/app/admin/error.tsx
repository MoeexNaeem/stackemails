"use client";

import { ErrorState } from "@/components/ui/ErrorState";

export default function AdminError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <ErrorState error={error} reset={reset} home="/admin" homeLabel="Admin overview" />;
}
