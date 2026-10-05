import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/server/db/client";
import { settings } from "@/server/db/schema";
import { aiSettingsSchema } from "@/content/ai";
import { FONT_IDS } from "@/content/fonts";
import { json, readBody, requireUser, route } from "@/server/http";
import { saveAiSettings } from "@/server/services/aiSettings";
import { ensureSettingsRow, setEnabledFonts } from "@/server/services/settings";
import { settingsView } from "@/server/services/settingsView";

export const GET = route(async (req) => {
  const user = await requireUser(req);
  return json(await settingsView(user.id));
});

const body = z.object({
  ai: aiSettingsSchema.optional(),
  fonts: z.array(z.enum(FONT_IDS)).min(1).optional(),
  language: z
    .string()
    .trim()
    .max(20)
    .nullish()
    .transform((v) => v || null),
});

export const PUT = route(async (req) => {
  const user = await requireUser(req);
  const input = await readBody(req, body);
  if (input.ai) await saveAiSettings(user.id, input.ai);
  if (input.fonts) await setEnabledFonts(user.id, input.fonts);
  if (input.language !== undefined) {
    await ensureSettingsRow(user.id);
    await db.update(settings).set({ language: input.language }).where(eq(settings.userId, user.id));
  }
  return json(await settingsView(user.id));
});
