import { XML_HEADERS, indexXml } from "@/lib/sitemaps";

export const revalidate = 3600;

/** Blog sitemap index: the blog post and category sitemaps only. */
export async function GET() {
  return new Response(await indexXml(true), { headers: XML_HEADERS });
}
