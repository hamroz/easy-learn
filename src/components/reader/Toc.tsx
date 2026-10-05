"use client";

import { useEffect, useState } from "react";
import type { SectionJson } from "@/lib/types";

/** Slim table of contents in the left margin (wide screens only); highlights the section in view. */
export function Toc({ sections }: { sections: SectionJson[] }) {
  const [active, setActive] = useState<string | null>(null);

  useEffect(() => {
    const els = sections.map((s) => document.getElementById(`section-${s.id}`)).filter(Boolean) as HTMLElement[];
    const io = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActive(visible[0].target.id.replace("section-", ""));
      },
      { rootMargin: "-20% 0px -70% 0px" },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [sections]);

  if (sections.length < 2) return null;
  return (
    <nav aria-label="Sections" className="fixed left-[max(24px,calc(50%-560px))] top-36 hidden w-48 font-ui text-[13px] 2xl:block">
      <ol className="space-y-2.5 border-l border-border">
        {sections.map((s) => (
          <li key={s.id}>
            <a
              href={`#section-${s.id}`}
              className={`-ml-px block border-l-2 pl-4 leading-snug transition ${active === s.id ? "border-accent text-text" : "border-transparent text-muted hover:text-text"}`}
            >
              {s.heading}
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );
}
