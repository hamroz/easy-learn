"use client";

import Link from "next/link";

export default function AppError({ reset }: { error: Error; reset: () => void }) {
  return (
    <main className="mx-auto max-w-lg px-6 py-32 text-center font-ui">
      <h1 className="font-[family-name:var(--font-newsreader)] text-[32px] text-text">Something went wrong</h1>
      <p className="mt-3 text-[15px] text-muted">The page hit an unexpected error. Your courses are safe.</p>
      <div className="mt-8 flex justify-center gap-3">
        <button onClick={reset} className="rounded-xl bg-text px-4 py-2 text-[14px] text-bg">
          Try again
        </button>
        <Link href="/" className="rounded-xl border border-border px-4 py-2 text-[14px] text-text">
          All courses
        </Link>
      </div>
    </main>
  );
}
