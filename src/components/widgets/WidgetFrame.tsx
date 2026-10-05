import { Markdown } from "@/components/reader/Markdown";

/** Shared chrome for interactive widgets: a slightly wider "breakout" card with an optional caption. */
export function WidgetFrame({
  children,
  caption,
  label,
  wide = true,
  className = "",
}: {
  children: React.ReactNode;
  caption?: string;
  label?: string;
  wide?: boolean;
  className?: string;
}) {
  return (
    <figure className={`my-12 ${wide ? "breakout" : ""}`} data-widget>
      <div className={`overflow-hidden rounded-[var(--radius)] border border-border bg-surface font-ui shadow-[0_1px_0_rgba(0,0,0,0.02),0_20px_50px_-35px_rgba(0,0,0,0.35)] ${className}`}>
        {label && (
          <div className="flex items-center gap-2 border-b border-border px-5 py-2.5 text-[11.5px] font-medium uppercase tracking-[0.14em] text-muted">
            <span className="h-1.5 w-1.5 rounded-full bg-accent" />
            {label}
          </div>
        )}
        {children}
      </div>
      {caption && (
        <figcaption className="mx-auto mt-3 max-w-[60ch] text-center font-[family-name:var(--font-body)] text-[14.5px] italic leading-relaxed text-muted">
          <Markdown md={caption} />
        </figcaption>
      )}
    </figure>
  );
}

export function PillButton({ active, onClick, children, disabled }: { active?: boolean; onClick: () => void; children: React.ReactNode; disabled?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`rounded-full px-3 py-1.5 text-[13px] transition disabled:opacity-40 ${active ? "bg-text text-surface" : "bg-border/40 text-muted hover:text-text"}`}
    >
      {children}
    </button>
  );
}

export function NavButton({ dir, onClick, disabled }: { dir: "prev" | "next"; onClick: () => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      aria-label={dir === "prev" ? "Previous step" : "Next step"}
      onClick={onClick}
      disabled={disabled}
      className="grid h-9 w-9 place-items-center rounded-full border border-border text-text transition hover:bg-border/40 disabled:opacity-30"
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
        <path d={dir === "prev" ? "M15 6l-6 6 6 6" : "M9 6l6 6-6 6"} />
      </svg>
    </button>
  );
}
