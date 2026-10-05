"use client";

import { Dots } from "@/components/ui/Spinner";

type Kind = "simpler" | "deeper";

/**
 * Margin tools on hover (wide screens) to rewrite a paragraph, and — once variants exist —
 * a quiet switcher between the original and its rewrites.
 */
export function ParagraphTools({
  available,
  active,
  loading,
  onRequest,
  onShow,
}: {
  available: { id: string; kind: Kind }[];
  active: string | null;
  loading: Kind | null;
  onRequest: (kind: Kind) => void;
  onShow: (variantId: string | null) => void;
}) {
  const has = (k: Kind) => available.find((v) => v.kind === k);
  const label = { simpler: "Simpler", deeper: "Deeper" } as const;

  return (
    <>
      <div className="absolute -right-28 top-1 hidden w-24 flex-col items-start gap-1 font-ui text-[12px] opacity-0 transition group-hover/para:opacity-100 xl:flex">
        {(["simpler", "deeper"] as const).map((k) => (
          <button
            key={k}
            type="button"
            onClick={() => (has(k) ? onShow(has(k)!.id) : onRequest(k))}
            className="rounded-full px-2.5 py-1 text-muted transition hover:bg-border/50 hover:text-text"
          >
            {loading === k ? <Dots /> : `${label[k]} ¶`}
          </button>
        ))}
      </div>
      {(available.length > 0 || loading) && (
        <div className="-mt-3 mb-6 flex items-center gap-1 font-ui text-[12px]" role="tablist" aria-label="Paragraph version">
          <Seg active={!active} onClick={() => onShow(null)}>
            Original
          </Seg>
          {(["simpler", "deeper"] as const).map((k) => {
            const v = has(k);
            if (v) return <Seg key={k} active={active === v.id} onClick={() => onShow(v.id)}>{label[k]}</Seg>;
            if (loading === k)
              return (
                <span key={k} className="flex items-center gap-1.5 px-2.5 py-1 text-muted">
                  {label[k]} <Dots />
                </span>
              );
            return null;
          })}
        </div>
      )}
    </>
  );
}

function Seg({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={`rounded-full px-2.5 py-1 transition ${active ? "bg-accent/12 text-accent" : "text-muted hover:text-text"}`}
    >
      {children}
    </button>
  );
}
