"use client";

import { useActionState, useEffect, useRef } from "react";
import { submitContactAction, type ContactState } from "@/app/(marketing)/contact/actions";

const TOPICS = [
  ["sales", "Sales & pricing"],
  ["support", "Technical support"],
  ["partnership", "Partnerships"],
  ["press", "Press"],
  ["other", "Something else"],
];

export function ContactForm() {
  const [state, action, pending] = useActionState<ContactState, FormData>(submitContactAction, null);
  const topicRef = useRef<HTMLSelectElement>(null);

  // Preselect ?topic=… after mount, so the page itself can stay static.
  useEffect(() => {
    const t = new URLSearchParams(window.location.search).get("topic");
    if (t && topicRef.current && TOPICS.some(([v]) => v === t)) topicRef.current.value = t;
  }, []);

  if (state?.ok) {
    return (
      <div className="m-card text-center" role="status">
        <p className="m-h3">Thanks, message received.</p>
        <p className="m-body mt-2" style={{ color: "var(--m-muted)" }}>We usually reply within one business day.</p>
      </div>
    );
  }

  const err = (k: string) => state?.fieldErrors?.[k] && <p className="mt-1.5 text-[13px] text-red-500">{state.fieldErrors[k]}</p>;

  return (
    <form action={action} className="m-card space-y-5" noValidate>
      <div className="grid gap-5 sm:grid-cols-2">
        <label className="block">
          <span className="text-[14px] font-medium" style={{ color: "var(--m-head)" }}>Name</span>
          <input name="name" required autoComplete="name" className="m-input mt-1.5" />
          {err("name")}
        </label>
        <label className="block">
          <span className="text-[14px] font-medium" style={{ color: "var(--m-head)" }}>Work email</span>
          <input name="email" type="email" required autoComplete="email" className="m-input mt-1.5" />
          {err("email")}
        </label>
        <label className="block">
          <span className="text-[14px] font-medium" style={{ color: "var(--m-head)" }}>Company <span style={{ color: "var(--m-faint)" }}>(optional)</span></span>
          <input name="company" autoComplete="organization" className="m-input mt-1.5" />
        </label>
        <label className="block">
          <span className="text-[14px] font-medium" style={{ color: "var(--m-head)" }}>Topic</span>
          <select ref={topicRef} name="topic" defaultValue="sales" className="m-input mt-1.5">
            {TOPICS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </label>
      </div>
      <label className="block">
        <span className="text-[14px] font-medium" style={{ color: "var(--m-head)" }}>Monthly email volume <span style={{ color: "var(--m-faint)" }}>(optional)</span></span>
        <input name="volume" placeholder="e.g. 200,000" className="m-input mt-1.5" />
      </label>
      <label className="block">
        <span className="text-[14px] font-medium" style={{ color: "var(--m-head)" }}>How can we help?</span>
        <textarea name="message" required rows={5} className="m-input mt-1.5 !rounded-2xl" />
        {err("message")}
      </label>
      {/* Honeypot */}
      <div aria-hidden className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
        <label>Website <input name="website" tabIndex={-1} autoComplete="off" /></label>
      </div>
      {state?.error && <p className="text-[14px] text-red-500" role="alert">{state.error}</p>}
      <button type="submit" disabled={pending} className="m-btn m-btn-ink w-full sm:w-auto">{pending ? "Sending…" : "Send message"}</button>
      <p className="text-[13px]" style={{ color: "var(--m-faint)" }}>By sending this form you agree to our <a href="/privacy" className="underline">privacy policy</a>.</p>
    </form>
  );
}
