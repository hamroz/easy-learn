import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { parseCodexModels } from "@/server/ai/codex";
import { parseOpenCodeEvents, parseOpenCodeModels } from "@/server/ai/opencode";
import { createOpenRouterStreamParser, OpenRouterProvider, parseOpenRouterModels } from "@/server/ai/openrouter";

const fixture = (name: string) => readFileSync(new URL(`../fixtures/cli/${name}`, import.meta.url), "utf8");
const lines = (name: string) => fixture(name).split("\n").filter(Boolean);

describe("OpenCode", () => {
  it("returns the text of a successful run", () => {
    const r = parseOpenCodeEvents(lines("opencode-success.jsonl"));
    expect(r.error).toBeUndefined();
    expect(r.text?.length).toBeGreaterThan(10);
  });

  it("turns error events into provider errors", () => {
    const r = parseOpenCodeEvents(lines("opencode-error.jsonl"));
    expect(r.error?.kind).toBe("failed");
    expect(r.error?.message).toMatch(/server error/i);
  });

  it("parses the verbose model catalogue with names and effort variants", () => {
    const models = parseOpenCodeModels(fixture("opencode-models-verbose.txt"));
    expect(models.map((m) => m.id)).toEqual(["opencode/big-pickle", "opencode/gpt-5.2", "openrouter/~anthropic/claude-fable-latest"]);
    const gpt = models.find((m) => m.id === "opencode/gpt-5.2")!;
    expect(gpt.name).toBe("GPT-5.2");
    expect(gpt.efforts).toEqual(["none", "low", "medium", "high", "xhigh"]);
    expect(gpt.note).toMatch(/\$/);
  });
});

describe("Codex catalogue", () => {
  it("lists only visible models with their reasoning levels", () => {
    const models = parseCodexModels(fixture("codex-models.json"));
    expect(models.map((m) => m.id).sort()).toEqual(["gpt-5.5", "gpt-6-luna"]);
    expect(models.find((m) => m.id === "gpt-5.5")).toMatchObject({ defaultEffort: "medium", efforts: ["low", "medium", "high", "xhigh"] });
  });
});

describe("OpenRouter", () => {
  it("lists text models, offering effort only where reasoning is supported", () => {
    const models = parseOpenRouterModels(JSON.parse(fixture("openrouter-models.json")));
    const ids = models.map((m) => m.id);
    expect(ids).not.toContain("openrouter/auto-beta"); // image output
    expect(models.find((m) => m.id === "inclusionai/ling-3.1-flash")?.efforts).toEqual(["low", "medium", "high"]);
    expect(models.find((m) => m.id === "unbiased/pareto-26.10-preview")?.efforts).toEqual([]);
  });

  it("concatenates streamed deltas", () => {
    const deltas: string[] = [];
    const p = createOpenRouterStreamParser((d) => deltas.push(d));
    for (const l of fixture("openrouter-stream.txt").split("\n")) p.push(l);
    expect(deltas.join("")).toBe('{"word": "meadow"}');
    expect(p.finish()).toEqual({ text: '{"word": "meadow"}' });
  });

  it("maps auth errors to not_logged_in with a hint about the key", () => {
    const p = createOpenRouterStreamParser();
    for (const l of fixture("openrouter-error.txt").split("\n")) p.push(l);
    const r = p.finish();
    expect(r.error?.kind).toBe("not_logged_in");
    expect(r.error?.message).toMatch(/OpenRouter key/);
  });

  it("reports an error that arrives after some text instead of returning the partial text", () => {
    const p = createOpenRouterStreamParser();
    p.push('data: {"choices":[{"delta":{"content":"half an ans"}}]}');
    p.push('data: {"error":{"message":"Upstream provider failed","code":502}}');
    expect(p.finish().error?.message).toMatch(/Upstream provider failed/);
  });

  it("treats finish_reason error as a failure", () => {
    const p = createOpenRouterStreamParser();
    p.push('data: {"choices":[{"delta":{"content":"partial"},"finish_reason":"error"}]}');
    expect(p.finish().error).toBeTruthy();
  });

  it("refuses to run without a key", async () => {
    const err = await new OpenRouterProvider(null).complete({ task: "answer", system: "s", prompt: "p" }).catch((e) => e);
    expect(err.kind).toBe("not_logged_in");
  });
});
