import { SITEMAPS, XML_HEADERS, urlsetXml } from "@/lib/sitemaps";

export const revalidate = 3600;
export const dynamicParams = false;

export function generateStaticParams() {
  return Object.keys(SITEMAPS).map((name) => ({ name: `${name}.xml` }));
}

export async function GET(_req: Request, { params }: { params: Promise<{ name: string }> }) {
  const name = (await params).name.replace(/\.xml$/, "");
  const map = SITEMAPS[name];
  if (!map) return new Response("Not found", { status: 404 });
  return new Response(urlsetXml(await map.build()), { headers: XML_HEADERS });
}
