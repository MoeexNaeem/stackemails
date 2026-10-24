export type BlockType = "heading" | "text" | "button" | "image" | "divider" | "spacer";

export interface Block {
  id: string;
  type: BlockType;
  props: Record<string, string | number>;
}

export const BLOCK_DEFAULTS: Record<BlockType, Record<string, string | number>> = {
  heading: { text: "Your heading", align: "left", color: "#101017", size: 24 },
  text: { text: "Write your paragraph text here. Use this space to tell your story.", align: "left", color: "#3c3c48" },
  button: { text: "Click here", url: "https://example.com", bg: "#6366f1", color: "#ffffff", align: "center" },
  image: { src: "https://placehold.co/520x200/png", alt: "Image", width: 520, align: "center" },
  divider: { color: "#e6e6ea" },
  spacer: { height: 24 },
};

export const BLOCK_LABELS: Record<BlockType, string> = {
  heading: "Heading",
  text: "Text",
  button: "Button",
  image: "Image",
  divider: "Divider",
  spacer: "Spacer",
};

function esc(s: unknown): string {
  return String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

export function renderBlockHtml(b: Block): string {
  return renderBlock(b);
}

function renderBlock(b: Block): string {
  const p = b.props;
  switch (b.type) {
    case "heading":
      return `<h1 style="margin:0 0 8px;font-size:${Number(p.size) || 24}px;font-weight:700;color:${esc(p.color)};text-align:${esc(p.align)}">${esc(p.text)}</h1>`;
    case "text":
      return `<p style="margin:0 0 12px;font-size:15px;line-height:24px;color:${esc(p.color)};text-align:${esc(p.align)}">${esc(p.text)}</p>`;
    case "button":
      return `<div style="text-align:${esc(p.align)};margin:16px 0"><a href="${esc(p.url)}" style="display:inline-block;background:${esc(p.bg)};color:${esc(p.color)};padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:600;font-size:15px">${esc(p.text)}</a></div>`;
    case "image":
      return `<div style="text-align:${esc(p.align)};margin:8px 0"><img src="${esc(p.src)}" alt="${esc(p.alt)}" width="${Number(p.width) || 520}" style="max-width:100%;border-radius:8px;display:inline-block"/></div>`;
    case "divider":
      return `<hr style="border:none;border-top:1px solid ${esc(p.color)};margin:20px 0"/>`;
    case "spacer":
      return `<div style="height:${Number(p.height) || 24}px"></div>`;
    default:
      return "";
  }
}

/** Serialize a block list to a full, email-safe HTML document. */
export function serializeBlocks(blocks: Block[]): string {
  const inner = blocks.map(renderBlock).join("\n");
  return `<div style="background:#f4f4f7;padding:32px 0;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif">
  <div style="max-width:600px;margin:0 auto;background:#ffffff;border-radius:12px;padding:40px">
${inner}
  </div>
</div>`;
}

export function newBlock(type: BlockType): Block {
  return {
    id: Math.random().toString(36).slice(2, 10),
    type,
    props: { ...BLOCK_DEFAULTS[type] },
  };
}

/** A sensible starting layout for a new broadcast. */
export function defaultBlocks(): Block[] {
  return [
    { id: "h1", type: "heading", props: { ...BLOCK_DEFAULTS.heading, text: "Hello there" } },
    { id: "t1", type: "text", props: { ...BLOCK_DEFAULTS.text } },
    { id: "b1", type: "button", props: { ...BLOCK_DEFAULTS.button, text: "Get started" } },
  ];
}
