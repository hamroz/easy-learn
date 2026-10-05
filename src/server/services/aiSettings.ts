import { eq } from "drizzle-orm";
import { db } from "@/server/db/client";
import { settings } from "@/server/db/schema";
import { type AiSettings, aiSettingsSchema, BUILTIN_PRESETS, type Preset, type ProviderKey, uniformPreset } from "@/content/ai";
import { ensureSettingsRow, getSettingsRow } from "./settings";

export function defaultPresetId(): string {
  return process.env.AI_PROVIDER === "mock" ? "builtin:mock" : process.env.AI_PROVIDER === "opencode-cli" ? "builtin:opencode" : "builtin:codex";
}

export function allPresets(s: AiSettings): Preset[] {
  return [...s.presets, ...BUILTIN_PRESETS];
}

export function activePreset(s: AiSettings): Preset {
  return allPresets(s).find((p) => p.id === s.activePresetId) ?? BUILTIN_PRESETS.find((p) => p.id === defaultPresetId())!;
}

/** Stored AI settings, migrating the phase-1 provider/model columns on first read. */
export async function getAiSettings(userId: string): Promise<AiSettings> {
  const row = await getSettingsRow(userId);
  const parsed = row?.ai ? aiSettingsSchema.safeParse(row.ai) : null;
  if (parsed?.success) {
    const s = parsed.data;
    const known = allPresets(s).some((p) => p.id === s.activePresetId);
    return known ? s : { ...s, activePresetId: defaultPresetId() };
  }
  if (row?.provider || row?.lessonModel || row?.chatModel) {
    const provider = (row.provider ?? "codex-cli") as ProviderKey;
    const preset = uniformPreset("my-setup", "My setup", provider, { lesson: row.lessonModel, chat: row.chatModel });
    return { library: {}, presets: [preset], activePresetId: preset.id };
  }
  return { library: {}, presets: [], activePresetId: defaultPresetId() };
}

export async function saveAiSettings(userId: string, value: AiSettings): Promise<AiSettings> {
  const clean = aiSettingsSchema.parse(value);
  await ensureSettingsRow(userId);
  await db.update(settings).set({ ai: clean }).where(eq(settings.userId, userId));
  return clean;
}
