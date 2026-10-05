import { z } from "zod";

/** Model routing shared by server and Settings UI (spec: round 2 §4). */

export const PROVIDERS = ["codex-cli", "opencode-cli", "openrouter", "claude-cli", "mock"] as const;
export type ProviderKey = (typeof PROVIDERS)[number];
/** Providers shown in Settings (Claude is kept in code but hidden at the owner's request). */
export const VISIBLE_PROVIDERS: ProviderKey[] = ["codex-cli", "opencode-cli", "openrouter", "mock"];

export const PROVIDER_LABELS: Record<ProviderKey, string> = {
  "codex-cli": "Codex",
  "opencode-cli": "OpenCode",
  openrouter: "OpenRouter",
  "claude-cli": "Claude",
  mock: "Sample content",
};

export const TASKS = ["course", "cover", "plan", "writing", "simulation", "answer", "rewrite", "quiz"] as const;
export type TaskKey = (typeof TASKS)[number];

export const TASK_LABELS: Record<TaskKey, { name: string; hint: string }> = {
  course: { name: "Course design", hint: "outline, theme, reshaping and steering" },
  cover: { name: "Cover art", hint: "the abstract SVG cover" },
  plan: { name: "Lesson plans", hint: "the sections of each lesson" },
  writing: { name: "Lesson writing", hint: "the prose and library widgets" },
  simulation: { name: "Simulations", hint: "custom interactive code" },
  answer: { name: "Answers", hint: "questions about selected text" },
  rewrite: { name: "Rewrites", hint: "simpler / deeper paragraphs" },
  quiz: { name: "Quizzes", hint: "only when you ask for one" },
};

export const modelRefSchema = z.object({
  provider: z.enum(PROVIDERS),
  model: z.string().trim().max(200).nullable(),
  effort: z.string().trim().max(40).nullable(),
});
export type ModelRef = z.infer<typeof modelRefSchema>;

export const routeSchema = z.object({ primary: modelRefSchema, fallback: modelRefSchema.nullable() });
export type Route = z.infer<typeof routeSchema>;

export const presetSchema = z.object({
  id: z.string().min(1).max(60),
  name: z.string().trim().min(1).max(60),
  routes: z.object(Object.fromEntries(TASKS.map((t) => [t, routeSchema])) as Record<TaskKey, typeof routeSchema>),
});
export type Preset = z.infer<typeof presetSchema>;

export const aiSettingsSchema = z.object({
  library: z.partialRecord(z.enum(PROVIDERS), z.array(z.string().max(200)).max(500)).default({}),
  presets: z.array(presetSchema).max(20).default([]),
  activePresetId: z.string().min(1).max(60),
});
export type AiSettings = z.infer<typeof aiSettingsSchema>;

/** Effort used per task in built-in presets. */
export const DEFAULT_EFFORT: Record<TaskKey, "low" | "medium" | "high"> = {
  course: "medium",
  cover: "low",
  plan: "medium",
  writing: "medium",
  simulation: "high",
  answer: "low",
  rewrite: "low",
  quiz: "low",
};

export function uniformPreset(id: string, name: string, provider: ProviderKey, models: { lesson?: string | null; chat?: string | null } = {}): Preset {
  const chatTasks: TaskKey[] = ["answer", "rewrite", "quiz"];
  const routes = Object.fromEntries(
    TASKS.map((t) => [
      t,
      {
        primary: {
          provider,
          model: (chatTasks.includes(t) ? models.chat : models.lesson) ?? null,
          effort: provider === "mock" ? null : DEFAULT_EFFORT[t],
        },
        fallback: null,
      },
    ]),
  ) as Record<TaskKey, Route>;
  return { id, name, routes };
}

export const BUILTIN_PRESETS: Preset[] = [
  uniformPreset("builtin:codex", "Codex — balanced", "codex-cli"),
  uniformPreset("builtin:opencode", "OpenCode — its default model", "opencode-cli"),
  uniformPreset("builtin:mock", "Sample content (offline)", "mock"),
];
