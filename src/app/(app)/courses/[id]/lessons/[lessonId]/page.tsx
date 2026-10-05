import { and, eq } from "drizzle-orm";
import { notFound, redirect } from "next/navigation";
import { db } from "@/server/db/client";
import { courses } from "@/server/db/schema";
import { requirePageUser } from "@/server/auth/current";
import { HttpError } from "@/server/http";
import { lessonView, ownedLesson } from "@/server/services/courses";
import { openLesson } from "@/server/services/generation";
import { getEnabledFonts } from "@/server/services/settings";
import { Reader } from "@/components/reader/Reader";

export default async function LessonRoute({ params }: { params: Promise<{ id: string; lessonId: string }> }) {
  const user = await requirePageUser();
  const { id, lessonId } = await params;
  const owned = await ownedLesson(user.id, lessonId).catch((e) => {
    if (e instanceof HttpError && e.status === 404) notFound();
    throw e;
  });
  if (owned.course.id !== id) redirect(`/courses/${owned.course.id}/lessons/${lessonId}`);
  // Opening a lesson from the outline counts as starting the course.
  if (owned.course.status === "outline_ready")
    await db.update(courses).set({ status: "active" }).where(and(eq(courses.id, id), eq(courses.status, "outline_ready")));
  await openLesson(lessonId);
  const view = await lessonView(user.id, lessonId);
  return <Reader key={lessonId} initial={JSON.parse(JSON.stringify(view))} fonts={await getEnabledFonts(user.id)} />;
}

export async function generateMetadata({ params }: { params: Promise<{ lessonId: string }> }) {
  const user = await requirePageUser();
  const { lessonId } = await params;
  const owned = await ownedLesson(user.id, lessonId).catch(() => null);
  return { title: owned ? owned.lesson.title : "Lesson" };
}
