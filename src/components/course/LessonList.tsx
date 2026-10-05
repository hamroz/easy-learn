import Link from "next/link";
import type { CourseViewJson } from "@/lib/types";
import { Dots } from "@/components/ui/Spinner";

export function LessonList({ course, lessons }: { course: CourseViewJson["course"]; lessons: CourseViewJson["lessons"] }) {
  const next = lessons.find((l) => !l.completedAt) ?? lessons[0];
  const done = lessons.filter((l) => l.completedAt).length;

  return (
    <div>
      {next && (
        <Link
          href={`/courses/${course.id}/lessons/${next.id}`}
          className="group mb-12 flex items-center justify-between gap-4 rounded-[22px] bg-text px-6 py-5 text-bg transition hover:opacity-95"
        >
          <div className="min-w-0">
            <div className="font-ui text-[12px] uppercase tracking-[0.14em] opacity-70">
              {done === 0 ? "Begin" : done === lessons.length ? "Read again" : "Continue"} · Lesson {next.position + 1}
            </div>
            <div className="mt-1 truncate font-[family-name:var(--font-heading)] text-[22px]">{next.title}</div>
          </div>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="shrink-0 transition group-hover:translate-x-1" aria-hidden>
            <path d="M5 12h14M13 6l6 6-6 6" />
          </svg>
        </Link>
      )}

      {course.busy === "steering" && (
        <p className="mb-6 flex items-center gap-3 font-ui text-[14px] text-muted">
          Updating the path ahead <Dots />
        </p>
      )}

      <ol className="relative space-y-1">
        {lessons.map((l) => {
          const generating = l.status === "queued" || l.status === "generating";
          return (
            <li key={l.id}>
              <Link
                href={`/courses/${course.id}/lessons/${l.id}`}
                className="group flex gap-5 rounded-2xl px-3 py-4 transition hover:bg-surface"
              >
                <span
                  className={`mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-full border font-ui text-[13px] ${
                    l.completedAt ? "border-accent bg-accent text-surface" : "border-border text-muted"
                  }`}
                >
                  {l.completedAt ? (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" aria-hidden>
                      <path d="M5 12l5 5 9-10" />
                    </svg>
                  ) : (
                    l.position + 1
                  )}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="font-[family-name:var(--font-heading)] text-[19px] leading-snug text-text">{l.title}</div>
                  <p className="mt-1 text-[14.5px] leading-relaxed text-muted">{l.summary}</p>
                  <div className="mt-2 flex items-center gap-3 font-ui text-[12px] text-muted">
                    {generating && (
                      <span className="inline-flex items-center gap-2">
                        Writing <Dots />
                      </span>
                    )}
                    {l.status === "ready" && !l.completedAt && l.progress > 0.02 && (
                      <span className="flex items-center gap-2">
                        <span className="h-1 w-20 overflow-hidden rounded-full bg-border">
                          <span className="block h-full bg-accent" style={{ width: `${Math.round(l.progress * 100)}%` }} />
                        </span>
                        {Math.round(l.progress * 100)}%
                      </span>
                    )}
                    {l.status === "failed" && <span className="text-[#b42318] dark:text-[#ff8a80]">Could not be written — open to retry</span>}
                  </div>
                </div>
              </Link>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
