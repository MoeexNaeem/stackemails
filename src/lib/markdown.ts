import { Marked, type Tokens } from "marked";

export type TocItem = { id: string; text: string; depth: number };

const ESC: Record<string, string> = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
const escapeHtml = (s: string) => s.replace(/[&<>"']/g, (c) => ESC[c]);

export function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/<[^>]+>/g, "")
    .replace(/&[a-z]+;/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 80);
}

/**
 * Render Markdown to HTML for blog posts and docs.
 *  - h2/h3 get stable ids (deduplicated) and are collected into a TOC
 *  - raw HTML is escaped, so authored content can't inject scripts
 *  - external links open safely; javascript: URLs are dropped
 */
export function renderMarkdown(src: string): { html: string; toc: TocItem[] } {
  const toc: TocItem[] = [];
  const seen = new Map<string, number>();
  const md = new Marked({ gfm: true });

  md.use({
    renderer: {
      heading(this: { parser: { parseInline(t: Tokens.Generic[]): string } }, { tokens, depth }: Tokens.Heading) {
        const inner = this.parser.parseInline(tokens);
        const plain = inner.replace(/<[^>]+>/g, "");
        let id = slugify(plain) || "section";
        const n = seen.get(id) ?? 0;
        seen.set(id, n + 1);
        if (n) id = `${id}-${n}`;
        if (depth === 2 || depth === 3) toc.push({ id, text: plain.replace(/&amp;/g, "&").replace(/&#39;/g, "'").replace(/&quot;/g, '"'), depth });
        return `<h${depth} id="${id}"><a href="#${id}" class="heading-anchor">${inner}</a></h${depth}>\n`;
      },
      html({ text }: Tokens.HTML | Tokens.Tag) {
        return escapeHtml(text);
      },
      link(this: { parser: { parseInline(t: Tokens.Generic[]): string } }, { href, title, tokens }: Tokens.Link) {
        const text = this.parser.parseInline(tokens);
        if (/^\s*(javascript|data|vbscript):/i.test(href)) return text;
        const external = /^https?:\/\//i.test(href) && !href.includes("stackemails.com");
        const t = title ? ` title="${escapeHtml(title)}"` : "";
        return `<a href="${escapeHtml(href)}"${t}${external ? ' target="_blank" rel="noopener noreferrer"' : ""}>${text}</a>`;
      },
      code({ text, lang }: Tokens.Code) {
        const l = (lang || "").split(/\s/)[0];
        return `<pre${l ? ` data-lang="${escapeHtml(l)}"` : ""}><code>${escapeHtml(text)}</code></pre>\n`;
      },
    },
  });

  // Wrap tables so wide ones scroll inside the article instead of the page.
  const html = (md.parse(src, { async: false }) as string).replace(/<table>/g, '<div class="m-table-wrap"><table>').replace(/<\/table>/g, "</table></div>");
  return { html, toc };
}

/** Plain-text excerpt / reading time helpers. */
export function stripMarkdown(src: string): string {
  return src
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`[^`]*`/g, " ")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/[#>*_~|-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function readingMinutes(src: string): number {
  return Math.max(1, Math.round(stripMarkdown(src).split(" ").length / 220));
}
