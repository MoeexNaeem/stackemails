"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { StatusBadge } from "@/components/StatusBadge";
import { CopyButton } from "@/components/CopyButton";
import { createApiKeyAction, revokeApiKeyAction, type ActionState } from "@/app/(app)/actions";

export type KeyView = {
  id: string;
  name: string;
  mode: string;
  last4: string;
  lastUsedAt: string | null;
  createdAt: string;
  revoked: boolean;
};

const initial: ActionState = { ok: false };

export function ApiKeysManager({ keys }: { keys: KeyView[] }) {
  const router = useRouter();
  const [creating, setCreating] = useState(false);
  const [state, action, pending] = useActionState(createApiKeyAction, initial);
  const [revealed, setRevealed] = useState<string | null>(null);
  const [, startRevoke] = useTransition();

  useEffect(() => {
    if (state.ok && state.secret) {
      setRevealed(state.secret);
      setCreating(false);
      router.refresh();
    }
  }, [state, router]);

  function revoke(id: string) {
    if (!confirm("Revoke this API key? Requests using it will immediately fail.")) return;
    startRevoke(async () => {
      await revokeApiKeyAction(id);
      router.refresh();
    });
  }

  return (
    <div>
      <div className="flex justify-end mb-4">
        <button className="btn btn-primary" onClick={() => setCreating((c) => !c)}>
          {creating ? "Cancel" : "Create API key"}
        </button>
      </div>

      {creating && (
        <form action={action} className="card p-5 mb-4 flex flex-wrap items-end gap-3">
          <div className="flex-1 min-w-[200px]">
            <label className="label">Key name</label>
            <input name="name" className="input" placeholder="Production server" required autoFocus />
          </div>
          <div>
            <label className="label">Mode</label>
            <select name="mode" className="input w-32" defaultValue="live">
              <option value="live">Live</option>
              <option value="test">Test</option>
            </select>
          </div>
          <button type="submit" className="btn btn-primary" disabled={pending}>
            {pending ? "Creating…" : "Create"}
          </button>
          {state.error && (
            <p className="w-full text-sm" style={{ color: "var(--danger)" }}>
              {state.error}
            </p>
          )}
        </form>
      )}

      {/* Reveal-once modal */}
      {revealed && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.6)" }}
        >
          <div className="card w-full max-w-lg p-6">
            <h2 className="font-semibold text-lg">Save your API key</h2>
            <p className="text-sm text-fg-muted mt-1">
              This is the only time you’ll see this key. Store it somewhere safe.
            </p>
            <div
              className="mono text-sm break-all rounded-lg px-4 py-3 mt-4"
              style={{ background: "var(--bg-elevated)", border: "1px solid var(--border-strong)" }}
            >
              {revealed}
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <CopyButton value={revealed} label="Copy key" />
              <button className="btn btn-primary" onClick={() => setRevealed(null)}>
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="card overflow-hidden">
        {keys.length === 0 ? (
          <p className="px-5 py-16 text-center text-fg-muted">No API keys yet.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-fg-subtle border-b border-border">
                <th className="px-5 py-3 font-medium">Name</th>
                <th className="px-5 py-3 font-medium">Key</th>
                <th className="px-5 py-3 font-medium">Mode</th>
                <th className="px-5 py-3 font-medium">Last used</th>
                <th className="px-5 py-3 font-medium text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {keys.map((k) => (
                <tr key={k.id} className="border-b border-border last:border-0">
                  <td className="px-5 py-3 font-medium">{k.name}</td>
                  <td className="px-5 py-3 mono text-fg-muted">
                    ns_{k.mode}_••••{k.last4}
                  </td>
                  <td className="px-5 py-3">
                    <StatusBadge status={k.mode} />
                  </td>
                  <td className="px-5 py-3 text-fg-subtle">
                    {k.lastUsedAt ? new Date(k.lastUsedAt).toLocaleString() : "Never"}
                  </td>
                  <td className="px-5 py-3 text-right">
                    {k.revoked ? (
                      <span className="text-xs text-fg-subtle">Revoked</span>
                    ) : (
                      <button className="btn btn-danger" onClick={() => revoke(k.id)}>
                        Revoke
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
