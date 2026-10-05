import { redirect } from "next/navigation";
import { hasUsers } from "@/server/auth/accounts";
import { currentUser } from "@/server/auth/current";
import { LoginForm } from "@/components/auth/LoginForm";

export const metadata = { title: "Sign in" };
export const dynamic = "force-dynamic";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  if (await currentUser()) redirect("/");
  if (!(await hasUsers())) redirect("/setup");
  const { next } = await searchParams;
  const safeNext = next?.startsWith("/") && !next.startsWith("//") ? next : "/";
  return <LoginForm next={safeNext} />;
}
