"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { BlockOf } from "@/content/blocks";
import { Dots } from "@/components/ui/Spinner";
import { WidgetFrame } from "./WidgetFrame";

const THEME_VARS = ["bg", "surface", "text", "muted", "accent", "accent2", "border", "highlight"] as const;
const READY_TIMEOUT_MS = 4000;

function themeCss(el: Element | null): string {
  if (!el) return "";
  const cs = getComputedStyle(el);
  const vars = THEME_VARS.map((k) => `--${k}:${cs.getPropertyValue(`--${k}`).trim()};`).join("");
  const serif = /serif/.test(cs.getPropertyValue("--font-body")) && !/sans-serif/.test(cs.getPropertyValue("--font-body"));
  return `${vars}--font-body:${serif ? "Georgia, 'Times New Roman', serif" : "system-ui, -apple-system, 'Segoe UI', sans-serif"};color-scheme:${cs.colorScheme || "light"};`;
}

/** Wrap AI-written HTML: strict CSP (no network), theme variables, error + theme bridges. */
export function buildSrcDoc(code: string, css: string, origin: string): string {
  const csp = `default-src 'none'; script-src 'unsafe-inline' ${origin}/widget-libs/; style-src 'unsafe-inline'; img-src data: blob:; font-src data:; connect-src 'none'; media-src data: blob:`;
  const head =
    `<meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="${csp}">` +
    `<meta name="viewport" content="width=device-width,initial-scale=1">` +
    `<style id="el-theme">:root{${css}}</style>` +
    `<style>html,body{margin:0;height:100%;overflow:hidden;background:var(--surface);color:var(--text);font-family:var(--font-body)}</style>` +
    `<script>addEventListener('error',function(e){parent.postMessage({type:'error',message:String(e.message||e)},'*')});` +
    `addEventListener('message',function(e){if(e.data&&e.data.type==='theme'){var s=document.getElementById('el-theme');if(s)s.textContent=':root{'+e.data.css+'}'}});</script>`;
  if (/<head[^>]*>/i.test(code)) return code.replace(/<head[^>]*>/i, (m) => m + head);
  if (/<html[^>]*>/i.test(code)) return code.replace(/<html[^>]*>/i, (m) => `${m}<head>${head}</head>`);
  return `<!doctype html><html><head>${head}</head><body>${code}</body></html>`;
}

export function CustomWidget({ block, renderFallback }: { block: BlockOf<"custom">; renderFallback: (b: NonNullable<BlockOf<"custom">["fallback"]>) => React.ReactNode }) {
  const hostRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<HTMLIFrameElement>(null);
  const [state, setState] = useState<"loading" | "ready" | "failed">("loading");
  const [css, setCss] = useState("");
  const runnable = block.status === "ready" && !!block.code;

  useEffect(() => setCss(themeCss(hostRef.current)), []);

  const srcDoc = useMemo(
    () => (runnable && css ? buildSrcDoc(block.code!, css, window.location.origin) : ""),
    // The theme is sent by message after load; don't rebuild the document when it changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [runnable, block.code, css === ""],
  );

  useEffect(() => {
    if (!runnable) return;
    const onMessage = (e: MessageEvent) => {
      if (e.source !== frameRef.current?.contentWindow) return;
      if (e.data?.type === "ready") setState((s) => (s === "loading" ? "ready" : s));
      if (e.data?.type === "error") setState((s) => (s === "loading" ? "failed" : s));
    };
    window.addEventListener("message", onMessage);
    const timer = setTimeout(() => setState((s) => (s === "loading" ? "failed" : s)), READY_TIMEOUT_MS);
    return () => {
      window.removeEventListener("message", onMessage);
      clearTimeout(timer);
    };
  }, [runnable]);

  // Keep the simulation in sync with light/dark switches.
  useEffect(() => {
    if (!runnable) return;
    const push = () => {
      const next = themeCss(hostRef.current);
      frameRef.current?.contentWindow?.postMessage({ type: "theme", css: next }, "*");
    };
    const mo = new MutationObserver(push);
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ["data-scheme"] });
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    mq.addEventListener?.("change", push);
    return () => {
      mo.disconnect();
      mq.removeEventListener?.("change", push);
    };
  }, [runnable]);

  if (!runnable || state === "failed") {
    return (
      <div ref={hostRef}>
        {block.status === "pending" && (
          <p className="breakout -mb-8 mt-10 flex items-center justify-center gap-2 font-ui text-[12.5px] text-muted">
            A custom simulation is being built for this spot <Dots />
          </p>
        )}
        {block.fallback ? renderFallback(block.fallback) : block.status === "pending" ? <div className="breakout shimmer my-12 rounded-[var(--radius)]" style={{ height: block.height }} /> : null}
      </div>
    );
  }

  return (
    <div ref={hostRef}>
      <WidgetFrame caption={block.caption} label="Simulation">
        <div className="relative" style={{ height: block.height }}>
          {state === "loading" && <div className="shimmer absolute inset-0" />}
          {srcDoc && (
            <iframe
              ref={frameRef}
              title={block.brief.slice(0, 80)}
              sandbox="allow-scripts"
              srcDoc={srcDoc}
              className={`absolute inset-0 h-full w-full border-0 transition-opacity duration-500 ${state === "ready" ? "opacity-100" : "opacity-0"}`}
            />
          )}
        </div>
      </WidgetFrame>
    </div>
  );
}
