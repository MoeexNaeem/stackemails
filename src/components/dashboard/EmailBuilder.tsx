"use client";

import { useMemo, useState } from "react";
import {
  type Block,
  type BlockType,
  BLOCK_LABELS,
  defaultBlocks,
  newBlock,
  renderBlockHtml,
  serializeBlocks,
} from "@/lib/email-builder/blocks";
import { Icon } from "@/components/ui/Icon";

const BLOCK_TYPES: BlockType[] = ["heading", "text", "button", "image", "divider", "spacer"];

export function EmailBuilder({ initialDesign }: { initialDesign: string }) {
  const [blocks, setBlocks] = useState<Block[]>(() => {
    try {
      const parsed = initialDesign ? (JSON.parse(initialDesign) as Block[]) : null;
      if (Array.isArray(parsed) && parsed.length) return parsed;
    } catch {
      /* fall through */
    }
    return defaultBlocks();
  });
  const [selectedId, setSelectedId] = useState<string | null>(blocks[0]?.id ?? null);
  const [adding, setAdding] = useState(false);

  const html = useMemo(() => serializeBlocks(blocks), [blocks]);
  const design = useMemo(() => JSON.stringify(blocks), [blocks]);
  const selected = blocks.find((b) => b.id === selectedId) ?? null;

  function update(id: string, key: string, value: string | number) {
    setBlocks((bs) => bs.map((b) => (b.id === id ? { ...b, props: { ...b.props, [key]: value } } : b)));
  }
  function add(type: BlockType) {
    const b = newBlock(type);
    setBlocks((bs) => [...bs, b]);
    setSelectedId(b.id);
    setAdding(false);
  }
  function move(id: string, dir: -1 | 1) {
    setBlocks((bs) => {
      const i = bs.findIndex((b) => b.id === id);
      const j = i + dir;
      if (i < 0 || j < 0 || j >= bs.length) return bs;
      const copy = [...bs];
      [copy[i], copy[j]] = [copy[j], copy[i]];
      return copy;
    });
  }
  function remove(id: string) {
    setBlocks((bs) => bs.filter((b) => b.id !== id));
    if (selectedId === id) setSelectedId(null);
  }

  return (
    <div className="grid lg:grid-cols-[1fr_300px] gap-4">
      {/* Hidden inputs read by the enclosing form */}
      <input type="hidden" name="html" value={html} />
      <input type="hidden" name="design" value={design} />

      {/* Canvas */}
      <div className="card overflow-hidden">
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-border">
          <span className="text-sm font-medium">Design</span>
          <div className="relative">
            <button type="button" className="btn btn-secondary !py-1.5" onClick={() => setAdding((a) => !a)}>
              + Add block
            </button>
            {adding && (
              <div className="absolute right-0 mt-1 w-40 card p-1 z-20" style={{ background: "var(--bg-elevated)" }}>
                {BLOCK_TYPES.map((t) => (
                  <button
                    key={t}
                    type="button"
                    className="block w-full text-left rounded px-3 py-1.5 text-sm hover:bg-bg-hover"
                    onClick={() => add(t)}
                  >
                    {BLOCK_LABELS[t]}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="p-6" style={{ background: "#f4f4f7", minHeight: 400 }}>
          <div style={{ maxWidth: 600, margin: "0 auto", background: "#fff", borderRadius: 12, padding: 24 }}>
            {blocks.length === 0 && (
              <p className="text-center text-sm" style={{ color: "#9a9aad" }}>Add a block to start designing.</p>
            )}
            {blocks.map((b) => (
              <div
                key={b.id}
                onClick={() => setSelectedId(b.id)}
                className="relative group"
                style={{
                  outline: selectedId === b.id ? "2px solid #6366f1" : "2px solid transparent",
                  outlineOffset: 2,
                  borderRadius: 4,
                  cursor: "pointer",
                }}
              >
                <div dangerouslySetInnerHTML={{ __html: renderBlockHtml(b) }} />
                <div className="absolute -top-2 right-0 hidden group-hover:flex gap-1">
                  <Ctrl onClick={(e) => { e.stopPropagation(); move(b.id, -1); }}><Icon name="arrow-up" size={14} /></Ctrl>
                  <Ctrl onClick={(e) => { e.stopPropagation(); move(b.id, 1); }}><Icon name="arrow-down" size={14} /></Ctrl>
                  <Ctrl onClick={(e) => { e.stopPropagation(); remove(b.id); }}><Icon name="x" size={16} /></Ctrl>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Properties */}
      <div className="card p-4 h-fit">
        <h3 className="font-semibold text-sm mb-3">
          {selected ? `${BLOCK_LABELS[selected.type]} block` : "Properties"}
        </h3>
        {!selected ? (
          <p className="text-sm text-fg-subtle">Select a block to edit its properties.</p>
        ) : (
          <Props block={selected} update={update} />
        )}
      </div>
    </div>
  );
}

function Ctrl({ children, onClick }: { children: React.ReactNode; onClick: (e: React.MouseEvent) => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex h-6 w-6 items-center justify-center rounded text-xs"
      style={{ background: "#6366f1", color: "#fff" }}
    >
      {children}
    </button>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mb-3">
      <label className="label !mb-1 text-xs">{label}</label>
      {children}
    </div>
  );
}

function Props({ block, update }: { block: Block; update: (id: string, k: string, v: string | number) => void }) {
  const p = block.props;
  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    update(block.id, k, e.target.value);
  const setNum = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) => update(block.id, k, Number(e.target.value));

  const alignSelect = (
    <Field label="Alignment">
      <select className="input" value={String(p.align)} onChange={set("align")}>
        <option value="left">Left</option>
        <option value="center">Center</option>
        <option value="right">Right</option>
      </select>
    </Field>
  );
  const colorInput = (key: string, label: string) => (
    <Field label={label}>
      <input type="color" className="input h-9 p-1" value={String(p[key])} onChange={set(key)} />
    </Field>
  );

  switch (block.type) {
    case "heading":
      return (
        <>
          <Field label="Text"><input className="input" value={String(p.text)} onChange={set("text")} /></Field>
          <Field label="Size"><input type="number" className="input" value={Number(p.size)} onChange={setNum("size")} /></Field>
          {alignSelect}
          {colorInput("color", "Color")}
        </>
      );
    case "text":
      return (
        <>
          <Field label="Text"><textarea className="input" rows={4} value={String(p.text)} onChange={set("text")} /></Field>
          {alignSelect}
          {colorInput("color", "Color")}
        </>
      );
    case "button":
      return (
        <>
          <Field label="Label"><input className="input" value={String(p.text)} onChange={set("text")} /></Field>
          <Field label="URL"><input className="input" value={String(p.url)} onChange={set("url")} /></Field>
          {alignSelect}
          {colorInput("bg", "Background")}
          {colorInput("color", "Text color")}
        </>
      );
    case "image":
      return (
        <>
          <Field label="Image URL"><input className="input" value={String(p.src)} onChange={set("src")} /></Field>
          <Field label="Alt text"><input className="input" value={String(p.alt)} onChange={set("alt")} /></Field>
          <Field label="Width"><input type="number" className="input" value={Number(p.width)} onChange={setNum("width")} /></Field>
          {alignSelect}
        </>
      );
    case "divider":
      return colorInput("color", "Color");
    case "spacer":
      return <Field label="Height"><input type="number" className="input" value={Number(p.height)} onChange={setNum("height")} /></Field>;
    default:
      return null;
  }
}
