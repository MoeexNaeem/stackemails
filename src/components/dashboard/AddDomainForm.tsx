"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createDomainAction, type ActionState } from "@/app/(app)/actions";

const initial: ActionState = { ok: false };

export function AddDomainForm() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState(createDomainAction, initial);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.ok) {
      formRef.current?.reset();
      setOpen(false);
      router.refresh();
    }
  }, [state, router]);

  if (!open) {
    return (
      <button className="btn btn-primary" onClick={() => setOpen(true)}>
        Add domain
      </button>
    );
  }

  return (
    <form ref={formRef} action={action} className="flex items-start gap-2">
      <div>
        <input
          name="name"
          className="input w-64"
          placeholder="mail.acme.com"
          autoFocus
          required
        />
        {state.error && (
          <p className="text-xs mt-1" style={{ color: "var(--danger)" }}>
            {state.error}
          </p>
        )}
      </div>
      <select name="region" className="input w-40" defaultValue="us-east-1">
        <option value="us-east-1">us-east-1</option>
        <option value="us-west-2">us-west-2</option>
        <option value="eu-west-1">eu-west-1</option>
        <option value="ap-south-1">ap-south-1</option>
      </select>
      <button type="submit" className="btn btn-primary" disabled={pending}>
        {pending ? "Adding…" : "Add"}
      </button>
      <button type="button" className="btn btn-ghost" onClick={() => setOpen(false)}>
        Cancel
      </button>
    </form>
  );
}
