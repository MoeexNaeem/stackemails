"use client";

import Link from "next/link";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { StatusBadge } from "@/components/StatusBadge";
import { createBroadcastAction, deleteBroadcastAction } from "@/app/(app)/actions";

export type BroadcastView = {
  id: string;
  name: string;
  status: string;
  recipients: number;
  updatedAt: string;
};

export function BroadcastsList({ broadcasts }: { broadcasts: BroadcastView[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();

  function remove(id: string) {
    if (!confirm("Delete this broadcast?")) return;
    start(async () => {
      await deleteBroadcastAction(id);
      router.refresh();
    });
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Broadcasts</h1>
        <form action={createBroadcastAction}>
          <button type="submit" className="btn btn-primary">
            + Create broadcast
          </button>
        </form>
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        <input className="input flex-1 min-w-[200px]" placeholder="Search..." />
        <span className="btn btn-secondary">All Statuses ▾</span>
        <span className="btn btn-secondary">All audiences ▾</span>
      </div>

      {broadcasts.length === 0 ? (
        <div className="card px-5 py-16 text-center">
          <p className="font-medium">No broadcasts yet</p>
          <p className="text-sm text-fg-subtle mt-1">
            Start reaching many recipients at once by creating and sending a broadcast.
          </p>
          <form action={createBroadcastAction} className="mt-4">
            <button type="submit" className="btn btn-primary">
              + Create broadcast
            </button>
          </form>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-fg-subtle border-b border-border">
                <th className="px-5 py-3 font-medium">Name</th>
                <th className="px-5 py-3 font-medium">Status</th>
                <th className="px-5 py-3 font-medium">Recipients</th>
                <th className="px-5 py-3 font-medium text-right">Updated</th>
                <th className="w-10" />
              </tr>
            </thead>
            <tbody>
              {broadcasts.map((b) => (
                <tr key={b.id} className="border-b border-border last:border-0 hover:bg-bg-hover">
                  <td className="px-5 py-3">
                    <Link href={`/broadcasts/${b.id}`} className="font-medium hover:text-accent">
                      {b.name || "Untitled"}
                    </Link>
                  </td>
                  <td className="px-5 py-3">
                    <StatusBadge status={b.status === "sent" ? "delivered" : b.status === "draft" ? "pending" : b.status} />
                  </td>
                  <td className="px-5 py-3 text-fg-muted">{b.recipients || "—"}</td>
                  <td className="px-5 py-3 text-right text-fg-subtle whitespace-nowrap">
                    {new Date(b.updatedAt).toLocaleString()}
                  </td>
                  <td className="px-5 py-3 text-right">
                    <button
                      className="btn btn-ghost !px-2 !py-1 text-xs"
                      onClick={() => remove(b.id)}
                      disabled={pending}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
