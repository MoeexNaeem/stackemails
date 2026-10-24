"use client";

import { useEffect, useRef, useState } from "react";
import { Icon } from "@/components/ui/Icon";

type Msg = { role: "user" | "assistant"; content: string };

const SUGGESTIONS = [
  "How do I verify my domain?",
  "Why am I getting 403 domain_not_verified?",
  "How do I keep emails out of spam?",
  "How do I contact human support?",
];

/** Tiny, safe renderer: **bold**, `code`, ```blocks``` and line breaks - no HTML injection. */
function Rich({ text }: { text: string }) {
  const parts = text.split(/```(?:\w+)?\n?([\s\S]*?)```/g);
  return (
    <>
      {parts.map((p, i) =>
        i % 2 === 1 ? (
          <pre key={i} className="my-2 overflow-x-auto rounded-xl p-3 text-xs mono" style={{ background: "var(--bg)", border: "1px solid var(--border)" }}>
            {p.trim()}
          </pre>
        ) : (
          <span key={i} className="whitespace-pre-wrap">
            {p.split(/(\*\*[^*]+\*\*|`[^`]+`)/g).map((s, j) =>
              s.startsWith("**") ? <strong key={j} className="font-semibold text-fg">{s.slice(2, -2)}</strong> : s.startsWith("`") ? <code key={j} className="mono text-[0.85em] rounded px-1 py-0.5" style={{ background: "var(--bg-hover)" }}>{s.slice(1, -1)}</code> : s,
            )}
          </span>
        ),
      )}
    </>
  );
}

export function AssistantPanel({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 50);
  }, [open]);
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  async function ask(question: string) {
    const q = question.trim();
    if (!q || busy) return;
    const history: Msg[] = [...messages, { role: "user", content: q }];
    setMessages([...history, { role: "assistant", content: "" }]);
    setInput("");
    setBusy(true);
    try {
      const res = await fetch("/api/assistant", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ messages: history.slice(-20) }),
      });
      if (!res.ok || !res.body) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error?.message ?? "The assistant is unavailable right now.");
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let acc = "";
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        acc += decoder.decode(value, { stream: true });
        setMessages([...history, { role: "assistant", content: acc }]);
      }
    } catch (e) {
      setMessages([...history, { role: "assistant", content: e instanceof Error ? e.message : "Something went wrong." }]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className={`fixed inset-y-0 right-0 z-[60] flex w-full max-w-[420px] flex-col border-l border-border shadow-2xl transition-transform duration-300 ${open ? "translate-x-0" : "translate-x-full"}`}
      style={{ background: "var(--bg-elevated)" }}
      role="dialog"
      aria-label="Ask anything"
      aria-hidden={!open}
      inert={!open}
    >
      <div className="flex h-16 items-center justify-between border-b border-border px-5">
        <div className="flex items-center gap-2">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--violet)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3l1.8 4.7L18.5 9.5l-4.7 1.8L12 16l-1.8-4.7L5.5 9.5l4.7-1.8z" /></svg>
          <p className="font-medium">Ask anything</p>
        </div>
        <div className="flex items-center gap-1">
          {messages.length > 0 && (
            <button className="btn btn-ghost btn-sm" onClick={() => setMessages([])} disabled={busy}>New chat</button>
          )}
          <button className="btn btn-ghost w-8 h-8 px-0" onClick={onClose} aria-label="Close assistant"><Icon name="x" size={16} /></button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4 text-sm">
        {messages.length === 0 ? (
          <div className="flex h-full flex-col justify-end gap-2 pb-2">
            <p className="text-fg-muted mb-2">Ask about sending, domains, deliverability or the API.</p>
            {SUGGESTIONS.map((s, i) => (
              <button key={s} onClick={() => ask(s)} className="flex items-center gap-3 rounded-xl border border-border px-3 py-2.5 text-left text-fg-muted hover:bg-bg-hover hover:text-fg">
                <span className="kbd">{i + 1}</span>
                {s}
              </button>
            ))}
          </div>
        ) : (
          messages.map((m, i) => (
            <div key={i} className={m.role === "user" ? "flex justify-end" : ""}>
              <div
                className={m.role === "user" ? "max-w-[85%] rounded-2xl rounded-br-md px-3.5 py-2.5" : "text-fg-muted leading-relaxed"}
                style={m.role === "user" ? { background: "var(--bg-hover)" } : undefined}
              >
                {m.content ? <Rich text={m.content} /> : <span className="inline-flex gap-1"><Dot /><Dot d={150} /><Dot d={300} /></span>}
              </div>
            </div>
          ))
        )}
        <div ref={endRef} />
      </div>

      <form
        className="border-t border-border p-3"
        onSubmit={(e) => {
          e.preventDefault();
          ask(input);
        }}
      >
        <div className="flex items-end gap-2 rounded-2xl border border-border-strong px-3 py-2" style={{ background: "var(--bg)" }}>
          <textarea
            ref={inputRef}
            rows={1}
            value={input}
            maxLength={4000}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                ask(input);
              }
            }}
            placeholder="What can I do for you today?"
            className="flex-1 resize-none bg-transparent py-1 text-sm outline-none placeholder:text-fg-subtle max-h-32"
          />
          <button type="submit" disabled={busy || !input.trim()} className="btn btn-primary w-8 h-8 px-0" aria-label="Send">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M12 19V5M5 12l7-7 7 7" /></svg>
          </button>
        </div>
        <p className="mt-2 px-1 text-[11px] text-fg-subtle">AI answers can be wrong. For account issues use Help &gt; New ticket.</p>
      </form>
    </div>
  );
}

function Dot({ d = 0 }: { d?: number }) {
  return <span className="h-1.5 w-1.5 rounded-full bg-fg-subtle animate-pulse" style={{ animationDelay: `${d}ms` }} />;
}
