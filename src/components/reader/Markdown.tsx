import { Fragment, type ReactNode } from "react";
import { renderTex } from "@/lib/math";

/**
 * Inline markdown for lesson text: **bold**, *italic* or _italic_, `code`, [link](https://…),
 * $math$ and line breaks. Deliberately tiny: no HTML passes through except KaTeX output.
 */

function findClosing(src: string, token: string, from: number): number {
  let i = from;
  while (i < src.length) {
    const j = src.indexOf(token, i);
    if (j < 0) return -1;
    if (src[j - 1] !== "\\") return j;
    i = j + 1;
  }
  return -1;
}

/** $…$ math: opening $ not followed by space, closing $ not preceded by space nor followed by a digit. */
function findMathEnd(src: string, start: number): number {
  if (!src[start + 1] || /\s/.test(src[start + 1]) || src[start + 1] === "$") return -1;
  for (let j = start + 1; j < src.length; j++) {
    if (src[j] === "$" && src[j - 1] !== "\\") {
      if (/\s/.test(src[j - 1]) || /\d/.test(src[j + 1] ?? "")) continue;
      return j;
    }
  }
  return -1;
}

const LINK = /^\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/;

export function parseInline(src: string, keyPrefix = "m"): ReactNode[] {
  const out: ReactNode[] = [];
  let text = "";
  let k = 0;
  const key = () => `${keyPrefix}${k++}`;
  const flush = () => {
    if (text) out.push(text);
    text = "";
  };

  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    const rest = src.slice(i);

    if (ch === "\\" && /[$*_`[\]\\]/.test(src[i + 1] ?? "")) {
      text += src[i + 1];
      i++;
      continue;
    }
    if (ch === "\n") {
      flush();
      out.push(<br key={key()} />);
      continue;
    }
    if (ch === "$") {
      const end = findMathEnd(src, i);
      if (end > i) {
        flush();
        const tex = src.slice(i + 1, end);
        out.push(<span key={key()} className="math-inline" data-tex={tex} dangerouslySetInnerHTML={{ __html: renderTex(tex) }} />);
        i = end;
        continue;
      }
    }
    if (ch === "`") {
      const end = findClosing(src, "`", i + 1);
      if (end > i + 1) {
        flush();
        out.push(<code key={key()}>{src.slice(i + 1, end)}</code>);
        i = end;
        continue;
      }
    }
    if (rest.startsWith("**")) {
      const end = findClosing(src, "**", i + 2);
      if (end > i + 2) {
        flush();
        out.push(<strong key={key()}>{parseInline(src.slice(i + 2, end), `${keyPrefix}b${k}`)}</strong>);
        i = end + 1;
        continue;
      }
    }
    if ((ch === "*" || (ch === "_" && !/\w/.test(src[i - 1] ?? ""))) && src[i + 1] && !/\s/.test(src[i + 1])) {
      let end = findClosing(src, ch, i + 1);
      while (end > 0 && src[end + 1] === ch) end = findClosing(src, ch, end + 2);
      if (end > i + 1 && !/\s/.test(src[end - 1])) {
        flush();
        out.push(<em key={key()}>{parseInline(src.slice(i + 1, end), `${keyPrefix}i${k}`)}</em>);
        i = end;
        continue;
      }
    }
    if (ch === "[") {
      const m = rest.match(LINK);
      if (m) {
        flush();
        out.push(
          <a key={key()} href={m[2]} target="_blank" rel="noopener noreferrer">
            {parseInline(m[1], `${keyPrefix}l${k}`)}
          </a>,
        );
        i += m[0].length - 1;
        continue;
      }
      const bad = rest.match(/^\[([^\]]+)\]\([^)]*\)/);
      if (bad) {
        text += bad[1];
        i += bad[0].length - 1;
        continue;
      }
    }
    text += ch;
  }
  flush();
  return out;
}

export function Markdown({ md, className }: { md: string; className?: string }) {
  const nodes = parseInline(md);
  return className ? <span className={className}>{nodes}</span> : <Fragment>{nodes}</Fragment>;
}

export function DisplayMath({ tex, className = "" }: { tex: string; className?: string }) {
  return <div className={`overflow-x-auto overflow-y-hidden py-1 ${className}`} dangerouslySetInnerHTML={{ __html: renderTex(tex, true) }} />;
}
