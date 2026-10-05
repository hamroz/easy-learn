import { and, asc, eq } from "drizzle-orm";
import { db } from "@/server/db/client";
import { type Anchor, blockVariants, type Course, messages, quizzes, sections, threads, type VariantKind } from "@/server/db/schema";
import { INTERACTIVE_TIMEOUT_MS } from "@/server/ai";
import { aiFor } from "@/server/ai/routing";
import { quizSchema, variantSchema } from "@/content/outline";
import { sectionText } from "@/content/text";
import { buildVariantPrompt } from "@/server/ai/prompts/variant";
import { buildQuizPrompt } from "@/server/ai/prompts/quiz";
import { buildAnswerPrompt } from "@/server/ai/prompts/answer";
import { HttpError } from "@/server/http";
import { courseCtx } from "./aiConfig";
import { ownedLesson, ownedSection, ownedThread } from "./courses";

export async function getOrCreateVariant(userId: string, sectionId: string, blockId: string, kind: VariantKind) {
  const { section, lesson, course } = await ownedSection(userId, sectionId);
  const [existing] = await db
    .select()
    .from(blockVariants)
    .where(and(eq(blockVariants.sectionId, sectionId), eq(blockVariants.blockId, blockId), eq(blockVariants.kind, kind)));
  if (existing) return existing;

  const block = section.blocks.find((b) => b.id === blockId);
  if (!block || block.type !== "paragraph") throw new HttpError(400, "Only paragraphs can be rewritten");
  const ai = await aiFor(userId, "rewrite");
  const { md } = await ai.json(variantSchema, {
    task: "variant",
    ...buildVariantPrompt({
      course: courseCtx(course),
      lessonTitle: lesson.title,
      paragraph: block.md,
      context: sectionText(section.heading, section.blocks),
      kind,
    }),
    timeoutMs: INTERACTIVE_TIMEOUT_MS,
    meta: { kind },
  });
  const [row] = await db.insert(blockVariants).values({ sectionId, blockId, kind, md }).returning();
  return row;
}

export async function createQuiz(userId: string, lessonId: string) {
  const { lesson, course } = await ownedLesson(userId, lessonId);
  const secs = await db.select().from(sections).where(eq(sections.lessonId, lessonId)).orderBy(asc(sections.position));
  const text = secs.map((s) => sectionText(s.heading, s.blocks)).join("\n\n");
  if (!text.trim()) throw new HttpError(409, "The lesson is not written yet");
  const ai = await aiFor(userId, "quiz");
  const content = await ai.json(quizSchema, {
    task: "quiz",
    ...buildQuizPrompt({ course: courseCtx(course), lessonTitle: lesson.title, lessonText: text }),
    timeoutMs: 3 * 60_000,
  });
  const [row] = await db.insert(quizzes).values({ lessonId, content }).returning();
  return row;
}

export async function createThread(
  userId: string,
  input: { lessonId: string; sectionId: string; blockId: string; variantId?: string | null; anchor: Anchor },
) {
  const { section } = await ownedSection(userId, input.sectionId);
  if (section.lessonId !== input.lessonId) throw new HttpError(400, "Section does not belong to the lesson");
  if (!section.blocks.some((b) => b.id === input.blockId)) throw new HttpError(400, "Unknown block");
  const [row] = await db
    .insert(threads)
    .values({ userId, lessonId: input.lessonId, sectionId: input.sectionId, blockId: input.blockId, variantId: input.variantId ?? null, anchor: input.anchor })
    .returning();
  return row;
}

export async function deleteThread(userId: string, threadId: string) {
  await ownedThread(userId, threadId);
  await db.delete(threads).where(eq(threads.id, threadId));
}

/** Context needed to answer a question in a thread. */
async function threadContext(userId: string, threadId: string) {
  const thread = await ownedThread(userId, threadId);
  const { section, lesson, course } = await ownedSection(userId, thread.sectionId);
  const history = await db.select().from(messages).where(eq(messages.threadId, threadId)).orderBy(asc(messages.createdAt));
  return { thread, section, lesson, course, history };
}

export type AnswerEvents = { onDelta: (t: string) => void };

/**
 * Persist the user's question, stream the answer, persist the answer. Partial answers are kept
 * if the client disconnects mid-stream.
 */
export async function answerInThread(userId: string, threadId: string, content: string, signal: AbortSignal, ev: AnswerEvents) {
  const { thread, section, lesson, course, history } = await threadContext(userId, threadId);
  await db.insert(messages).values({ threadId, role: "user", content });

  const quote = thread.anchor.quote;
  const ai = await aiFor(userId, "answer");
  let streamed = "";
  try {
    const text = await ai.complete({
      task: "answer",
      ...buildAnswerPrompt({
        course: courseCtx(course as Course),
        lessonTitle: lesson.title,
        sectionText: sectionText(section.heading, section.blocks),
        quote,
        history: history.map((m) => ({ role: m.role, content: m.content })),
        question: content,
      }),
      timeoutMs: INTERACTIVE_TIMEOUT_MS,
      signal,
      meta: { quote },
      onDelta: (t) => {
        streamed += t;
        ev.onDelta(t);
      },
    });
    const [row] = await db.insert(messages).values({ threadId, role: "assistant", content: text.trim() }).returning();
    return row;
  } catch (e) {
    if (streamed.trim()) await db.insert(messages).values({ threadId, role: "assistant", content: streamed.trim() });
    throw e;
  }
}

