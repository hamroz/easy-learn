import Link from "next/link";
import type { Theme } from "@/content/theme";
import { themeClass, themeStyle } from "@/lib/theme";
import { Dots } from "@/components/ui/Spinner";

export type CourseCardData = {
  id: string;
  title: string;
  subtitle: string | null;
  status: "outlining" | "outline_ready" | "active" | "failed";
  busy: string | null;
  theme: Theme | null;
  coverSvg: string | null;
  lessonCount: number;
  completedCount: number;
  next: { id: string; title: string; position: number } | null;
};

function StatusLine({ c }: { c: CourseCardData }) {
  if (c.status === "outlining")
    return (
      <span className="inline-flex items-center gap-2">
        Designing your course <Dots />
      </span>
    );
  if (c.busy) return <span className="inline-flex items-center gap-2">Rewriting the outline <Dots /></span>;
  if (c.status === "failed") return <span className="text-[#b42318] dark:text-[#ff8a80]">Something went wrong — open to retry</span>;
  if (c.status === "outline_ready") return <span>Outline ready · {c.lessonCount} lessons</span>;
  if (c.completedCount >= c.lessonCount && c.lessonCount > 0) return <span>Finished · {c.lessonCount} lessons</span>;
  return (
    <span className="truncate">
      {c.next ? `Next: ${c.next.title}` : `${c.completedCount} of ${c.lessonCount} lessons`}
    </span>
  );
}

export function CourseCard({ course: c }: { course: CourseCardData }) {
  const pct = c.lessonCount ? Math.round((c.completedCount / c.lessonCount) * 100) : 0;
  return (
    <Link
      href={`/courses/${c.id}`}
      style={themeStyle(c.theme)}
      className={`${themeClass(null)} group relative flex flex-col overflow-hidden rounded-[22px] border border-border transition duration-300 hover:-translate-y-0.5 hover:shadow-[0_24px_60px_-30px_rgba(0,0,0,0.35)]`}
    >
      <div className="relative aspect-[2/1] overflow-hidden bg-surface">
        {c.coverSvg ? (
          <div className="absolute inset-0 [&>svg]:h-full [&>svg]:w-full" dangerouslySetInnerHTML={{ __html: c.coverSvg }} />
        ) : (
          <div className={`absolute inset-0 ${c.status === "outlining" ? "shimmer" : ""}`} />
        )}
      </div>
      <div className="flex flex-1 flex-col p-5">
        <h3 className="font-[family-name:var(--font-heading)] text-[21px] leading-snug tracking-tight text-text">{c.title}</h3>
        {c.subtitle && <p className="mt-1.5 line-clamp-2 text-[14px] leading-relaxed text-muted">{c.subtitle}</p>}
        <div className="mt-auto pt-5">
          {c.status === "active" && (
            <div className="mb-3 h-1 overflow-hidden rounded-full bg-border">
              <div className="h-full rounded-full bg-accent transition-[width] duration-700" style={{ width: `${pct}%` }} />
            </div>
          )}
          <div className="flex items-center font-ui text-[12.5px] text-muted">
            <StatusLine c={c} />
          </div>
        </div>
      </div>
    </Link>
  );
}
