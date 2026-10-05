"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";
import type { LessonViewJson } from "@/lib/types";

export function isPending(v: LessonViewJson) {
  return (
    v.lesson.status === "queued" ||
    v.lesson.status === "generating" ||
    !!v.course.busy ||
    v.sections.some((s) => s.status === "pending" || s.status === "generating") ||
    v.sections.some((s) => s.blocks.some((b) => b.type === "custom" && b.status === "pending"))
  );
}

/** Lesson view state, polled every 1.5 s while anything is still being written. */
export function useLessonData(initial: LessonViewJson) {
  const [view, setView] = useState(initial);
  const lessonId = initial.lesson.id;
  const inflight = useRef(false);

  const refresh = useCallback(async () => {
    if (inflight.current) return;
    inflight.current = true;
    try {
      setView(await api<LessonViewJson>(`/api/lessons/${lessonId}`));
    } catch {
      /* transient; next poll retries */
    } finally {
      inflight.current = false;
    }
  }, [lessonId]);

  const pending = isPending(view);
  useEffect(() => {
    if (!pending) return;
    const t = setInterval(refresh, 1500);
    return () => clearInterval(t);
  }, [pending, refresh]);

  return { view, setView, refresh, pending };
}
