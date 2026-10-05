"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { api } from "@/lib/api";
import type { CourseViewJson } from "@/lib/types";
import { themeClass, themeStyle } from "@/lib/theme";
import { AppHeader } from "@/components/ui/AppHeader";
import { AutoRefresh } from "@/components/ui/AutoRefresh";
import { Button } from "@/components/ui/Button";
import { Dots } from "@/components/ui/Spinner";
import { OutlineEditor } from "./OutlineEditor";
import { LessonList } from "./LessonList";
import { CourseMenu } from "./CourseMenu";
import { type FontId, resolveFont } from "@/content/fonts";
import { formatInfo, isSinglePage } from "@/content/formats";

const LEVEL_LABEL = { beginner: "Beginner", intermediate: "Intermediate", advanced: "Advanced" } as const;

export function CoursePage({ view, fonts }: { view: CourseViewJson; fonts: FontId[] }) {
  const { course, lessons } = view;
  const router = useRouter();
  const [retrying, setRetrying] = useState(false);
  const generating = lessons.some((l) => l.status === "queued" || l.status === "generating");
  // The cover is drawn after the outline; keep refreshing briefly until it arrives.
  const coverPending = !course.coverSvg && course.status !== "failed" && Date.now() - new Date(course.createdAt).getTime() < 180_000;
  const pending = course.status === "outlining" || !!course.busy || generating || coverPending || (isSinglePage(course.format) && lessons.length === 0);

  const retry = async () => {
    setRetrying(true);
    await api(`/api/courses/${course.id}/retry`, { body: {} }).catch(() => {});
    router.refresh();
    setRetrying(false);
  };

  return (
    <div style={themeStyle(course.theme, fonts)} className={`${themeClass(course.theme)} min-h-screen`}>
      <AutoRefresh enabled={pending} />
      <AppHeader />
      <main className="mx-auto w-full max-w-3xl px-5 pb-28 sm:px-8">
        <div className="relative mt-4 overflow-hidden rounded-[26px] border border-border bg-surface">
          <div className="aspect-[2.6/1] w-full">
            {course.coverSvg ? (
              <div className="h-full w-full animate-fade-up [&>svg]:h-full [&>svg]:w-full" dangerouslySetInnerHTML={{ __html: course.coverSvg }} />
            ) : (
              <div className={`h-full w-full ${pending ? "shimmer" : ""}`} />
            )}
          </div>
        </div>

        <header className="mt-10">
          <div className="flex items-start justify-between gap-4">
            <h1 className="font-[family-name:var(--font-heading)] text-[38px] leading-[1.1] tracking-tight sm:text-[48px]">
              {course.status === "outlining" ? <span className="text-muted">{course.title}</span> : course.title}
            </h1>
            {course.status !== "outlining" && <CourseMenu courseId={course.id} format={course.format} isExample={course.isExample} fonts={fonts} currentFont={resolveFont(course.theme?.fontPair, fonts)} />}
          </div>
          {course.subtitle && <p className="mt-3 font-[family-name:var(--font-body)] text-[19px] leading-relaxed text-muted">{course.subtitle}</p>}
          {course.status !== "outlining" && (
            <p className="mt-4 font-ui text-[12.5px] uppercase tracking-[0.12em] text-muted">
              {lessons.length} lessons · {LEVEL_LABEL[course.level]}
              {course.theme ? ` · ${course.theme.name}` : ""}
            </p>
          )}
        </header>

        {course.error && course.status !== "failed" && (
          <p className="mt-6 rounded-xl border border-border bg-surface px-4 py-3 text-[14px] text-muted">{course.error}</p>
        )}

        <section className="mt-12">
          {course.status === "outlining" && <OutlineSkeleton noun={formatInfo(course.format).noun} single={isSinglePage(course.format)} />}
          {course.status === "failed" && (
            <div className="rounded-2xl border border-border bg-surface p-6">
              <p className="font-[family-name:var(--font-heading)] text-[22px]">The course could not be designed.</p>
              <p className="mt-2 text-[14px] text-muted">{course.error}</p>
              <Button className="mt-5" onClick={retry} loading={retrying}>
                Try again
              </Button>
            </div>
          )}
          {course.status === "outline_ready" && <OutlineEditor key={lessons.map((l) => l.id).join()} course={course} lessons={lessons} />}
          {course.status === "active" && <LessonList course={course} lessons={lessons} />}
        </section>

        <div className="mt-20 text-center">
          <Link href="/" className="font-ui text-[13px] text-muted hover:text-text">
            ← All courses
          </Link>
        </div>
      </main>
    </div>
  );
}

function OutlineSkeleton({ noun, single }: { noun: string; single: boolean }) {
  if (single)
    return (
      <div>
        <p className="mb-6 flex items-center gap-3 font-ui text-[14px] text-muted">
          Writing your {noun} — it opens by itself when ready <Dots />
        </p>
        {[100, 96, 88, 0, 100, 70].map((w, i) => (w === 0 ? <div key={i} className="h-6" /> : <div key={i} className="shimmer mb-3 h-[14px] rounded-md" style={{ width: `${w}%` }} />))}
      </div>
    );
  return (
    <div>
      <p className="mb-6 flex items-center gap-3 font-ui text-[14px] text-muted">
        Designing your {noun} — choosing a shape and a look <Dots />
      </p>
      <div className="space-y-3">
        {[0, 1, 2, 3, 4].map((i) => (
          <div key={i} className="rounded-2xl border border-border bg-surface p-5" style={{ opacity: 1 - i * 0.15 }}>
            <div className="shimmer h-5 w-2/3 rounded-md" />
            <div className="shimmer mt-3 h-3.5 w-11/12 rounded-md" />
          </div>
        ))}
      </div>
    </div>
  );
}
