import { json, requireUser, route } from "@/server/http";
import { issueAuthorToken, revokeAuthorToken } from "@/server/services/settingsView";

/** Create (or replace) the personal access token used by the authoring API. Shown once. */
export const POST = route(async (req) => {
  const user = await requireUser(req);
  return json({ token: await issueAuthorToken(user.id) });
});

export const DELETE = route(async (req) => {
  const user = await requireUser(req);
  await revokeAuthorToken(user.id);
  return json({ ok: true });
});
