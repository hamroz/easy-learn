import { z } from "zod";
import { DEFAULT_THEME, themeSchema } from "./theme";

/** Schemas for the structured AI responses other than section blocks. */

export const outlineLessonSchema = z.object({
  title: z.string().min(1).max(160),
  summary: z.string().min(1).max(600),
});

export const outlineSchema = z.object({
  title: z.string().min(1).max(160),
  subtitle: z.string().max(300).optional(),
  /** BCP 47-ish code of the language the course is written in, e.g. "en", "ru". */
  language: z.string().min(2).max(20),
  theme: themeSchema.default(DEFAULT_THEME),
  lessons: z.array(outlineLessonSchema).min(3).max(12),
});
export type Outline = z.infer<typeof outlineSchema>;

/** Reshape / steer responses: the new list of not-yet-generated lessons. */
export const lessonsListSchema = z.object({ lessons: z.array(outlineLessonSchema).min(1).max(12) });

export const lessonPlanSchema = z.object({
  sections: z
    .array(
      z.object({
        heading: z.string().min(1).max(160),
        goal: z.string().min(1),
        keyPoints: z.array(z.string()).default([]),
        interactive: z.string().optional(),
      }),
    )
    .min(3)
    .max(8),
});
export type LessonPlan = z.infer<typeof lessonPlanSchema>;

export const quizSchema = z.object({
  questions: z
    .array(
      z
        .object({
          q: z.string().min(1),
          options: z.array(z.string().min(1)).min(2).max(5),
          answer: z.number().int().min(0),
          explanation: z.string().min(1),
        })
        .refine((q) => q.answer < q.options.length, { message: "answer must index into options" }),
    )
    .min(3)
    .max(8),
});
export type Quiz = z.infer<typeof quizSchema>;

export const coverSchema = z.object({ svg: z.string().min(20) });
export const widgetCodeSchema = z.object({ html: z.string().min(20) });
export const variantSchema = z.object({ md: z.string().min(1) });
