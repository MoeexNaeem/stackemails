"use client";

import Link from "next/link";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteTemplateAction } from "@/app/(app)/actions";

export type TemplateView = {
  id: string;
  name: string;
  subject: string;
  category: string;
  html: string;
  updatedAt: string;
};

export function MyTemplates({ templates }: { templates: TemplateView[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();

  function remove(id: string) {
    if (!confirm("Delete this template?")) return;
    start(async () => {
      await deleteTemplateAction(id);
      router.refresh();
    });
  }

  if (templates.length === 0) {
    return (
      <div className="card px-5 py-12 text-center">
        <p className="text-fg-muted">No saved templates yet.</p>
        <p className="text-sm text-fg-subtle mt-1">Start from one of the templates below.</p>
      </div>
    );
  }

  return (
    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {templates.map((t) => (
        <div key={t.id} className="card overflow-hidden group">
          <Link href={`/templates/${t.id}`} className="block">
            <div className="h-40 overflow-hidden border-b border-border bg-white">
              <iframe title={t.name} sandbox="" srcDoc={t.html} className="w-[200%] h-[320px] origin-top-left pointer-events-none" style={{ transform: "scale(0.5)" }} />
            </div>
          </Link>
          <div className="p-4 flex items-start justify-between">
            <div className="min-w-0">
              <Link href={`/templates/${t.id}`} className="font-medium hover:text-accent block truncate">
                {t.name}
              </Link>
              <p className="text-xs text-fg-subtle truncate">{t.subject || "No subject"}</p>
            </div>
            <button className="btn btn-ghost !px-2 !py-1 text-xs" onClick={() => remove(t.id)} disabled={pending}>
              Delete
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
