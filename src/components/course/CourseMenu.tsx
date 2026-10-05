"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";
import { fontById, type FontId } from "@/content/fonts";

export function CourseMenu({
  courseId,
  format,
  isExample,
  fonts,
  currentFont,
}: {
  courseId: string;
  format: string;
  isExample: boolean;
  fonts: FontId[];
  currentFont: FontId;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  const toggleExample = async () => {
    setOpen(false);
    await api(`/api/courses/${courseId}`, { method: "PATCH", body: { isExample: !isExample } });
    router.refresh();
  };
  const setFont = async (fontPair: FontId) => {
    setOpen(false);
    await api(`/api/courses/${courseId}`, { method: "PATCH", body: { fontPair } });
    router.refresh();
  };
  const cheatSheet = async () => {
    setOpen(false);
    const { url } = await api<{ url: string }>(`/api/courses/${courseId}/cheatsheet`, { body: {} });
    router.push(url);
  };
  const remove = async () => {
    setOpen(false);
    if (!confirm("Delete this course, its lessons and your questions? This cannot be undone.")) return;
    await api(`/api/courses/${courseId}`, { method: "DELETE" });
    router.push("/");
  };

  return (
    <div ref={ref} className="relative mt-2 shrink-0">
      <button
        aria-label="Course options"
        onClick={() => setOpen(!open)}
        className="grid h-9 w-9 place-items-center rounded-full text-muted transition hover:bg-border/50 hover:text-text"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
          <circle cx="5" cy="12" r="1.8" />
          <circle cx="12" cy="12" r="1.8" />
          <circle cx="19" cy="12" r="1.8" />
        </svg>
      </button>
      {open && (
        <div className="absolute right-0 z-20 mt-2 w-56 overflow-hidden rounded-2xl border border-border bg-surface p-1.5 font-ui text-[14px] shadow-[0_20px_50px_-20px_rgba(0,0,0,0.4)]">
          {fonts.length > 1 && (
            <div className="mb-1 border-b border-border pb-1">
              <div className="px-3 pb-1 pt-1.5 text-[11px] uppercase tracking-[0.12em] text-muted">Font</div>
              {fonts.map((f) => (
                <button
                  key={f}
                  onClick={() => setFont(f)}
                  style={{ fontFamily: fontById(f).body }}
                  className="flex w-full items-center justify-between rounded-xl px-3 py-1.5 text-left text-[15px] hover:bg-border/40"
                >
                  {fontById(f).name}
                  {f === currentFont && <span className="font-ui text-[12px] text-accent">✓</span>}
                </button>
              ))}
            </div>
          )}
          {format === "course" && (
            <button onClick={cheatSheet} className="block w-full rounded-xl px-3 py-2 text-left hover:bg-border/40">
              Make a cheat sheet
            </button>
          )}
          <button onClick={toggleExample} className="block w-full rounded-xl px-3 py-2 text-left hover:bg-border/40">
            {isExample ? "Remove from examples" : "Show as an example"}
          </button>
          <button onClick={remove} className="block w-full rounded-xl px-3 py-2 text-left text-[#b42318] hover:bg-[#b42318]/10 dark:text-[#ff8a80]">
            Delete course
          </button>
        </div>
      )}
    </div>
  );
}
