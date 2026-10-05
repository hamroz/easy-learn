import { requirePageUser } from "@/server/auth/current";
import { settingsView } from "@/server/services/settingsView";
import { AppHeader } from "@/components/ui/AppHeader";
import { SettingsApp } from "@/components/settings/SettingsApp";

export const metadata = { title: "Settings" };

export default async function SettingsPage() {
  const user = await requirePageUser();
  const view = await settingsView(user.id);
  return (
    <div className="min-h-screen">
      <AppHeader />
      <SettingsApp initial={JSON.parse(JSON.stringify(view))} email={user.email} />
    </div>
  );
}
