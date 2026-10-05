import { Markdown } from "./Markdown";

/** Answers: paragraphs separated by blank lines, "- " / "1. " lists, inline markdown inside. */
export function RichText({ text, className = "" }: { text: string; className?: string }) {
  const blocks = text.trim().split(/\n{2,}/);
  return (
    <div className={`space-y-3 ${className}`}>
      {blocks.map((b, i) => {
        const lines = b.split("\n");
        const bullet = lines.every((l) => /^\s*[-*•]\s+/.test(l));
        const numbered = lines.every((l) => /^\s*\d+[.)]\s+/.test(l));
        if (bullet || numbered) {
          const Tag = numbered ? "ol" : "ul";
          return (
            <Tag key={i} className={`space-y-1 pl-5 ${numbered ? "list-decimal" : "list-disc"} marker:text-muted`}>
              {lines.map((l, j) => (
                <li key={j}>
                  <Markdown md={l.replace(/^\s*(?:[-*•]|\d+[.)])\s+/, "")} />
                </li>
              ))}
            </Tag>
          );
        }
        return (
          <p key={i}>
            <Markdown md={b} />
          </p>
        );
      })}
    </div>
  );
}
