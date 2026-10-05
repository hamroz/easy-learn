import { eq } from "drizzle-orm";
import { db } from "@/server/db/client";
import { settings } from "@/server/db/schema";
import { requirePageUser } from "@/server/auth/current";
import { defaultProviderId } from "@/server/ai";
import { AppHeader } from "@/components/ui/AppHeader";
import { SettingsForm } from "@/components/settings/SettingsForm";

export const metadata = { title: "Settings" };

export default async function SettingsPage() {
  const user = await requirePageUser();
  const [row] = await db.select().from(settings).where(eq(settings.userId, user.id));
  return (
    <div className="min-h-screen">
      <AppHeader />
      <main className="mx-auto w-full max-w-2xl px-5 pb-24 pt-10 sm:px-8">
        <h1 className="font-[family-name:var(--font-newsreader)] text-[40px] tracking-tight">Settings</h1>
        <p className="mt-2 text-[15px] text-muted">Signed in as {user.email}</p>
        <SettingsForm
          initial={{
            provider: row?.provider ?? null,
            lessonModel: row?.lessonModel ?? "",
            chatModel: row?.chatModel ?? "",
            language: row?.language ?? "",
          }}
          defaultProvider={defaultProviderId()}
        />
      </main>
    </div>
  );
}
