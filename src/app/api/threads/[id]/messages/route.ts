import { z } from "zod";
import { ProviderError } from "@/server/ai";
import { readBody, requireUser, route } from "@/server/http";
import { ownedThread } from "@/server/services/courses";
import { answerInThread } from "@/server/services/interactive";

const body = z.object({ content: z.string().trim().min(1).max(4000) });

const sse = (event: string, data: unknown) => `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;

/** Stream the assistant's answer as Server-Sent Events: delta* then done | error. */
export const POST = route<{ params: Promise<{ id: string }> }>(async (req, { params }) => {
  const user = await requireUser(req);
  const { id } = await params;
  await ownedThread(user.id, id);
  const { content } = await readBody(req, body);
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: string, data: unknown) => {
        try {
          controller.enqueue(encoder.encode(sse(event, data)));
        } catch {
          /* client went away */
        }
      };
      try {
        const message = await answerInThread(user.id, id, content, req.signal, { onDelta: (text) => send("delta", { text }) });
        send("done", { message: { id: message.id, role: message.role, content: message.content } });
      } catch (e) {
        const err = e instanceof ProviderError ? { kind: e.kind, error: e.message } : { kind: "failed", error: "Could not get an answer" };
        if (!(e instanceof ProviderError)) console.error("[threads] answer failed", e);
        send("error", err);
      } finally {
        try {
          controller.close();
        } catch {}
      }
    },
  });

  return new Response(stream, {
    headers: { "content-type": "text/event-stream; charset=utf-8", "cache-control": "no-cache, no-transform", "x-accel-buffering": "no" },
  });
});
