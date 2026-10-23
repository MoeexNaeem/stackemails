import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { revalidatePath } from "next/cache";
import { connectToDatabase } from "@/lib/db/connect";
import { Contact, Topic, Workspace } from "@/lib/db/models";
import { isSubscribedToTopic, verifyUnsubscribeToken } from "@/lib/contacts";
import { emitEvent } from "@/lib/webhooks/dispatch";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Email preferences", robots: { index: false, follow: false } };

async function load(token: string) {
  const id = verifyUnsubscribeToken(token);
  if (!id) return null;
  await connectToDatabase();
  const contact = await Contact.findById(id);
  if (!contact) return null;
  const [workspace, topics] = await Promise.all([
    Workspace.findById(contact.workspaceId).lean(),
    Topic.find({ workspaceId: contact.workspaceId, visibility: "public" }).sort({ createdAt: 1 }).lean(),
  ]);
  if (!workspace) return null;
  return { contact, workspace, topics };
}

export default async function PreferencesPage({ params, searchParams }: { params: Promise<{ token: string }>; searchParams: Promise<{ saved?: string }> }) {
  const { token } = await params;
  const { saved } = await searchParams;
  const data = await load(token);
  if (!data) notFound();
  const { contact, workspace, topics } = data;
  const page: Partial<NonNullable<typeof workspace.unsubscribePage>> = workspace.unsubscribePage ?? {};
  const color = /^#[0-9a-f]{3,8}$/i.test(page.brandColor ?? "") ? page.brandColor! : "#15171a";

  async function save(formData: FormData) {
    "use server";
    const d = await load(token);
    if (!d) return;
    const all = formData.get("action") === "unsubscribe_all";
    const resub = formData.get("action") === "resubscribe";
    d.contact.topics = d.topics.map((t) => ({ topicId: t._id, subscribed: !all && formData.get(`topic_${t._id}`) === "on" })) as never;
    if (all) {
      d.contact.unsubscribed = true;
      d.contact.unsubscribedAt = new Date();
    } else if (resub) {
      d.contact.unsubscribed = false;
    }
    await d.contact.save();
    emitEvent(String(d.contact.workspaceId), "contact.updated", { id: String(d.contact._id), email: d.contact.email, unsubscribed: d.contact.unsubscribed }).catch(() => {});
    revalidatePath(`/u/${token}`);
    const { redirect } = await import("next/navigation");
    redirect(`/u/${token}?saved=${all ? "all" : "1"}`);
  }

  return (
    <main className="mkt min-h-dvh flex items-center justify-center px-5 py-16" style={{ background: "var(--m-linen)" }}>
      <div className="w-full max-w-md rounded-3xl bg-white p-8 shadow-[0_25px_50px_-12px_rgba(0,0,0,0.12)]" style={{ border: "1px solid var(--m-line)" }}>
        <p className="text-sm font-semibold" style={{ color }}>{workspace.name}</p>
        {saved === "all" || contact.unsubscribed ? (
          <>
            <h1 className="mt-3 text-2xl font-semibold tracking-tight" style={{ color: "var(--m-head)" }}>You&apos;re unsubscribed</h1>
            <p className="mt-2 m-body" style={{ color: "var(--m-muted)" }}>{page.confirmation || "You won't receive these emails anymore."}</p>
            <p className="mt-1 text-sm" style={{ color: "var(--m-faint)" }}>{contact.email}</p>
            <form action={save} className="mt-6">
              <button name="action" value="resubscribe" className="m-btn m-btn-light w-full">Resubscribe</button>
            </form>
          </>
        ) : (
          <>
            <h1 className="mt-3 text-2xl font-semibold tracking-tight" style={{ color: "var(--m-head)" }}>{page.heading || "Do you want to unsubscribe?"}</h1>
            <p className="mt-2 m-body" style={{ color: "var(--m-muted)" }}>{page.message || "Confirm your email preferences below."}</p>
            <p className="mt-1 text-sm" style={{ color: "var(--m-faint)" }}>{contact.email}</p>
            {saved === "1" && <p className="mt-4 rounded-xl px-3 py-2 text-sm" style={{ background: "#ecfdf5", color: "#047857" }}>Your preferences were saved.</p>}
            <form action={save} className="mt-6 space-y-3">
              {page.showTopics !== false && topics.length > 0 && (
                <fieldset className="space-y-2">
                  <legend className="mb-2 text-sm font-medium" style={{ color: "var(--m-head)" }}>Choose what you receive</legend>
                  {topics.map((t) => (
                    <label key={String(t._id)} className="flex items-start gap-3 rounded-xl p-3 cursor-pointer" style={{ border: "1px solid var(--m-line)" }}>
                      <input type="checkbox" name={`topic_${t._id}`} defaultChecked={isSubscribedToTopic(contact, t)} className="mt-1 h-4 w-4" style={{ accentColor: color }} />
                      <span>
                        <span className="block text-[15px] font-medium" style={{ color: "var(--m-head)" }}>{t.name}</span>
                        {t.description && <span className="block text-sm" style={{ color: "var(--m-muted)" }}>{t.description}</span>}
                      </span>
                    </label>
                  ))}
                </fieldset>
              )}
              {page.showTopics !== false && topics.length > 0 && (
                <button name="action" value="save" className="m-btn m-btn-light w-full">Save preferences</button>
              )}
              <button name="action" value="unsubscribe_all" className="m-btn w-full text-white" style={{ background: color }}>Unsubscribe from all</button>
            </form>
          </>
        )}
        <p className="mt-8 text-center text-xs" style={{ color: "var(--m-faint)" }}>
          Powered by <a href="https://stackemails.com" className="underline">Stack Emails</a>
        </p>
      </div>
    </main>
  );
}
