import { compile, parse, type MathNode } from "mathjs";
import { type BlockOf, sectionBlocksSchema } from "@/content/blocks";

/**
 * Checks that a schema cannot express: does the plot actually teach something?
 * Problems become validation issues, so generateJson's repair round asks the model to fix them.
 */

function symbolsOf(expr: string): Set<string> | null {
  try {
    const names = new Set<string>();
    parse(expr).traverse((node: MathNode, _path, parent) => {
      const isCallee = parent?.type === "FunctionNode" && (parent as unknown as { fn: MathNode }).fn === node;
      if (node.type === "SymbolNode" && !isCallee) names.add((node as unknown as { name: string }).name);
    });
    return names;
  } catch {
    return null;
  }
}

const CONSTANTS = new Set(["pi", "e", "PI", "E", "tau", "phi", "Infinity"]);

export function plotIssues(b: BlockOf<"plot">): string[] {
  const issues: string[] = [];
  const params = new Map(b.params.map((p) => [p.name, p.value]));
  if (params.has("x")) issues.push(`a slider parameter is named "x"; x is the horizontal axis — rename the parameter`);
  if (b.x.max <= b.x.min) issues.push("x.max must be greater than x.min");
  if (b.y.max <= b.y.min) issues.push("y.max must be greater than y.min");

  const used = new Set<string>();
  let anyUsesX = false;
  b.curves.forEach((c, i) => {
    const syms = symbolsOf(c.expr);
    if (!syms) return issues.push(`curve ${i + 1} ("${c.expr}") does not parse as a math.js expression`);
    syms.forEach((s) => used.add(s));
    if (syms.has("x")) anyUsesX = true;
    const unknown = [...syms].filter((s) => s !== "x" && !params.has(s) && !CONSTANTS.has(s));
    if (unknown.length) issues.push(`curve ${i + 1} uses undefined names: ${unknown.join(", ")}`);

    // With the default slider values, a meaningful share of the curve should be visible.
    try {
      const f = compile(c.expr);
      let visible = 0;
      const n = 40;
      for (let k = 0; k <= n; k++) {
        const x = b.x.min + ((b.x.max - b.x.min) * k) / n;
        const y = f.evaluate({ ...Object.fromEntries(params), x });
        if (typeof y === "number" && Number.isFinite(y) && y >= b.y.min && y <= b.y.max) visible++;
      }
      if (visible < (n + 1) * 0.25) issues.push(`curve ${i + 1} ("${c.expr}") is mostly outside the y range [${b.y.min}, ${b.y.max}] at the default slider values`);
    } catch {
      /* undefined names are reported above */
    }
  });
  if (!anyUsesX && b.curves.length) issues.push("no curve depends on x, so the plot is just flat lines — write curves as functions of x and use sliders for extra parameters");
  for (const p of b.params) if (!used.has(p.name) && p.name !== "x") issues.push(`slider "${p.name}" is not used by any curve`);
  return issues;
}

/** Section schema used for generation: structural validation plus pedagogical checks. */
export const sectionQualitySchema = sectionBlocksSchema.superRefine((section, ctx) => {
  section.blocks.forEach((b, i) => {
    if (b.type !== "plot") return;
    for (const message of plotIssues(b)) ctx.addIssue({ code: "custom", path: ["blocks", i], message: `plot "${b.id}": ${message}` });
  });
});
