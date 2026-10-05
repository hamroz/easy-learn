import { json, requireUser, route } from "@/server/http";

export const GET = route(async (req) => {
  const user = await requireUser(req);
  return json({ user: { id: user.id, email: user.email, name: user.name } });
});
