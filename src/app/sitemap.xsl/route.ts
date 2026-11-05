/** Human-readable styling for the XML sitemaps (crawlers ignore it). */
export const dynamic = "force-static";

const XSL = `<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform" xmlns:s="http://www.sitemaps.org/schemas/sitemap/0.9">
<xsl:output method="html" encoding="UTF-8" indent="yes"/>
<xsl:template match="/">
<html><head><title>XML Sitemap · Stack Emails</title><meta name="robots" content="noindex"/>
<style>body{font:15px/1.5 -apple-system,Segoe UI,Roboto,sans-serif;color:#18181b;margin:0;padding:40px 20px;background:#fafafa}main{max-width:960px;margin:0 auto}h1{font-size:26px;margin:0 0 6px}p{color:#71717a;margin:0 0 24px}table{width:100%;border-collapse:collapse;background:#fff;border:1px solid #e4e4e7;border-radius:12px;overflow:hidden}th,td{text-align:left;padding:10px 14px;border-bottom:1px solid #f1f1f3;font-size:14px}th{background:#f4f4f5;font-weight:600}a{color:#4f46e5;text-decoration:none;word-break:break-all}a:hover{text-decoration:underline}td.d{color:#71717a;white-space:nowrap}</style></head>
<body><main>
<h1>Stack Emails XML Sitemap</h1>
<xsl:choose>
<xsl:when test="s:sitemapindex">
<p>This sitemap index lists <xsl:value-of select="count(s:sitemapindex/s:sitemap)"/> sitemaps. It is used by search engines; <a href="https://stackemails.com/">back to stackemails.com</a>.</p>
<table><tr><th>Sitemap</th><th>Last modified</th></tr>
<xsl:for-each select="s:sitemapindex/s:sitemap"><tr><td><a href="{s:loc}"><xsl:value-of select="s:loc"/></a></td><td class="d"><xsl:value-of select="substring(s:lastmod,1,10)"/></td></tr></xsl:for-each>
</table></xsl:when>
<xsl:otherwise>
<p>This sitemap contains <xsl:value-of select="count(s:urlset/s:url)"/> URLs. <a href="/sitemap.xml">Back to the sitemap index</a>.</p>
<table><tr><th>URL</th><th>Last modified</th></tr>
<xsl:for-each select="s:urlset/s:url"><tr><td><a href="{s:loc}"><xsl:value-of select="s:loc"/></a></td><td class="d"><xsl:value-of select="substring(s:lastmod,1,10)"/></td></tr></xsl:for-each>
</table></xsl:otherwise>
</xsl:choose>
</main></body></html>
</xsl:template>
</xsl:stylesheet>`;

export function GET() {
  return new Response(XSL, { headers: { "Content-Type": "text/xsl; charset=utf-8", "Cache-Control": "public, max-age=86400" } });
}
