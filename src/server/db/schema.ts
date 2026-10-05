import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  real,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import type { Block } from "@/content/blocks";
import type { Theme } from "@/content/theme";
import type { LessonPlan, Quiz } from "@/content/outline";

const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
};

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  name: text("name"),
  createdAt: timestamps.createdAt,
});

export const sessions = pgTable("sessions", {
  /** SHA-256 of the session token; the token itself only lives in the cookie. */
  id: text("id").primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamps.createdAt,
});

export type ProviderId = "codex-cli" | "claude-cli" | "mock";

export const settings = pgTable("settings", {
  userId: uuid("user_id")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  provider: text("provider").$type<ProviderId>(),
  lessonModel: text("lesson_model"),
  chatModel: text("chat_model"),
  language: text("language"),
  updatedAt: timestamps.updatedAt,
});

export type CourseStatus = "outlining" | "outline_ready" | "active" | "failed";
export type Level = "beginner" | "intermediate" | "advanced";

export const courses = pgTable(
  "courses",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    subtitle: text("subtitle"),
    topicPrompt: text("topic_prompt").notNull(),
    language: text("language").notNull(),
    level: text("level").$type<Level>().notNull(),
    status: text("status").$type<CourseStatus>().notNull().default("outlining"),
    /** Set while an outline rewrite (reshape/steer) is running. */
    busy: text("busy").$type<"reshaping" | "steering">(),
    theme: jsonb("theme").$type<Theme>(),
    coverSvg: text("cover_svg"),
    isExample: boolean("is_example").notNull().default(false),
    isPublished: boolean("is_published").notNull().default(false),
    error: text("error"),
    ...timestamps,
  },
  (t) => [index("courses_user_idx").on(t.userId)],
);

export type LessonStatus = "planned" | "queued" | "generating" | "ready" | "failed";

export const lessons = pgTable(
  "lessons",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    courseId: uuid("course_id")
      .notNull()
      .references(() => courses.id, { onDelete: "cascade" }),
    position: integer("position").notNull(),
    title: text("title").notNull(),
    summary: text("summary").notNull(),
    status: text("status").$type<LessonStatus>().notNull().default("planned"),
    plan: jsonb("plan").$type<LessonPlan>(),
    error: text("error"),
    progress: real("progress").notNull().default(0),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    ...timestamps,
  },
  (t) => [index("lessons_course_idx").on(t.courseId, t.position)],
);

export type SectionStatus = "pending" | "generating" | "ready" | "failed";

export const sections = pgTable(
  "sections",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    lessonId: uuid("lesson_id")
      .notNull()
      .references(() => lessons.id, { onDelete: "cascade" }),
    position: integer("position").notNull(),
    heading: text("heading").notNull(),
    goal: text("goal").notNull(),
    status: text("status").$type<SectionStatus>().notNull().default("pending"),
    blocks: jsonb("blocks").$type<Block[]>().notNull().default([]),
    error: text("error"),
    ...timestamps,
  },
  (t) => [uniqueIndex("sections_lesson_pos_idx").on(t.lessonId, t.position)],
);

export type VariantKind = "simpler" | "deeper";

export const blockVariants = pgTable(
  "block_variants",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    sectionId: uuid("section_id")
      .notNull()
      .references(() => sections.id, { onDelete: "cascade" }),
    blockId: text("block_id").notNull(),
    kind: text("kind").$type<VariantKind>().notNull(),
    md: text("md").notNull(),
    createdAt: timestamps.createdAt,
  },
  (t) => [index("block_variants_section_idx").on(t.sectionId)],
);

export type Anchor = { start: number; end: number; quote: string; prefix: string; suffix: string };

export const threads = pgTable(
  "threads",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    lessonId: uuid("lesson_id")
      .notNull()
      .references(() => lessons.id, { onDelete: "cascade" }),
    sectionId: uuid("section_id")
      .notNull()
      .references(() => sections.id, { onDelete: "cascade" }),
    blockId: text("block_id").notNull(),
    variantId: uuid("variant_id").references(() => blockVariants.id, { onDelete: "cascade" }),
    anchor: jsonb("anchor").$type<Anchor>().notNull(),
    createdAt: timestamps.createdAt,
  },
  (t) => [index("threads_lesson_idx").on(t.lessonId)],
);

export const messages = pgTable(
  "messages",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    threadId: uuid("thread_id")
      .notNull()
      .references(() => threads.id, { onDelete: "cascade" }),
    role: text("role").$type<"user" | "assistant">().notNull(),
    content: text("content").notNull(),
    createdAt: timestamps.createdAt,
  },
  (t) => [index("messages_thread_idx").on(t.threadId, t.createdAt)],
);

export const quizzes = pgTable("quizzes", {
  id: uuid("id").primaryKey().defaultRandom(),
  lessonId: uuid("lesson_id")
    .notNull()
    .references(() => lessons.id, { onDelete: "cascade" }),
  content: jsonb("content").$type<Quiz>().notNull(),
  createdAt: timestamps.createdAt,
});

export type JobStatus = "queued" | "running" | "done" | "failed";

export const jobs = pgTable(
  "jobs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    type: text("type").notNull(),
    payload: jsonb("payload").$type<Record<string, unknown>>().notNull(),
    status: text("status").$type<JobStatus>().notNull().default("queued"),
    /** Lower runs first. */
    priority: integer("priority").notNull().default(100),
    attempts: integer("attempts").notNull().default(0),
    maxAttempts: integer("max_attempts").notNull().default(3),
    runAfter: timestamp("run_after", { withTimezone: true }).notNull().defaultNow(),
    lockedUntil: timestamp("locked_until", { withTimezone: true }),
    error: text("error"),
    ...timestamps,
  },
  (t) => [index("jobs_claim_idx").on(t.status, t.priority, t.runAfter)],
);

export type User = typeof users.$inferSelect;
export type Course = typeof courses.$inferSelect;
export type Lesson = typeof lessons.$inferSelect;
export type Section = typeof sections.$inferSelect;
export type Thread = typeof threads.$inferSelect;
export type Message = typeof messages.$inferSelect;
export type BlockVariant = typeof blockVariants.$inferSelect;
export type Job = typeof jobs.$inferSelect;
export type Settings = typeof settings.$inferSelect;
