"use client";

import { autoUpdate, flip, offset, shift, useFloating } from "@floating-ui/react";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { buildAnchor, rangeFromOffsets, reanchor, selectableText } from "@/lib/anchors";
import { caretAt, clearHighlights, HIGHLIGHT_CSS, paintHighlights } from "@/lib/highlights";
import type { ThreadJson } from "@/lib/types";
import { AskPopover, type Draft } from "./AskPopover";
import { ThreadsDrawer } from "./ThreadsDrawer";

type Selection = { range: Range; draft: Draft; paragraph: boolean };
type Open = { key: string; threadId: string | null; draft: Draft | null; range: Range | null; question?: string };

const elementOf = (n: Node) => (n.nodeType === Node.ELEMENT_NODE ? (n as Element) : n.parentElement);

export function AskLayer({
  lessonId,
  articleRef,
  threads,
  onChanged,
  showVariant,
  onRewrite,
}: {
  lessonId: string;
  articleRef: React.RefObject<HTMLElement | null>;
  threads: ThreadJson[];
  onChanged: () => void;
  /** Make sure a block shows the given variant (null = original) before revealing a thread. */
  showVariant: (sectionId: string, blockId: string, variantId: string | null) => void;
  onRewrite: (sectionId: string, blockId: string, kind: "simpler" | "deeper") => void;
}) {
  const [sel, setSel] = useState<Selection | null>(null);
  const [open, setOpen] = useState<Open | null>(null);
  const [drawer, setDrawer] = useState(false);
  const ranges = useRef(new Map<string, Range>());

  // ---- Track text selection inside one selectable block ----
  useEffect(() => {
    const update = () => {
      const s = window.getSelection();
      if (!s || s.isCollapsed || !s.rangeCount) return setSel(null);
      const range = s.getRangeAt(0);
      const startEl = elementOf(range.startContainer)?.closest<HTMLElement>("[data-selectable]");
      const endEl = elementOf(range.endContainer)?.closest<HTMLElement>("[data-selectable]");
      if (!startEl || startEl !== endEl || !articleRef.current?.contains(startEl)) return setSel(null);
      const anchor = buildAnchor(startEl, range);
      if (!anchor || anchor.quote.trim().length < 2 || anchor.quote.length > 1500) return setSel(null);
      setSel({
        range: range.cloneRange(),
        paragraph: startEl.tagName === "P" && !!startEl.closest(".group\\/para"),
        draft: {
          lessonId,
          sectionId: startEl.dataset.sectionId!,
          blockId: startEl.dataset.blockId!,
          variantId: startEl.dataset.variantId || null,
          anchor,
        },
      });
    };
    const later = () => setTimeout(update, 10);
    const onSelChange = () => {
      const s = window.getSelection();
      if (!s || s.isCollapsed) setSel(null);
    };
    document.addEventListener("mouseup", later);
    document.addEventListener("keyup", later);
    document.addEventListener("touchend", later);
    document.addEventListener("selectionchange", onSelChange);
    return () => {
      document.removeEventListener("mouseup", later);
      document.removeEventListener("keyup", later);
      document.removeEventListener("touchend", later);
      document.removeEventListener("selectionchange", onSelChange);
    };
  }, [articleRef, lessonId]);

  // ---- Paint highlights after every render (cheap; ranges follow React's text nodes) ----
  useLayoutEffect(() => {
    const article = articleRef.current;
    if (!article) return;
    const map = new Map<string, Range>();
    for (const t of threads) {
      const el = article.querySelector<HTMLElement>(`[data-section-id="${t.sectionId}"][data-block-id="${CSS.escape(t.blockId)}"]`);
      if (!el || (el.dataset.variantId || null) !== (t.variantId || null)) continue;
      const off = reanchor(selectableText(el), t.anchor);
      const range = off && rangeFromOffsets(el, off.start, off.end);
      if (range) map.set(t.id, range);
    }
    ranges.current = map;
    const activeId = open?.threadId;
    // A brand-new thread is not in `threads` until the next refresh; keep its selection range lit meanwhile.
    const activeRange = (activeId && map.get(activeId)) || open?.range || null;
    const active = activeRange ? [activeRange] : [];
    paintHighlights([...map.entries()].filter(([id]) => id !== activeId).map(([, r]) => r), active);
  });
  useEffect(() => clearHighlights, []);

  // ---- Click a highlight to reopen its conversation; pointer cursor over highlights ----
  const threadAt = useCallback((x: number, y: number) => {
    const caret = caretAt(x, y);
    if (!caret) return null;
    for (const [id, r] of ranges.current) {
      try {
        if (r.isPointInRange(caret.node, caret.offset) && caret.offset !== r.endOffset) return id;
      } catch {
        /* different root */
      }
    }
    return null;
  }, []);

  useEffect(() => {
    const article = articleRef.current;
    if (!article) return;
    const onClick = (e: MouseEvent) => {
      const s = window.getSelection();
      if (s && !s.isCollapsed) return;
      const id = threadAt(e.clientX, e.clientY);
      if (id) setOpen({ key: id, threadId: id, draft: null, range: null });
    };
    let raf = 0;
    const onMove = (e: MouseEvent) => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        article.style.cursor = ranges.current.size && threadAt(e.clientX, e.clientY) ? "pointer" : "";
      });
    };
    article.addEventListener("click", onClick);
    article.addEventListener("mousemove", onMove);
    return () => {
      article.removeEventListener("click", onClick);
      article.removeEventListener("mousemove", onMove);
    };
  }, [articleRef, threadAt]);

  const startAsk = (question?: string) => {
    if (!sel) return;
    setOpen({ key: `draft-${Date.now()}`, threadId: null, draft: sel.draft, range: sel.range, question });
    setSel(null);
    window.getSelection()?.removeAllRanges();
  };

  const reveal = (t: ThreadJson) => {
    setDrawer(false);
    showVariant(t.sectionId, t.blockId, t.variantId);
    requestAnimationFrame(() => {
      const el = articleRef.current?.querySelector(`[data-section-id="${t.sectionId}"][data-block-id="${CSS.escape(t.blockId)}"]`);
      el?.scrollIntoView({ behavior: "smooth", block: "center" });
      setTimeout(() => setOpen({ key: t.id, threadId: t.id, draft: null, range: null }), 450);
    });
  };

  const openThread = open?.threadId ? (threads.find((t) => t.id === open.threadId) ?? null) : null;
  const getRect = useCallback(() => {
    if (!open) return null;
    const r = (open.threadId && ranges.current.get(open.threadId)) || open.range;
    if (!r) return null;
    const rects = r.getClientRects();
    return rects.length ? rects[rects.length - 1] : r.getBoundingClientRect();
  }, [open]);

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: HIGHLIGHT_CSS }} />
      {sel && !open && <SelectionToolbar range={sel.range} paragraph={sel.paragraph} onAsk={() => startAsk()} onExplain={() => startAsk("Explain this simply")} onRewrite={(kind) => {
        onRewrite(sel.draft.sectionId, sel.draft.blockId, kind);
        setSel(null);
        window.getSelection()?.removeAllRanges();
      }} />}

      {open && (
        <AskPopover
          key={open.key}
          thread={openThread}
          draft={open.draft}
          initialQuestion={open.question}
          getRect={getRect}
          onClose={() => setOpen(null)}
          onCreated={(id) => setOpen((o) => (o ? { ...o, threadId: id } : o))}
          onChanged={onChanged}
        />
      )}

      {threads.length > 0 && (
        <button
          onClick={() => setDrawer(true)}
          className="fixed bottom-5 right-5 z-30 flex items-center gap-2 rounded-full border border-border bg-surface/90 px-4 py-2.5 font-ui text-[13px] text-text shadow-[0_12px_40px_-12px_rgba(0,0,0,0.35)] backdrop-blur transition hover:border-muted/50"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden>
            <path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z" />
          </svg>
          My questions <span className="tabular-nums text-muted">{threads.length}</span>
        </button>
      )}
      {drawer && <ThreadsDrawer threads={threads} onClose={() => setDrawer(false)} onSelect={reveal} />}
    </>
  );
}

function SelectionToolbar({
  range,
  paragraph,
  onAsk,
  onExplain,
  onRewrite,
}: {
  range: Range;
  paragraph: boolean;
  onAsk: () => void;
  onExplain: () => void;
  onRewrite: (kind: "simpler" | "deeper") => void;
}) {
  const { refs, floatingStyles } = useFloating({
    placement: "top",
    strategy: "fixed",
    middleware: [offset(10), flip({ padding: 64 }), shift({ padding: 12 })],
    whileElementsMounted: autoUpdate,
    // Position with top/left: the fade-in animation animates `transform`.
    transform: false,
  });
  useLayoutEffect(() => {
    refs.setPositionReference({ getBoundingClientRect: () => range.getBoundingClientRect(), getClientRects: () => range.getClientRects() });
  }, [range, refs]);

  // mousedown preventDefault keeps the text selection alive while clicking a button.
  const keep = (e: React.MouseEvent) => e.preventDefault();
  const btn = "flex items-center gap-1.5 rounded-full px-3 py-1.5 transition hover:bg-white/15";
  return (
    <div
      ref={refs.setFloating}
      style={floatingStyles}
      onMouseDown={keep}
      className="z-50 flex animate-fade-up items-center gap-0.5 rounded-full bg-text p-1 font-ui text-[13px] text-bg shadow-[0_14px_40px_-10px_rgba(0,0,0,0.5)]"
      role="toolbar"
      aria-label="Selection actions"
    >
      <button onClick={onAsk} className={`${btn} font-medium`}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
          <path d="M12 2c1.2 4.3 3.7 6.8 8 8-4.3 1.2-6.8 3.7-8 8-1.2-4.3-3.7-6.8-8-8 4.3-1.2 6.8-3.7 8-8z" />
        </svg>
        Ask
      </button>
      <button onClick={onExplain} className={btn}>
        Explain simply
      </button>
      {paragraph && (
        <>
          <span className="mx-0.5 h-4 w-px bg-white/20" />
          <button onClick={() => onRewrite("simpler")} className={btn} title="Rewrite this paragraph more simply">
            Simpler ¶
          </button>
          <button onClick={() => onRewrite("deeper")} className={btn} title="Rewrite this paragraph in more depth">
            Deeper ¶
          </button>
        </>
      )}
    </div>
  );
}
