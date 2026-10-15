"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CopyButton } from "@/components/CopyButton";
import { CodeDrawer } from "@/components/dashboard/CodeDrawer";
import { createApiKeyAction, revokeApiKeyAction, type ActionState } from "@/app/(app)/actions";

export type KeyView = {
  id: string;
  name: string;
  mode: string;
  keyPrefix: string;
  last4: string;
  permission: string;
  lastUsedAt: string | null;
  createdAt: string;
  revoked: boolean;
};

const initial: ActionState = { ok: false };
const PERMISSION_LABEL: Record<string, string> = {
  full_access: "Full access",
  sending_access: "Sending access",
};

export function ApiKeysManager({
  keys,
  domains,
}: {
  keys: KeyView[];
  domains: { id: string; name: string }[];
}) {
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
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">API keys</h1>
        <div className="flex items-center gap-2">
          <button className="btn btn-primary" onClick={() => setCreating(true)}>
            + Create API key
          </button>
          <CodeDrawer resource="api-keys" />
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        <input className="input flex-1 min-w-[200px]" placeholder="Search..." />
        <span className="btn btn-secondary">All permissions ▾</span>
      </div>

      {/* Create modal */}
      {creating && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.6)" }} onClick={() => setCreating(false)}>
          <form action={action} className="card w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-lg">Add API Key</h2>
              <button type="button" className="btn btn-ghost px-2" onClick={() => setCreating(false)}>✕</button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="label">Name</label>
                <input name="name" className="input" placeholder="Your API Key name" required autoFocus />
              </div>
              <input type="hidden" name="mode" value="live" />
              <div>
                <label className="label">Permission</label>
                <select name="permission" className="input" defaultValue="full_access">
                  <option value="full_access">Full access</option>
                  <option value="sending_access">Sending access</option>
                </select>
              </div>
              <div>
                <label className="label">Domain</label>
                <select name="domainScope" className="input" defaultValue="all">
                  <option value="all">All domains</option>
                  {domains.map((d) => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </div>
              {state.error && <p className="text-sm" style={{ color: "var(--danger)" }}>{state.error}</p>}
            </div>
            <div className="flex justify-end gap-2 mt-5">
              <button type="button" className="btn btn-secondary" onClick={() => setCreating(false)}>Cancel</button>
              <button type="submit" className="btn btn-primary" disabled={pending}>{pending ? "Adding…" : "Add"}</button>
            </div>
          </form>
        </div>
      )}

      {/* Reveal-once modal */}
      {revealed && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.6)" }}>
          <div className="card w-full max-w-lg p-6">
            <h2 className="font-semibold text-lg">Save your API key</h2>
            <p className="text-sm text-fg-muted mt-1">This is the only time you’ll see this key. Store it somewhere safe.</p>
            <div className="mono text-sm break-all rounded-lg px-4 py-3 mt-4" style={{ background: "var(--bg-elevated)", border: "1px solid var(--border-strong)" }}>
              {revealed}
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <CopyButton value={revealed} label="Copy key" />
              <button className="btn btn-primary" onClick={() => setRevealed(null)}>Done</button>
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
                <th className="px-5 py-3 font-medium">Token</th>
                <th className="px-5 py-3 font-medium">Permission</th>
                <th className="px-5 py-3 font-medium">Last used</th>
                <th className="px-5 py-3 font-medium">Created</th>
                <th className="px-5 py-3 font-medium text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {keys.map((k) => (
                <tr key={k.id} className="border-b border-border last:border-0">
                  <td className="px-5 py-3 font-medium">{k.name}</td>
                  <td className="px-5 py-3">
                    <code className="mono text-xs rounded px-2 py-1" style={{ background: "var(--bg-hover)", color: "var(--fg-muted)" }}>
                      {k.keyPrefix || `ns_${k.mode}`}…
                    </code>
                  </td>
                  <td className="px-5 py-3 text-fg-muted">{PERMISSION_LABEL[k.permission] ?? k.permission}</td>
                  <td className="px-5 py-3 text-fg-subtle">
                    {k.lastUsedAt ? new Date(k.lastUsedAt).toLocaleString() : "Never"}
                  </td>
                  <td className="px-5 py-3 text-fg-subtle">{new Date(k.createdAt).toLocaleDateString()}</td>
                  <td className="px-5 py-3 text-right">
                    {k.revoked ? (
                      <span className="text-xs text-fg-subtle">Revoked</span>
                    ) : (
                      <button className="btn btn-danger !py-1 !px-2 text-xs" onClick={() => revoke(k.id)}>Revoke</button>
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
