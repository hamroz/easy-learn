import { json, requireUser, route } from "@/server/http";
import { createQuiz } from "@/server/services/interactive";

export const POST = route<{ params: Promise<{ id: string }> }>(async (req, { params }) => {
  const user = await requireUser(req);
  const quiz = await createQuiz(user.id, (await params).id);
  return json({ quiz: { id: quiz.id, content: quiz.content } });
});
