"use client";

import { useActionState, useState } from "react";
import { FormNote } from "@/components/ui/Modal";
import { saveUnsubscribePageAction, type SettingsState } from "@/app/(app)/settings-actions";

type Page = { heading: string; message: string; confirmation: string; brandColor: string; showTopics: boolean };
const initialState: SettingsState = { ok: false };

export function UnsubscribeEditor({ team, initial }: { team: string; initial: Page }) {
  const [p, setP] = useState(initial);
  const [state, action, pending] = useActionState(saveUnsubscribePageAction, initialState);
  const set = (k: keyof Page, v: string | boolean) => setP((x) => ({ ...x, [k]: v }));

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <form action={action} className="card space-y-4 p-6">
        <div>
          <h2 className="font-medium">Hosted unsubscribe page</h2>
          <p className="mt-1 text-sm text-fg-muted">Every broadcast and automation email gets a personal unsubscribe link plus one-click <code className="mono text-xs">List-Unsubscribe</code> headers (required by Gmail and Yahoo). Customise what recipients see.</p>
        </div>
        <div>
          <label className="label" htmlFor="u-h">Heading</label>
          <input id="u-h" name="heading" className="input" value={p.heading} onChange={(e) => set("heading", e.target.value)} maxLength={120} />
        </div>
        <div>
          <label className="label" htmlFor="u-m">Message</label>
          <textarea id="u-m" name="message" className="input" rows={2} value={p.message} onChange={(e) => set("message", e.target.value)} maxLength={500} />
        </div>
        <div>
          <label className="label" htmlFor="u-c">Confirmation message</label>
          <textarea id="u-c" name="confirmation" className="input" rows={2} value={p.confirmation} onChange={(e) => set("confirmation", e.target.value)} maxLength={500} />
        </div>
        <div className="flex flex-wrap items-center gap-6">
          <label className="flex items-center gap-2 text-sm">
            <input type="color" name="brandColor" value={p.brandColor} onChange={(e) => set("brandColor", e.target.value)} className="h-8 w-10 cursor-pointer rounded border border-border-strong bg-transparent" />
            Brand colour
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="showTopics" checked={p.showTopics} onChange={(e) => set("showTopics", e.target.checked)} />
            Let recipients choose topics
          </label>
        </div>
        <FormNote state={state} />
        <button className="btn btn-primary" disabled={pending}>{pending ? "Saving…" : "Save"}</button>
      </form>

      <div className="rounded-2xl p-8" style={{ background: "#f5f3f2" }} aria-label="Preview">
        <p className="mb-3 text-xs uppercase tracking-widest text-gray-400">Preview</p>
        <div className="mx-auto max-w-sm rounded-3xl bg-white p-7 text-[#112220] shadow-xl">
          <p className="text-sm font-semibold" style={{ color: p.brandColor }}>{team}</p>
          <p className="mt-3 text-xl font-semibold tracking-tight">{p.heading}</p>
          <p className="mt-2 text-sm text-gray-500">{p.message}</p>
          {p.showTopics && (
            <div className="mt-4 space-y-2">
              {["Product updates", "Weekly digest"].map((t) => (
                <div key={t} className="flex items-center gap-2 rounded-xl border border-gray-200 p-2.5 text-sm"><span className="h-4 w-4 rounded" style={{ background: p.brandColor }} />{t}</div>
              ))}
            </div>
          )}
          <div className="mt-5 rounded-full py-2.5 text-center text-sm font-semibold text-white" style={{ background: p.brandColor }}>Unsubscribe from all</div>
          <p className="mt-5 text-center text-[11px] text-gray-400">Powered by Stack Emails</p>
        </div>
      </div>
    </div>
  );
}
