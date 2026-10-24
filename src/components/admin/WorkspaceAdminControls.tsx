"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { setWorkspaceStatusAction, changeWorkspacePlanAction, deleteWorkspaceAction } from "@/app/admin/actions";
import { confirmDialog } from "@/components/ui/Confirm";

export function WorkspaceAdminControls({
  workspaceId,
  status,
  currentPlanId,
  plans,
}: {
  workspaceId: string;
  status: string;
  currentPlanId: string;
  plans: { id: string; name: string; price: number }[];
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [plan, setPlan] = useState(currentPlanId);

  async function setStatus(s: "active" | "restricted" | "suspended") {
    let reason = "";
    if (s === "restricted") {
      reason = prompt("Reason for restricting this tenant?") || "Restricted by admin";
    } else if (s === "suspended") {
      if (!(await confirmDialog("Suspend this tenant? Their API and dashboard will be locked."))) return;
    }
    start(async () => {
      await setWorkspaceStatusAction(workspaceId, s, reason);
      router.refresh();
    });
  }

  function changePlan(planId: string) {
    setPlan(planId);
    start(async () => {
      await changeWorkspacePlanAction(workspaceId, planId);
      router.refresh();
    });
  }

  async function remove() {
    if (!(await confirmDialog("Permanently DELETE this tenant and all of its data? This cannot be undone."))) return;
    start(async () => {
      await deleteWorkspaceAction(workspaceId);
      router.push("/admin/users");
    });
  }

  return (
    <div className="card p-5 space-y-5">
      <h2 className="font-semibold">Admin controls</h2>

      <div>
        <p className="label">Status</p>
        <div className="flex gap-2">
          <button className="btn btn-secondary" disabled={pending || status === "active"} onClick={() => setStatus("active")}>Activate</button>
          <button className="btn btn-secondary" disabled={pending || status === "restricted"} onClick={() => setStatus("restricted")}>Restrict</button>
          <button className="btn btn-danger" disabled={pending || status === "suspended"} onClick={() => setStatus("suspended")}>Suspend</button>
        </div>
        <p className="text-xs text-fg-subtle mt-2">
          Restrict = block sending. Suspend = lock API + dashboard.
        </p>
      </div>

      <div>
        <p className="label">Plan</p>
        <select className="input max-w-xs" value={plan} onChange={(e) => changePlan(e.target.value)} disabled={pending}>
          {plans.map((p) => (
            <option key={p.id} value={p.id}>{p.name}{p.price > 0 ? ` · $${p.price}/mo` : " · Free"}</option>
          ))}
        </select>
      </div>

      <div className="pt-4 border-t border-border">
        <button className="btn btn-danger" disabled={pending} onClick={remove}>Delete tenant</button>
      </div>
    </div>
  );
}
