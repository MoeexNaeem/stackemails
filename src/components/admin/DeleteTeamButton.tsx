"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteWorkspaceAction } from "@/app/admin/actions";
import { confirmDialog } from "@/components/ui/Confirm";
import { Icon } from "@/components/ui/Icon";

/** Row-level "delete team" control for the admin Teams & users table. */
export function DeleteTeamButton({ workspaceId, name, ownerEmail }: { workspaceId: string; name: string; ownerEmail?: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();

  async function remove() {
    const who = ownerEmail ? ` (${ownerEmail})` : "";
    if (!(await confirmDialog(`Delete team "${name}"${who}? This permanently removes the team, all of its data and its owner account. It cannot be undone.`, { confirmLabel: "Delete", danger: true }))) return;
    start(async () => {
      await deleteWorkspaceAction(workspaceId);
      router.refresh();
    });
  }

  return (
    <button
      type="button"
      className="btn btn-ghost btn-sm !px-2 hover:!text-[var(--danger)]"
      onClick={remove}
      disabled={pending}
      aria-label={`Delete team ${name}`}
      title="Delete team"
    >
      <Icon name={pending ? "loader" : "trash"} size={15} className={pending ? "animate-spin" : undefined} />
    </button>
  );
}
