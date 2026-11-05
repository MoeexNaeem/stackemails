import { XML_HEADERS, indexXml } from "@/lib/sitemaps";

export const revalidate = 3600;

/** Sitemap index: points to one sitemap per section (see lib/sitemaps.ts). */
export async function GET() {
  return new Response(await indexXml(), { headers: XML_HEADERS });
}
