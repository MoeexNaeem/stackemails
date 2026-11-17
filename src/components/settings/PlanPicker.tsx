"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { paddlePortalAction, requestPlanChangeAction, startPaddleUpgradeAction } from "@/app/(app)/billing-actions";
import { BankTransferForm, type ManualPayInfo } from "@/components/settings/BankTransferForm";
import { usePaddle, type PaddleConfig } from "@/components/settings/usePaddle";

type P = { id: string; slug: string; name: string; price: number; monthly: number; daily: number; contacts: number; features: string[] };
export type PaddleSubInfo = { active: boolean; cancelAt?: string | null; renewsAt?: string | null };

export function PlanPicker({
  plans,
  currentSlug,
  manualPay = null,
  paymentPending = false,
  paddle = null,
  paddleSub = null,
}: {
  plans: P[];
  currentSlug: string;
  manualPay?: ManualPayInfo | null;
  paymentPending?: boolean;
  paddle?: PaddleConfig | null;
  paddleSub?: PaddleSubInfo | null;
}) {
  const router = useRouter();
  const [note, setNote] = useState<{ ok: boolean; text: string } | null>(null);
  const [paying, setPaying] = useState<P | null>(null);
  const [pending, start] = useTransition();
  const { ready, openCheckout } = usePaddle(paddle, (e) => {
    if (e.name === "checkout.completed") {
      setNote({ ok: true, text: "Payment received, thank you! Your plan switches on within a minute; this page will refresh." });
      // Paddle tells our server by webhook; give it a moment, then reload.
      setTimeout(() => router.refresh(), 4000);
      setTimeout(() => router.refresh(), 12000);
    }
  });
  const onPaddle = Boolean(paddleSub?.active);

  function upgradeWithCard(p: P) {
    setNote(null);
    start(async () => {
      const r = await startPaddleUpgradeAction(p.id);
      if (!r.ok) return setNote({ ok: false, text: r.error });
      if (r.mode === "changed") {
        setNote({ ok: true, text: r.message });
        setTimeout(() => router.refresh(), 4000);
        return;
      }
      if (!ready) return setNote({ ok: false, text: "The payment form is still loading. Try again in a moment." });
      openCheckout(r);
    });
  }

  function manage() {
    start(async () => {
      const r = await paddlePortalAction();
      if (r.ok && r.url) window.location.href = r.url;
      else setNote({ ok: false, text: r.error ?? "Couldn't open the billing portal." });
    });
  }

  return (
    <div>
      <div className="grid gap-4 md:grid-cols-3">
        {plans.map((p) => {
          const current = p.slug === currentSlug;
          let action: React.ReactNode;
          if (paddle && p.price > 0) {
            action = current && onPaddle ? (
              <button className="btn btn-secondary mt-5" disabled={pending} onClick={manage}>Manage subscription</button>
            ) : current ? (
              <button className="btn btn-secondary mt-5" disabled>Your plan</button>
            ) : (
              <button className="btn btn-primary mt-5" disabled={pending} onClick={() => upgradeWithCard(p)}>
                {onPaddle ? `Switch to ${p.name}` : `Upgrade to ${p.name}`}
              </button>
            );
          } else if (manualPay && p.price > 0) {
            // Paid plans by bank transfer (also renews the current plan for another 30 days).
            action = (
              <button
                className={current ? "btn btn-secondary mt-5" : "btn btn-primary mt-5"}
                disabled={paymentPending}
                title={paymentPending ? "A payment is already waiting for confirmation." : undefined}
                onClick={() => { setNote(null); setPaying(p); }}
              >
                {current ? "Pay for next 30 days" : `Upgrade to ${p.name}`}
              </button>
            );
          } else if (current) {
            action = <button className="btn btn-secondary mt-5" disabled>Your plan</button>;
          } else if (p.price === 0 && onPaddle) {
            // Downgrading a card subscription = cancelling it in Paddle's portal.
            action = <button className="btn btn-secondary mt-5" disabled={pending} onClick={manage}>Cancel subscription</button>;
          } else {
            action = (
              <button
                className="btn btn-primary mt-5"
                disabled={pending}
                onClick={() => start(async () => { const r = await requestPlanChangeAction(p.id); setNote({ ok: r.ok, text: r.error ?? r.message ?? "" }); })}
              >
                {`Switch to ${p.name}`}
              </button>
            );
          }
          return (
            <div key={p.id} className="card flex flex-col p-6" style={current ? { borderColor: "var(--violet)" } : undefined}>
              <div className="flex items-center justify-between">
                <p className="text-lg font-normal">{p.name}</p>
                {current && <span className="badge" style={{ background: "color-mix(in srgb, var(--violet) 16%, transparent)", color: "var(--violet)" }}>Current</span>}
              </div>
              <p className="mt-2 text-3xl font-normal">${p.price}<span className="text-sm text-fg-subtle">/mo</span></p>
              <ul className="mt-4 flex-1 space-y-1.5 text-sm text-fg-muted">
                <li>{p.monthly.toLocaleString()} emails / month</li>
                <li>{p.daily.toLocaleString()} emails / day</li>
                <li>{p.contacts.toLocaleString()} contacts</li>
                {p.features.map((f) => <li key={f}>{f}</li>)}
              </ul>
              {action}
              {paddle && manualPay && p.price > 0 && !onPaddle && (
                <button className="mt-2 text-xs text-fg-subtle hover:text-fg underline" disabled={paymentPending} onClick={() => { setNote(null); setPaying(p); }}>
                  or pay by bank transfer
                </button>
              )}
            </div>
          );
        })}
      </div>
      {paddle && <p className="mt-3 text-xs text-fg-subtle">Card and PayPal payments are processed by Paddle, our reseller, who handles tax and sends your invoices. Cancel any time.</p>}
      {paddleSub?.cancelAt && <p className="mt-2 text-sm text-fg-muted">Your subscription is cancelled and ends on {new Date(paddleSub.cancelAt).toLocaleDateString()}. You can undo this from Manage subscription.</p>}
      {paying && manualPay && (
        <div className="mt-4">
          <BankTransferForm plan={{ id: paying.id, name: paying.name, price: paying.price }} info={manualPay} onClose={() => setPaying(null)} />
        </div>
      )}
      {note && <p className="mt-3 text-sm" style={{ color: note.ok ? "var(--success)" : "var(--danger)" }}>{note.text}</p>}
    </div>
  );
}
