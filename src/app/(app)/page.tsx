import { requirePageUser } from "@/server/auth/current";
import { listCourses } from "@/server/services/courses";
import { getEnabledFonts } from "@/server/services/settings";
import { AppHeader } from "@/components/ui/AppHeader";
import { AutoRefresh } from "@/components/ui/AutoRefresh";
import { NewCourseForm } from "@/components/home/NewCourseForm";
import { CourseCard } from "@/components/home/CourseCard";
import { Library } from "@/components/home/Library";
import { AddExamplesButton } from "@/components/examples/AddExamplesButton";

export default async function HomePage() {
  const user = await requirePageUser();
  const [courses, fonts] = await Promise.all([listCourses(user.id), getEnabledFonts(user.id)]);
  const mine = courses.filter((c) => !c.isExample);
  const examples = courses.filter((c) => c.isExample);
  const pending = courses.some((c) => c.status === "outlining" || c.busy);
  const firstName = user.name?.split(" ")[0];

  return (
    <div className="min-h-screen">
      <AutoRefresh enabled={pending} />
      <AppHeader />
      <main className="mx-auto w-full max-w-6xl px-5 pb-24 sm:px-8">
        <section className="mx-auto max-w-3xl pt-14 sm:pt-24">
          <p className="animate-fade-up text-center font-ui text-[13px] uppercase tracking-[0.18em] text-muted">
            {firstName ? `Hello, ${firstName}` : "Hello"}
          </p>
          <h1 className="mt-4 animate-fade-up text-center font-[family-name:var(--font-newsreader)] text-[40px] leading-[1.08] tracking-tight sm:text-[56px]">
            What do you want to learn?
          </h1>
          <div className="mt-10 animate-fade-up [animation-delay:80ms]">
            <NewCourseForm />
          </div>
        </section>

        {mine.length > 0 && <Library items={mine} fonts={fonts} />}

        {examples.length > 0 && (
          <section className="mt-20">
            <h2 className="mb-2 font-ui text-[13px] font-medium uppercase tracking-[0.14em] text-muted">Examples</h2>
            <p className="mb-6 text-[15px] text-muted">A few courses to show what Easy Learn can do.</p>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {examples.map((c) => (
                <CourseCard key={c.id} course={c} fonts={fonts} />
              ))}
            </div>
          </section>
        )}

        {courses.length === 0 && (
          <div className="mt-20 flex flex-col items-center gap-4 text-center">
            <p className="text-[15px] text-muted">Your courses will appear here. Want to look around first?</p>
            <AddExamplesButton />
          </div>
        )}
      </main>
    </div>
  );
}
