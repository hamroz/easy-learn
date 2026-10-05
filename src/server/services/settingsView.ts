import { createHash, randomBytes } from "node:crypto";
import { eq } from "drizzle-orm";
import { db } from "@/server/db/client";
import { settings } from "@/server/db/schema";
import { BUILTIN_PRESETS } from "@/content/ai";
import { normalizeEnabledFonts } from "@/content/fonts";
import { encryptSecret } from "@/server/crypto";
import { getAiSettings } from "./aiSettings";
import { ensureSettingsRow, getSettingsRow } from "./settings";

/** Everything the Settings page needs — secrets reduced to "set / last 4 characters". */
export async function settingsView(userId: string) {
  const row = await getSettingsRow(userId);
  return {
    ai: await getAiSettings(userId),
    builtinPresets: BUILTIN_PRESETS,
    fonts: normalizeEnabledFonts(row?.fonts),
    language: row?.language ?? "",
    openrouter: openrouterStatus(row?.secrets ?? null),
    token: { set: !!row?.authorTokenHash },
  };
}
export type SettingsView = Awaited<ReturnType<typeof settingsView>>;

function openrouterStatus(secrets: Record<string, string> | null) {
  return { set: !!secrets?.openrouter, last4: secrets?.openrouter ? (secrets.openrouterLast4 ?? null) : null };
}

export async function setOpenRouterKey(userId: string, key: string | null) {
  const row = await ensureSettingsRow(userId);
  const secrets = { ...(row.secrets ?? {}) };
  if (key) {
    secrets.openrouter = encryptSecret(key);
    secrets.openrouterLast4 = key.slice(-4);
  } else {
    delete secrets.openrouter;
    delete secrets.openrouterLast4;
  }
  await db.update(settings).set({ secrets }).where(eq(settings.userId, userId));
  return openrouterStatus(secrets);
}

export const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");

/** A new personal access token for the authoring API; only its hash is kept. */
export async function issueAuthorToken(userId: string) {
  const token = `el_${randomBytes(32).toString("base64url")}`;
  await ensureSettingsRow(userId);
  await db.update(settings).set({ authorTokenHash: hashToken(token) }).where(eq(settings.userId, userId));
  return token;
}

export async function revokeAuthorToken(userId: string) {
  await ensureSettingsRow(userId);
  await db.update(settings).set({ authorTokenHash: null }).where(eq(settings.userId, userId));
}
