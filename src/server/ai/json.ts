import type { z } from "zod";
import type { AIProvider, CompleteRequest } from "./types";

export class AIOutputError extends Error {
  constructor(
    message: string,
    public readonly raw: string,
  ) {
    super(message);
    this.name = "AIOutputError";
  }
}

/** Find and parse the first balanced JSON object in model output (handles fences and surrounding prose). */
export function extractJson(text: string): unknown {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const source = fenced ? fenced[1] : text;
  const start = source.indexOf("{");
  if (start < 0) throw new Error("No JSON object found in the response");

  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let i = start; i < source.length; i++) {
    const ch = source[i];
    if (inString) {
      if (escaped) escaped = false;
      else if (ch === "\\") escaped = true;
      else if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') inString = true;
    else if (ch === "{") depth++;
    else if (ch === "}") {
      depth--;
      if (depth === 0) return JSON.parse(source.slice(start, i + 1));
    }
  }
  throw new Error("The JSON object in the response is incomplete");
}

function describeIssues(error: z.ZodError): string {
  return error.issues
    .slice(0, 20)
    .map((i) => `- ${i.path.join(".") || "(root)"}: ${i.message}`)
    .join("\n");
}

type Attempt<T> = { ok: true; value: T } | { ok: false; problem: string; raw?: unknown };

function attempt<T>(schema: z.ZodType<T>, text: string): Attempt<T> {
  let raw: unknown;
  try {
    raw = extractJson(text);
  } catch (e) {
    return { ok: false, problem: (e as Error).message };
  }
  const parsed = schema.safeParse(raw);
  return parsed.success ? { ok: true, value: parsed.data } : { ok: false, problem: describeIssues(parsed.error), raw };
}

/**
 * Ask for JSON, validate it, and if invalid do exactly one repair round with the validation errors.
 * `lenient` may salvage the last raw object (e.g. keep valid blocks only) before giving up.
 */
export async function generateJson<T>(
  provider: AIProvider,
  schema: z.ZodType<T>,
  req: CompleteRequest,
  opts: { lenient?: (raw: unknown) => T | null } = {},
): Promise<T> {
  const first = await provider.complete(req);
  const a = attempt(schema, first);
  if (a.ok) return a.value;

  const second = await provider.complete({
    ...req,
    task: "repair",
    onDelta: undefined,
    prompt: `${req.prompt}\n\n---\nYour previous reply could not be used:\n${a.problem}\n\nPrevious reply (truncated):\n${first.slice(0, 24_000)}\n\nReply again with the complete, corrected JSON object only.`,
  });
  const b = attempt(schema, second);
  if (b.ok) return b.value;

  const salvage = b.raw ?? a.raw;
  if (opts.lenient && salvage !== undefined) {
    const value = opts.lenient(salvage);
    if (value !== null) return value;
  }
  throw new AIOutputError(`The AI returned invalid content twice:\n${b.problem}`, second);
}
