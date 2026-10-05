import { redirect } from "next/navigation";
import { hasUsers } from "@/server/auth/accounts";
import { SetupForm } from "@/components/auth/SetupForm";

export const metadata = { title: "Set up" };
export const dynamic = "force-dynamic";

export default async function SetupPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  if (await hasUsers()) redirect("/login");
  const { token } = await searchParams;
  return <SetupForm initialToken={token ?? ""} />;
}
