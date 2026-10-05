import { notFound, redirect } from "next/navigation";
import { isSinglePage } from "@/content/formats";
import { requirePageUser } from "@/server/auth/current";
import { HttpError } from "@/server/http";
import { courseView } from "@/server/services/courses";
import { getEnabledFonts } from "@/server/services/settings";
import { CoursePage } from "@/components/course/CoursePage";

export default async function CourseRoute({ params }: { params: Promise<{ id: string }> }) {
  const user = await requirePageUser();
  const { id } = await params;
  const view = await courseView(user.id, id).catch((e) => {
    if (e instanceof HttpError && e.status === 404) notFound();
    throw e;
  });
  // Single-page formats live in the reader; this URL only shows progress until the page exists.
  if (isSinglePage(view.course.format) && view.lessons[0]) redirect(`/courses/${id}/lessons/${view.lessons[0].id}`);
  return <CoursePage view={JSON.parse(JSON.stringify(view))} fonts={await getEnabledFonts(user.id)} />;
}
