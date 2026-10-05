"use client";

import { useState } from "react";
import type { FontId } from "@/content/fonts";
import { FORMATS } from "@/content/formats";
import { CourseCard, type CourseCardData } from "./CourseCard";

/** The owner's items with format filter chips (only formats they actually have). */
export function Library({ items, fonts }: { items: CourseCardData[]; fonts: FontId[] }) {
  const [filter, setFilter] = useState<string>("all");
  const present = FORMATS.filter((f) => items.some((i) => i.format === f.id));
  const shown = filter === "all" ? items : items.filter((i) => i.format === filter);
  return (
    <section className="mt-24">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-ui text-[13px] font-medium uppercase tracking-[0.14em] text-muted">Your library</h2>
        {present.length > 1 && (
          <div role="tablist" className="flex flex-wrap gap-1.5 font-ui text-[12.5px]">
            {[{ id: "all", label: "All" }, ...present].map((f) => (
              <button
                key={f.id}
                role="tab"
                aria-selected={filter === f.id}
                onClick={() => setFilter(f.id)}
                className={`rounded-full px-3 py-1 transition ${filter === f.id ? "bg-text text-bg" : "bg-border/40 text-muted hover:text-text"}`}
              >
                {f.id === "all" ? "All" : f.label === "Story" ? "Stories" : `${f.label}s`}
              </button>
            ))}
          </div>
        )}
      </div>
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {shown.map((c) => (
          <CourseCard key={c.id} course={c} fonts={fonts} />
        ))}
      </div>
    </section>
  );
}
