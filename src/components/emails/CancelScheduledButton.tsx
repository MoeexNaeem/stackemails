"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { cancelScheduledEmailAction } from "@/app/(app)/emails-actions";
import { confirmDialog } from "@/components/ui/Confirm";

export function CancelScheduledButton({ messageId }: { messageId: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <button
      className="btn btn-danger btn-sm"
      disabled={pending}
      onClick={async () => {
        if (!(await confirmDialog("Cancel this scheduled email? It won't be sent."))) return;
        start(async () => {
          await cancelScheduledEmailAction(messageId);
          router.refresh();
        });
      }}
    >
      {pending ? "Canceling…" : "Cancel send"}
    </button>
  );
}
