import { notFound } from "next/navigation";

/**
 * Target of proxy.ts rewrites for unknown blog posts and tags. It sits outside
 * the (marketing) loading boundary, so notFound() runs before any streaming and
 * the response is a real 404 (rendered by app/not-found.tsx).
 */
export const dynamic = "force-static";

export default function PageNotFound() {
  notFound();
}
