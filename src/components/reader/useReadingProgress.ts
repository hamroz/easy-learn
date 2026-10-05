"use client";

import { useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";

/** Track how far through the article the reader is and save the furthest point (throttled). */
export function useReadingProgress(lessonId: string, articleRef: React.RefObject<HTMLElement | null>, initial: number) {
  const [progress, setProgress] = useState(0);
  const saved = useRef(initial);
  const lastSave = useRef(0);

  useEffect(() => {
    const onScroll = () => {
      const el = articleRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const total = r.height - window.innerHeight * 0.6;
      const p = Math.max(0, Math.min(1, (window.innerHeight * 0.4 - r.top) / Math.max(1, total)));
      setProgress(p);
      const now = Date.now();
      if (p > saved.current + 0.05 && now - lastSave.current > 8000) {
        saved.current = p;
        lastSave.current = now;
        void api(`/api/lessons/${lessonId}/progress`, { body: { progress: Number(p.toFixed(3)) } }).catch(() => {});
      }
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [lessonId, articleRef]);

  return progress;
}
