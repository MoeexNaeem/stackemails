"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { isValidObjectId } from "mongoose";
import { requireDashboardContext } from "@/lib/auth/context";
import { connectToDatabase } from "@/lib/db/connect";
import { Domain, InboundEmail, Inbox } from "@/lib/db/models";
import { createAndQueueEmail } from "@/lib/email/send";
import { receivingDomain } from "@/lib/inbound";
import { setReceiving } from "@/lib/domains";
import { limitsFor } from "@/lib/plans";
import { prefixedId } from "@/lib/ids";
import { normalizeEmail } from "@/lib/contacts";

export type InboxState = { ok: boolean; error?: string; message?: string };

export async function createInboxAction(_prev: InboxState, formData: FormData): Promise<InboxState> {
  const { workspace } = await requireDashboardContext();
  await connectToDatabase();
  if (workspace.labs?.inboxes === false) return { ok: false, error: "Inboxes are turned off in Settings → Labs." };

  const local = String(formData.get("local") ?? "").trim().toLowerCase();
  const domainId = String(formData.get("domainId") ?? "");
  const mode = formData.get("receiveMode") === "domain" ? "domain" : "alias";
  if (!/^[a-z0-9][a-z0-9._+-]{0,63}$/.test(local)) return { ok: false, error: "Use letters, numbers, dots, dashes or plus for the address." };
  if (!isValidObjectId(domainId)) return { ok: false, error: "Choose a verified domain." };
  const maxInboxes = limitsFor(workspace.plan).inboxes;
  if ((await Inbox.countDocuments({ workspaceId: workspace._id })) >= maxInboxes) return { ok: false, error: `Your plan includes ${maxInboxes} inboxes. Upgrade to add more.` };
  const domain = await Domain.findOne({ _id: domainId, workspaceId: workspace._id, status: "verified" });
  if (!domain) return { ok: false, error: "You need a verified domain for sending to create an inbox." };

  if (mode === "domain" && !domain.receivingEnabled) {
    await setReceiving(domain, true); // user chose "Enable receiving" (MX record shown on the domain page)
  }
  const address = `${local}@${domain.name}`;
  const alias = mode === "alias" ? `${local}@${await receivingDomain(workspace)}` : undefined;
  try {
    const inbox = await Inbox.create({
      workspaceId: workspace._id,
      name: String(formData.get("name") ?? "").trim() || local,
      address,
      domainId: domain._id,
      receiveMode: mode,
      alias,
    });
    revalidatePath("/inboxes", "layout");
    redirect(`/inboxes/${inbox._id}`);
  } catch (e) {
    if ((e as { code?: number }).code === 11000) return { ok: false, error: `${address} is already an inbox.` };
    throw e;
  }
}

export async function deleteInboxAction(id: string): Promise<void> {
  const { workspace } = await requireDashboardContext();
  await connectToDatabase();
  if (!isValidObjectId(id)) return;
  await Inbox.deleteOne({ _id: id, workspaceId: workspace._id });
  await InboundEmail.updateMany({ workspaceId: workspace._id, inboxId: id }, { $unset: { inboxId: 1 } });
  revalidatePath("/inboxes", "layout");
  redirect("/inboxes");
}

/** Reply within a thread, or start a new conversation, from an inbox address. */
export async function sendFromInboxAction(_prev: InboxState, formData: FormData): Promise<InboxState> {
  const { workspace, user } = await requireDashboardContext();
  await connectToDatabase();
  const inboxId = String(formData.get("inboxId") ?? "");
  if (!isValidObjectId(inboxId)) return { ok: false, error: "Inbox not found." };
  const inbox = await Inbox.findOne({ _id: inboxId, workspaceId: workspace._id });
  if (!inbox) return { ok: false, error: "Inbox not found." };

  const body = String(formData.get("body") ?? "").trim();
  if (!body) return { ok: false, error: "Write a message first." };
  const threadId = String(formData.get("threadId") ?? "");

  let to: string | null;
  let subject = String(formData.get("subject") ?? "").trim();
  const headers: { name: string; value: string }[] = [];
  if (threadId) {
    const last = await InboundEmail.findOne({ workspaceId: workspace._id, inboxId: inbox._id, threadId, direction: "inbound" }).sort({ createdAt: -1 }).lean();
    if (!last) return { ok: false, error: "Conversation not found." };
    to = last.from;
    subject = /^re:/i.test(last.subject) ? last.subject : `Re: ${last.subject}`;
    if (last.rfcMessageId) {
      headers.push({ name: "In-Reply-To", value: last.rfcMessageId }, { name: "References", value: last.rfcMessageId });
    }
  } else {
    to = normalizeEmail(String(formData.get("to") ?? ""));
    if (!to) return { ok: false, error: "Enter a valid recipient." };
    if (!subject) return { ok: false, error: "Add a subject." };
  }

  const esc = body.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const res = await createAndQueueEmail(workspace, {
    from: `${inbox.name} <${inbox.address}>`,
    to: [to],
    replyTo: [inbox.alias || inbox.address],
    subject,
    text: body,
    html: `<div style="font:15px/1.6 -apple-system,Segoe UI,Roboto,sans-serif;color:#111">${esc.replace(/\n/g, "<br>")}</div>`,
    headers,
    source: "inbox",
  });
  if (!res.ok) return { ok: false, error: res.message };

  await InboundEmail.create({
    workspaceId: workspace._id,
    inboxId: inbox._id,
    messageId: prefixedId("out"),
    threadId: threadId || prefixedId("thr", 16),
    from: inbox.address,
    fromName: user.name,
    to: [to],
    subject,
    text: body,
    snippet: body.replace(/\s+/g, " ").slice(0, 160),
    read: true,
    direction: "outbound",
  });
  revalidatePath(`/inboxes/${inbox._id}`);
  return { ok: true, message: "Sent." };
}
