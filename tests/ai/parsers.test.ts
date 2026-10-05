import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { parseCodexEvents } from "@/server/ai/codex";
import { createClaudeStreamParser } from "@/server/ai/claude";

const lines = (name: string) =>
  readFileSync(new URL(`../fixtures/cli/${name}`, import.meta.url), "utf8").split("\n").filter(Boolean);

describe("parseCodexEvents", () => {
  it("returns the final agent message", () => {
    expect(parseCodexEvents(lines("codex-success.jsonl"))).toEqual({ text: '{"word":"meadow"}' });
  });

  it("surfaces turn failures as a readable provider error, ignoring metadata warnings", () => {
    const r = parseCodexEvents(lines("codex-model-error.jsonl"));
    expect(r.text).toBeUndefined();
    expect(r.error?.kind).toBe("failed");
    expect(r.error?.message).toContain("is not supported when using Codex with a ChatGPT account");
  });
});

describe("createClaudeStreamParser", () => {
  it("concatenates text deltas and returns the final result", () => {
    const deltas: string[] = [];
    const p = createClaudeStreamParser((d) => deltas.push(d));
    for (const l of lines("claude-success.jsonl")) p.push(l);
    expect(deltas.join("")).toBe('{"word": "meadow"}');
    expect(p.finish()).toEqual({ text: '{"word": "meadow"}' });
  });

  it("maps authentication_failed to not_logged_in", () => {
    const p = createClaudeStreamParser();
    for (const l of lines("claude-auth.jsonl")) p.push(l);
    expect(p.finish().error?.kind).toBe("not_logged_in");
  });

  it("maps usage limits to rate_limited", () => {
    const p = createClaudeStreamParser();
    for (const l of lines("claude-rate-limit.jsonl")) p.push(l);
    const r = p.finish();
    expect(r.error?.kind).toBe("rate_limited");
    expect(r.error?.message).toContain("usage limit");
  });

  it("ignores non-JSON noise lines", () => {
    const p = createClaudeStreamParser();
    p.push("warning: something");
    for (const l of lines("claude-success.jsonl")) p.push(l);
    expect(p.finish().text).toBe('{"word": "meadow"}');
  });
});
