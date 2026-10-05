"use client";

import { autoUpdate, flip, offset, shift, size, useFloating } from "@floating-ui/react";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { api } from "@/lib/api";
import type { Anchor } from "@/lib/anchors";
import { postSse } from "@/lib/sse";
import type { ThreadJson } from "@/lib/types";
import { Dots } from "@/components/ui/Spinner";
import { RichText } from "../RichText";

export type Draft = { lessonId: string; sectionId: string; blockId: string; variantId: string | null; anchor: Anchor };
type Msg = { id: string; role: "user" | "assistant"; content: string; streaming?: boolean };

const QUICK = ["Explain this simply", "Give me an example", "Why does this matter?"];

export function AskPopover({
  thread,
  draft,
  initialQuestion,
  getRect,
  onClose,
  onCreated,
  onChanged,
}: {
  thread: ThreadJson | null;
  draft: Draft | null;
  initialQuestion?: string;
  /** Viewport rect of the highlighted passage, or null when it is not on screen. */
  getRect: () => DOMRect | null;
  onClose: () => void;
  onCreated: (threadId: string) => void;
  onChanged: () => void;
}) {
  const [threadId, setThreadId] = useState<string | null>(thread?.id ?? null);
  const [messages, setMessages] = useState<Msg[]>(thread?.messages ?? []);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const [mobile, setMobile] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const quote = thread?.anchor.quote ?? draft?.anchor.quote ?? "";

  const { refs, floatingStyles } = useFloating({
    placement: "bottom",
    strategy: "fixed",
    middleware: [
      offset(12),
      flip({ padding: 16, fallbackPlacements: ["top"] }),
      shift({ padding: 16 }),
      size({
        padding: 16,
        apply({ availableHeight, elements }) {
          elements.floating.style.maxHeight = `${Math.max(260, Math.min(availableHeight, 560))}px`;
        },
      }),
    ],
    whileElementsMounted: autoUpdate,
    // Position with top/left: the fade-in animation animates `transform`.
    transform: false,
  });

  useLayoutEffect(() => {
    setMobile(window.innerWidth < 640);
    refs.setPositionReference({
      getBoundingClientRect: () => getRect() ?? new DOMRect(window.innerWidth / 2, window.innerHeight / 3, 0, 0),
    });
  }, [refs, getRect]);

  // Keep server truth when the parent refreshes, unless we are mid-stream.
  useEffect(() => {
    if (thread && !busy) setMessages(thread.messages);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [thread?.messages.length]);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  // A thread that never got a message (e.g. the first send failed) is removed when closed.
  const close = () => {
    if (threadId && messages.length === 0) void api(`/api/threads/${threadId}`, { method: "DELETE" }).then(onChanged, () => {});
    onClose();
  };
  const onCloseRef = useRef(close);
  onCloseRef.current = close;
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onCloseRef.current();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  // Cancel an in-flight answer only when the popover actually closes.
  useEffect(() => () => abortRef.current?.abort(), []);

  const send = async (question: string) => {
    const q = question.trim();
    if (!q || busy) return;
    setBusy(true);
    setError(undefined);
    setInput("");
    const local: Msg[] = [...messages, { id: `u${Date.now()}`, role: "user", content: q }, { id: "streaming", role: "assistant", content: "", streaming: true }];
    setMessages(local);
    try {
      let id = threadId;
      if (!id && draft) {
        const res = await api<{ thread: { id: string } }>("/api/threads", { body: draft });
        id = res.thread.id;
        setThreadId(id);
        onCreated(id);
      }
      if (!id) throw new Error("No thread");
      abortRef.current = new AbortController();
      let failed: string | null = null;
      await postSse(
        `/api/threads/${id}/messages`,
        { content: q },
        (event, data) => {
          if (event === "delta") {
            const text = (data as { text: string }).text;
            setMessages((m) => m.map((x) => (x.streaming ? { ...x, content: x.content + text } : x)));
          } else if (event === "reset") {
            // The first model failed mid-answer; the backup model starts over.
            setMessages((m) => m.map((x) => (x.streaming ? { ...x, content: "" } : x)));
          } else if (event === "done") {
            const msg = (data as { message: Msg }).message;
            setMessages((m) => m.map((x) => (x.streaming ? { ...msg } : x)));
          } else if (event === "error") {
            failed = (data as { error: string }).error;
          }
        },
        abortRef.current.signal,
      );
      if (failed) throw new Error(failed);
      onChanged();
    } catch (e) {
      if ((e as Error).name === "AbortError") return;
      setError((e as Error).message);
      setMessages((m) => m.filter((x) => !(x.streaming && !x.content)).map((x) => ({ ...x, streaming: false })));
    } finally {
      setBusy(false);
      inputRef.current?.focus();
    }
  };

  // Ask the quick question passed in from the selection toolbar ("Explain").
  const asked = useRef(false);
  useEffect(() => {
    if (initialQuestion && !asked.current) {
      asked.current = true;
      void send(initialQuestion);
    } else inputRef.current?.focus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const remove = async () => {
    if (!threadId) return onClose();
    await api(`/api/threads/${threadId}`, { method: "DELETE" }).catch(() => {});
    onChanged();
    onClose();
  };

  return (
    <div
      ref={refs.setFloating}
      style={mobile ? undefined : floatingStyles}
      data-ask-popover
      role="dialog"
      aria-label="Ask about this passage"
      className={`z-50 flex flex-col overflow-hidden border border-border bg-surface font-ui text-text shadow-[0_30px_80px_-20px_rgba(0,0,0,0.45)] ${
        mobile ? "fixed inset-x-0 bottom-0 max-h-[78vh] rounded-t-3xl" : "w-[min(440px,calc(100vw-32px))] rounded-2xl"
      } animate-fade-up`}
    >
      <div className="flex items-start gap-3 border-b border-border px-4 py-3">
        <p className="line-clamp-2 flex-1 border-l-2 border-accent pl-3 font-[family-name:var(--font-body)] text-[14.5px] italic leading-snug text-muted">{quote}</p>
        <div className="flex shrink-0 items-center gap-0.5">
          {threadId && (
            <button onClick={remove} title="Delete this conversation" aria-label="Delete this conversation" className="grid h-8 w-8 place-items-center rounded-lg text-muted hover:bg-border/50 hover:text-text">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden>
                <path d="M4 7h16M10 11v6M14 11v6M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12M9 7V4h6v3" />
              </svg>
            </button>
          )}
          <button onClick={close} title="Close (Esc)" aria-label="Close" className="grid h-8 w-8 place-items-center rounded-lg text-muted hover:bg-border/50 hover:text-text">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>
      </div>

      <div ref={listRef} className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-4">
        {messages.length === 0 && (
          <div className="flex flex-wrap gap-2">
            {QUICK.map((q) => (
              <button key={q} onClick={() => send(q)} className="rounded-full border border-border px-3 py-1.5 text-[13px] text-muted transition hover:border-muted/60 hover:text-text">
                {q}
              </button>
            ))}
          </div>
        )}
        {messages.map((m) =>
          m.role === "user" ? (
            <div key={m.id} className="flex justify-end">
              <div className="max-w-[85%] rounded-2xl rounded-br-md bg-border/50 px-3.5 py-2 text-[14px] leading-relaxed">{m.content}</div>
            </div>
          ) : (
            <div key={m.id} className="font-[family-name:var(--font-body)] text-[16px] leading-relaxed text-text">
              {m.content ? <RichText text={m.content} /> : <Dots className="text-muted" />}
            </div>
          ),
        )}
        {error && <p className="rounded-lg bg-[#b42318]/10 px-3 py-2 text-[13px] text-[#b42318] dark:text-[#ff8a80]">{error}</p>}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          void send(input);
        }}
        className="flex items-end gap-2 border-t border-border px-3 py-3"
      >
        <textarea
          ref={inputRef}
          rows={1}
          value={input}
          onChange={(e) => {
            setInput(e.target.value);
            e.target.style.height = "0px";
            e.target.style.height = `${Math.min(e.target.scrollHeight, 140)}px`;
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              void send(input);
            }
          }}
          placeholder={messages.length ? "Ask a follow-up…" : "Ask anything about this…"}
          aria-label="Your question"
          className="max-h-36 min-h-[40px] flex-1 resize-none rounded-xl border border-border bg-bg px-3 py-2 text-[14.5px] leading-relaxed outline-none placeholder:text-muted/70 focus:border-accent"
        />
        <button
          type="submit"
          disabled={!input.trim() || busy}
          aria-label="Send"
          className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-text text-bg transition disabled:opacity-30"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden>
            <path d="M12 19V5M6 11l6-6 6 6" />
          </svg>
        </button>
      </form>
    </div>
  );
}
