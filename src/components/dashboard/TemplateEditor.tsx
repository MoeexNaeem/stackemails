"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { saveTemplateAction, type ActionState } from "@/app/(app)/actions";

const initial: ActionState = { ok: false };

export function TemplateEditor({
  id,
  name,
  subject,
  html: initialHtml,
}: {
  id: string;
  name: string;
  subject: string;
  html: string;
}) {
  const [html, setHtml] = useState(initialHtml);
  const [state, save, saving] = useActionState(saveTemplateAction, initial);

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Link href="/templates" className="text-sm text-fg-muted hover:text-fg">← Templates</Link>
        <span className="text-fg-subtle">/</span>
        <span className="font-medium">{name}</span>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <form action={save} className="space-y-4">
          <input type="hidden" name="id" value={id} />
          <input type="hidden" name="html" value={html} />
          <div className="card p-5 space-y-4">
            <div>
              <label className="label">Template name</label>
              <input name="name" className="input" defaultValue={name} required />
            </div>
            <div>
              <label className="label">Subject</label>
              <input name="subject" className="input" defaultValue={subject} placeholder="Your subject line" />
            </div>
          </div>
          <div className="card overflow-hidden">
            <div className="px-4 py-2.5 border-b border-border text-sm font-medium">HTML content</div>
            <textarea className="input font-mono text-xs rounded-none border-0" rows={16} value={html} onChange={(e) => setHtml(e.target.value)} />
          </div>
          <div className="flex items-center gap-3">
            <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? "Saving…" : "Save template"}</button>
            {state.ok && <span className="text-sm" style={{ color: "var(--success)" }}>Saved.</span>}
            {state.error && <span className="text-sm" style={{ color: "var(--danger)" }}>{state.error}</span>}
          </div>
        </form>

        <div className="card overflow-hidden h-fit sticky top-4">
          <div className="px-4 py-2.5 border-b border-border text-sm font-medium">Preview</div>
          <iframe title="template-preview" sandbox="" srcDoc={html} className="w-full bg-white" style={{ height: 560 }} />
        </div>
      </div>
    </div>
  );
}
