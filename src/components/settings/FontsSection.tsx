"use client";

import { FONT_CATALOGUE, type FontId } from "@/content/fonts";

export function FontsSection({ fonts, onChange }: { fonts: FontId[]; onChange: (f: FontId[]) => void }) {
  const toggle = (id: FontId) => {
    if (fonts.includes(id)) {
      if (fonts.length > 1) onChange(fonts.filter((f) => f !== id));
    } else onChange([...fonts, id]);
  };
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {FONT_CATALOGUE.map((f) => {
        const on = fonts.includes(f.id);
        return (
          <button
            key={f.id}
            type="button"
            aria-pressed={on}
            onClick={() => toggle(f.id)}
            className={`rounded-2xl border p-4 text-left transition ${on ? "border-accent bg-surface ring-4 ring-accent/10" : "border-border bg-surface/50 opacity-80 hover:opacity-100"}`}
          >
            <span className="flex items-center justify-between font-ui text-[12px] text-muted">
              <span>
                {f.name} — {f.description}
              </span>
              <span className={`grid h-5 w-5 place-items-center rounded-full border ${on ? "border-accent bg-accent text-surface" : "border-border"}`}>{on ? "✓" : ""}</span>
            </span>
            <span className="mt-2 block text-[22px] leading-snug text-text" style={{ fontFamily: f.heading }}>
              Why light refuses to slow down
            </span>
            <span className="mt-1.5 block text-[15px] leading-relaxed text-text" style={{ fontFamily: f.body }}>
              Imagine you are standing on a platform as a train rushes past. Everything you know about motion says that speeds simply add up.
            </span>
          </button>
        );
      })}
    </div>
  );
}
