"use client";

import Link from "next/link";
import { useCallback, useRef, useState } from "react";
import { api } from "@/lib/api";
import type { LessonViewJson } from "@/lib/types";
import { themeClass, themeStyle } from "@/lib/theme";
import { Button } from "@/components/ui/Button";
import { SchemeToggle } from "@/components/ui/SchemeToggle";
import { Dots } from "@/components/ui/Spinner";
import { SectionView } from "./SectionView";
import { Toc } from "./Toc";
import { useLessonData } from "./useLessonData";
import { useReadingProgress } from "./useReadingProgress";
import { WhatNext } from "./WhatNext";
import { AskLayer } from "./ask/AskLayer";
import { ParagraphTools } from "./ParagraphTools";
import type { VariantJson } from "@/lib/types";

export function Reader({ initial }: { initial: LessonViewJson }) {
  const { view, setView, refresh } = useLessonData(initial);
  const { course, lesson, sections, nav } = view;
  const [activeVariant, setActiveVariant] = useState<Record<string, string | null>>({});
  const [loadingVariant, setLoadingVariant] = useState<Record<string, "simpler" | "deeper" | null>>({});
  const [variantError, setVariantError] = useState<string>();
  const vkey = (sectionId: string, blockId: string) => `${sectionId}:${blockId}`;

  const requestVariant = useCallback(
    async (sectionId: string, blockId: string, kind: "simpler" | "deeper") => {
      const key = vkey(sectionId, blockId);
      const existing = view.variants.find((v) => v.sectionId === sectionId && v.blockId === blockId && v.kind === kind);
      if (existing) return setActiveVariant((a) => ({ ...a, [key]: existing.id }));
      setLoadingVariant((l) => ({ ...l, [key]: kind }));
      setVariantError(undefined);
      try {
        const { variant } = await api<{ variant: VariantJson }>("/api/variants", { body: { sectionId, blockId, kind } });
        setView((v) => ({ ...v, variants: [...v.variants.filter((x) => x.id !== variant.id), variant] }));
        setActiveVariant((a) => ({ ...a, [key]: variant.id }));
      } catch (e) {
        setVariantError((e as Error).message);
      } finally {
        setLoadingVariant((l) => ({ ...l, [key]: null }));
      }
    },
    [view.variants, setView],
  );

  const showVariant = useCallback((sectionId: string, blockId: string, variantId: string | null) => {
    setActiveVariant((a) => ({ ...a, [vkey(sectionId, blockId)]: variantId }));
  }, []);

  const paragraphProps = (sectionId: string, blockId: string) => {
    const key = vkey(sectionId, blockId);
    const available = view.variants.filter((v) => v.sectionId === sectionId && v.blockId === blockId);
    const active = activeVariant[key] ?? null;
    const shown = available.find((v) => v.id === active);
    return {
      paragraphMd: shown?.md,
      variantId: shown?.id ?? null,
      paragraphAside: (
        <ParagraphTools
          available={available}
          active={shown?.id ?? null}
          loading={loadingVariant[key] ?? null}
          onRequest={(kind) => requestVariant(sectionId, blockId, kind)}
          onShow={(id) => showVariant(sectionId, blockId, id)}
        />
      ),
    };
  };
  const articleRef = useRef<HTMLElement>(null);
  const progress = useReadingProgress(lesson.id, articleRef, lesson.progress);
  const [retrying, setRetrying] = useState(false);
  const completedRef = useRef(!!lesson.completedAt);

  const allReady = lesson.status === "ready" && sections.every((s) => s.status === "ready" || s.status === "failed");
  const markComplete = useCallback(() => {
    if (completedRef.current || !allReady) return;
    completedRef.current = true;
    void api(`/api/lessons/${lesson.id}/progress`, { body: { progress: 1, completed: true } }).catch(() => {});
  }, [allReady, lesson.id]);

  const retryLesson = async () => {
    setRetrying(true);
    await api(`/api/lessons/${lesson.id}/retry`, { body: {} }).catch(() => {});
    await refresh();
    setRetrying(false);
  };

  const planning = sections.length === 0 && (lesson.status === "queued" || lesson.status === "generating" || lesson.status === "planned");

  return (
    <div style={themeStyle(course.theme)} className={`${themeClass(course.theme)} min-h-screen`}>
      <header className="sticky top-0 z-30 border-b border-border/60 bg-[color-mix(in_oklab,var(--bg)_82%,transparent)] backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
          <Link href={`/courses/${course.id}`} className="flex min-w-0 items-center gap-2 font-ui text-[13px] text-muted transition hover:text-text">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
              <path d="M15 6l-6 6 6 6" />
            </svg>
            <span className="truncate">{course.title}</span>
          </Link>
          <div className="flex items-center gap-1">
            <span className="hidden font-ui text-[12px] tabular-nums text-muted sm:inline">
              {lesson.position + 1} / {nav.lessons.length}
            </span>
            <SchemeToggle />
          </div>
        </div>
        <div className="absolute inset-x-0 bottom-[-1px] h-[2px] origin-left bg-accent transition-transform duration-150" style={{ transform: `scaleX(${progress})` }} />
      </header>

      <Toc sections={sections} />
      <AskLayer
        lessonId={lesson.id}
        articleRef={articleRef}
        threads={view.threads}
        onChanged={refresh}
        showVariant={showVariant}
        onRewrite={requestVariant}
      />

      <main className="mx-auto w-full max-w-[700px] px-5 pb-40 sm:px-8">
        <article ref={articleRef}>
          <header className="pt-16 sm:pt-24">
            <div className="font-ui text-[12.5px] uppercase tracking-[0.18em] text-muted">
              Lesson {lesson.position + 1} of {nav.lessons.length}
            </div>
            <h1 className="mt-4 font-[family-name:var(--font-heading)] text-[40px] leading-[1.08] tracking-tight text-text sm:text-[52px]">{lesson.title}</h1>
            <p className="mt-5 font-[family-name:var(--font-body)] text-[20px] leading-relaxed text-muted">{lesson.summary}</p>
          </header>

          {planning && (
            <div className="mt-16" aria-busy>
              <p className="flex items-center gap-2 font-ui text-[14px] text-muted">
                Planning this lesson <Dots />
              </p>
              <div className="mt-8 space-y-3">
                {[100, 94, 98, 60].map((w, i) => (
                  <div key={i} className="shimmer h-[14px] rounded-md" style={{ width: `${w}%` }} />
                ))}
              </div>
            </div>
          )}

          {lesson.status === "failed" && sections.length === 0 && (
            <div className="mt-16 rounded-[var(--radius)] border border-border bg-surface p-6 font-ui">
              <p className="text-[16px] text-text">This lesson could not be planned.</p>
              {lesson.error && <p className="mt-1 line-clamp-4 text-[13px] text-muted">{lesson.error}</p>}
              <Button className="mt-4" onClick={retryLesson} loading={retrying}>
                Try again
              </Button>
            </div>
          )}

          {sections.map((s, i) => (
            <SectionView key={s.id} section={s} index={i} onRetried={refresh} paragraphProps={paragraphProps} />
          ))}
        </article>

        {variantError && (
          <p role="alert" className="fixed bottom-20 left-1/2 z-40 -translate-x-1/2 rounded-full bg-text px-4 py-2 font-ui text-[13px] text-bg shadow-lg">
            {variantError}
          </p>
        )}

        {allReady && <WhatNext view={view} onChanged={refresh} onReached={markComplete} />}

        <nav className="mt-16 flex items-center justify-between gap-4 font-ui text-[13px]">
          {nav.prev ? (
            <Link href={`/courses/${course.id}/lessons/${nav.prev.id}`} className="min-w-0 text-muted hover:text-text">
              ← <span className="truncate">{nav.prev.title}</span>
            </Link>
          ) : (
            <span />
          )}
          <Link href={`/courses/${course.id}`} className="text-muted hover:text-text">
            All lessons
          </Link>
        </nav>
      </main>
    </div>
  );
}
