import { notFound } from "next/navigation";
import { requirePageUser } from "@/server/auth/current";
import { HttpError } from "@/server/http";
import { courseView } from "@/server/services/courses";
import { CoursePage } from "@/components/course/CoursePage";

export default async function CourseRoute({ params }: { params: Promise<{ id: string }> }) {
  const user = await requirePageUser();
  const { id } = await params;
  const view = await courseView(user.id, id).catch((e) => {
    if (e instanceof HttpError && e.status === 404) notFound();
    throw e;
  });
  return <CoursePage view={JSON.parse(JSON.stringify(view))} />;
}
