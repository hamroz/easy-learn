import { eq } from "drizzle-orm";
import { db } from "@/server/db/client";
import { settings } from "@/server/db/schema";
import { type FontId, normalizeEnabledFonts } from "@/content/fonts";

export async function getSettingsRow(userId: string) {
  const [row] = await db.select().from(settings).where(eq(settings.userId, userId));
  return row ?? null;
}

/** Make sure a settings row exists and return it. */
export async function ensureSettingsRow(userId: string) {
  await db.insert(settings).values({ userId }).onConflictDoNothing();
  return (await getSettingsRow(userId))!;
}

export async function getEnabledFonts(userId: string): Promise<FontId[]> {
  return normalizeEnabledFonts((await getSettingsRow(userId))?.fonts);
}

export async function setEnabledFonts(userId: string, fonts: unknown): Promise<FontId[]> {
  const list = normalizeEnabledFonts(fonts);
  await ensureSettingsRow(userId);
  await db.update(settings).set({ fonts: list }).where(eq(settings.userId, userId));
  return list;
}
