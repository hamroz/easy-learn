"use client";

import { useState } from "react";
import type { Quiz as QuizContent } from "@/content/outline";
import { Markdown } from "./Markdown";

/** A gentle, on-request quiz: pick an answer, see why. No timers, no pressure. */
export function Quiz({ quiz }: { quiz: QuizContent }) {
  const [picked, setPicked] = useState<(number | null)[]>(quiz.questions.map(() => null));
  const answered = picked.filter((p) => p !== null).length;
  const right = picked.filter((p, i) => p === quiz.questions[i].answer).length;

  return (
    <div className="space-y-8">
      {quiz.questions.map((q, qi) => {
        const choice = picked[qi];
        return (
          <div key={qi}>
            <p className="font-[family-name:var(--font-body)] text-[18px] leading-relaxed text-text">
              <span className="mr-2 font-ui text-[13px] text-muted">{qi + 1}.</span>
              <Markdown md={q.q} />
            </p>
            <div className="mt-3 grid gap-2">
              {q.options.map((o, oi) => {
                const isAnswer = oi === q.answer;
                const state = choice === null ? "idle" : isAnswer ? "right" : choice === oi ? "wrong" : "idle";
                return (
                  <button
                    key={oi}
                    type="button"
                    disabled={choice !== null}
                    onClick={() => setPicked(picked.map((p, i) => (i === qi ? oi : p)))}
                    className={`rounded-xl border px-4 py-2.5 text-left font-[family-name:var(--font-body)] text-[16px] transition ${
                      state === "right"
                        ? "border-accent bg-accent/10 text-text"
                        : state === "wrong"
                          ? "border-border bg-border/30 text-muted line-through decoration-muted/50"
                          : "border-border text-text hover:border-muted/60 disabled:hover:border-border"
                    }`}
                  >
                    <Markdown md={o} />
                  </button>
                );
              })}
            </div>
            {choice !== null && (
              <p className="mt-3 animate-fade-up font-[family-name:var(--font-body)] text-[15.5px] leading-relaxed text-muted">
                <Markdown md={q.explanation} />
              </p>
            )}
          </div>
        );
      })}
      {answered === quiz.questions.length && (
        <p className="animate-fade-up font-ui text-[14px] text-muted">
          {right} of {quiz.questions.length} — {right === quiz.questions.length ? "lovely, all of them." : "every miss is just the next thing to look at."}
        </p>
      )}
    </div>
  );
}
