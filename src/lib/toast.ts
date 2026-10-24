import { gooeyToast } from "goey-toast";

/**
 * Notifications for client components. Thin wrapper so call sites stay small
 * and the library can be swapped in one place.
 */
export const toast = {
  success: (title: string, description?: string) => gooeyToast.success(title, description ? { description } : undefined),
  error: (title: string, description?: string) => gooeyToast.error(title, { description, duration: 6000 }),
  info: (title: string, description?: string) => gooeyToast.info(title, description ? { description } : undefined),
  warning: (title: string, description?: string) => gooeyToast.warning(title, description ? { description } : undefined),
  promise: gooeyToast.promise,
  dismiss: gooeyToast.dismiss,
};

/** Show the result of a server action that returns { ok, error?, message? }. */
export function toastResult(r: { ok: boolean; error?: string; message?: string } | null | undefined, fallbackSuccess?: string) {
  if (!r) return;
  if (!r.ok) toast.error(r.error || "Something went wrong", "Please try again. If it keeps happening, contact support.");
  else if (r.message || fallbackSuccess) toast.success(r.message || fallbackSuccess!);
}
