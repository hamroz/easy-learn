import { describe, expect, it } from "vitest";
import { z } from "zod";
import { AIOutputError, extractJson, generateJson } from "@/server/ai/json";
import type { AIProvider, CompleteRequest } from "@/server/ai/types";

describe("extractJson", () => {
  it("parses fenced JSON", () => {
    expect(extractJson('```json\n{"a": 1}\n```')).toEqual({ a: 1 });
  });
  it("parses JSON surrounded by prose, with braces inside strings", () => {
    expect(extractJson('Sure! Here it is: {"a": "}{", "b": {"c": [1]}} hope it helps')).toEqual({ a: "}{", b: { c: [1] } });
  });
  it("throws when there is no object", () => {
    expect(() => extractJson("no json here")).toThrow();
  });
});

function scripted(replies: string[]): AIProvider & { calls: CompleteRequest[] } {
  const calls: CompleteRequest[] = [];
  return {
    id: "mock",
    calls,
    async complete(req) {
      calls.push(req);
      return replies.shift() ?? "";
    },
    async health() {
      return { ok: true, message: "" };
    },
  };
}

const schema = z.object({ word: z.string().min(1) });
const req: CompleteRequest = { task: "outline", system: "s", prompt: "p" };

describe("generateJson", () => {
  it("returns valid output without repair", async () => {
    const p = scripted(['{"word":"meadow"}']);
    expect(await generateJson(p, schema, req)).toEqual({ word: "meadow" });
    expect(p.calls).toHaveLength(1);
  });

  it("performs exactly one repair round that includes the validation error", async () => {
    const p = scripted(['{"word":""}', '{"word":"fixed"}']);
    expect(await generateJson(p, schema, req)).toEqual({ word: "fixed" });
    expect(p.calls).toHaveLength(2);
    expect(p.calls[1].task).toBe("repair");
    expect(p.calls[1].prompt).toContain("word");
  });

  it("throws AIOutputError after the repair also fails", async () => {
    const p = scripted(["nope", "still nope", "never called"]);
    await expect(generateJson(p, schema, req)).rejects.toBeInstanceOf(AIOutputError);
    expect(p.calls).toHaveLength(2);
  });

  it("uses the lenient fallback when both attempts fail validation", async () => {
    const p = scripted(['{"word": 1}', '{"word": 2}']);
    const out = await generateJson(p, schema, req, { lenient: (raw) => ({ word: String((raw as { word: number }).word) }) });
    expect(out).toEqual({ word: "2" });
  });
});
