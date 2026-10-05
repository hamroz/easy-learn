import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/server/db/client";
import { settings } from "@/server/db/schema";
import { defaultProviderId, PROVIDER_IDS } from "@/server/ai";
import { json, readBody, requireUser, route } from "@/server/http";

export const GET = route(async (req) => {
  const user = await requireUser(req);
  const [row] = await db.select().from(settings).where(eq(settings.userId, user.id));
  return json({
    settings: {
      provider: row?.provider ?? null,
      lessonModel: row?.lessonModel ?? null,
      chatModel: row?.chatModel ?? null,
      language: row?.language ?? null,
    },
    defaultProvider: defaultProviderId(),
    providers: PROVIDER_IDS,
  });
});

const blankToNull = z
  .string()
  .trim()
  .max(80)
  .nullish()
  .transform((v) => v || null);

const body = z.object({
  provider: z.enum(["codex-cli", "claude-cli", "mock"]).nullish(),
  lessonModel: blankToNull,
  chatModel: blankToNull,
  language: blankToNull,
});

export const PUT = route(async (req) => {
  const user = await requireUser(req);
  const input = await readBody(req, body);
  const values = { provider: input.provider ?? null, lessonModel: input.lessonModel, chatModel: input.chatModel, language: input.language };
  await db.insert(settings).values({ userId: user.id, ...values }).onConflictDoUpdate({ target: settings.userId, set: values });
  return json({ ok: true });
});
