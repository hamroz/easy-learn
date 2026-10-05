"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";
import type { LessonViewJson } from "@/lib/types";
import type { Quiz as QuizContent } from "@/content/outline";
import { Button } from "@/components/ui/Button";
import { ErrorText } from "@/components/ui/Field";
import { Dots } from "@/components/ui/Spinner";
import { Quiz } from "./Quiz";
import { formatInfo, isSinglePage } from "@/content/formats";
import { useRouter } from "next/navigation";

/** End-of-lesson box: continue, steer the course in your own words, or (only if asked) a quiz. */
export function WhatNext({ view, onChanged, onReached }: { view: LessonViewJson; onChanged: () => void; onReached: () => void }) {
  const { course, lesson, nav } = view;
  const ref = useRef<HTMLDivElement>(null);
  const [direction, setDirection] = useState("");
  const [steering, setSteering] = useState(false);
  const [steered, setSteered] = useState(false);
  const [quiz, setQuiz] = useState<QuizContent | null>(view.quiz?.content ?? null);
  const [quizLoading, setQuizLoading] = useState(false);
  const [error, setError] = useState<string>();

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver((e) => e[0]?.isIntersecting && onReached(), { threshold: 0.2 });
    io.observe(el);
    return () => io.disconnect();
  }, [onReached]);

  const steer = async () => {
    setSteering(true);
    setError(undefined);
    try {
      await api(`/api/lessons/${lesson.id}/steer`, { body: { instruction: direction } });
      setDirection("");
      setSteered(true);
      onChanged();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSteering(false);
    }
  };

  const makeQuiz = async () => {
    setQuizLoading(true);
    setError(undefined);
    try {
      const { quiz } = await api<{ quiz: { content: QuizContent } }>(`/api/lessons/${lesson.id}/quiz`, { body: {} });
      setQuiz(quiz.content);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setQuizLoading(false);
    }
  };

  const next = nav.next;
  const isLast = !next;
  const single = isSinglePage(course.format);
  const router = useRouter();
  const [deepening, setDeepening] = useState(false);
  const goDeeper = async () => {
    setDeepening(true);
    setError(undefined);
    try {
      const { url } = await api<{ url: string }>(`/api/courses/${course.id}/deeper`, { body: {} });
      router.push(url);
    } catch (e) {
      setError((e as Error).message);
      setDeepening(false);
    }
  };

  return (
    <div ref={ref} className="mt-28 font-ui">
      <div className="flex items-center gap-4 text-muted">
        <span className="h-px flex-1 bg-border" />
        <span className="text-[12px] uppercase tracking-[0.18em]">{single ? `End of the ${formatInfo(course.format).noun}` : isLast ? "End of the course" : "End of the lesson"}</span>
        <span className="h-px flex-1 bg-border" />
      </div>

      {single && (
        <button
          type="button"
          onClick={goDeeper}
          disabled={deepening}
          className="group mt-10 flex w-full items-center justify-between gap-4 rounded-[var(--radius)] bg-text px-6 py-5 text-left text-bg transition hover:opacity-95 disabled:opacity-70"
        >
          <div className="min-w-0">
            <div className="text-[12px] uppercase tracking-[0.14em] opacity-70">Go deeper</div>
            <div className="mt-1 font-[family-name:var(--font-heading)] text-[22px]">{deepening ? "Designing a course…" : "Turn this into a full course"}</div>
          </div>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="shrink-0 transition group-hover:translate-x-1" aria-hidden>
            <path d="M5 12h14M13 6l6 6-6 6" />
          </svg>
        </button>
      )}

      {!single && next && (
        <Link
          href={`/courses/${course.id}/lessons/${next.id}`}
          className="group mt-10 flex items-center justify-between gap-4 rounded-[var(--radius)] bg-text px-6 py-5 text-bg transition hover:opacity-95"
        >
          <div className="min-w-0">
            <div className="text-[12px] uppercase tracking-[0.14em] opacity-70">
              Next · Lesson {next.position + 1}
              {next.status === "generating" || next.status === "queued" ? " · being written" : ""}
            </div>
            <div className="mt-1 truncate font-[family-name:var(--font-heading)] text-[22px]">{next.title}</div>
          </div>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="shrink-0 transition group-hover:translate-x-1" aria-hidden>
            <path d="M5 12h14M13 6l6 6-6 6" />
          </svg>
        </Link>
      )}

      {!single && (
      <div className="mt-6 rounded-[var(--radius)] border border-border bg-surface p-5">
        <label htmlFor="steer" className="text-[14px] font-medium text-text">
          {isLast ? "Want to keep going?" : "Or choose your own direction"}
        </label>
        <p className="mt-1 text-[13px] text-muted">
          {isLast ? "Tell me what to explore next and I'll add lessons." : "Describe what you'd like to learn next; the upcoming lessons will follow it."}
        </p>
        {course.busy === "steering" ? (
          <p className="mt-4 flex items-center gap-2 text-[14px] text-muted">
            Updating your path <Dots />
          </p>
        ) : (
          <>
            <textarea
              id="steer"
              rows={2}
              value={direction}
              onChange={(e) => setDirection(e.target.value)}
              placeholder="I want to understand how GPS depends on this · more history please · go deeper into the math…"
              className="mt-3 block w-full resize-none rounded-xl border border-border bg-bg px-3.5 py-2.5 font-[family-name:var(--font-body)] text-[16px] text-text outline-none placeholder:text-muted/60 focus:border-accent"
            />
            <div className="mt-3 flex items-center justify-between gap-3">
              <span className="text-[13px] text-muted">{steered && !course.busy ? "Your path has been updated." : ""}</span>
              <Button size="sm" variant="secondary" onClick={steer} loading={steering} disabled={direction.trim().length < 2}>
                Update my path
              </Button>
            </div>
          </>
        )}
      </div>
      )}

      <div className="mt-6 rounded-[var(--radius)] border border-border bg-surface p-5">
        {quiz ? (
          <>
            <div className="mb-6 text-[14px] font-medium text-text">A few questions, just for you</div>
            <Quiz quiz={quiz} />
          </>
        ) : (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-[14px] font-medium text-text">Check your understanding?</div>
              <p className="mt-0.5 text-[13px] text-muted">Only if you feel like it — a short, friendly quiz on this lesson.</p>
            </div>
            <Button size="sm" variant="secondary" onClick={makeQuiz} loading={quizLoading} disabled={lesson.status !== "ready"}>
              Quiz me
            </Button>
          </div>
        )}
      </div>
      <ErrorText>{error}</ErrorText>
    </div>
  );
}
