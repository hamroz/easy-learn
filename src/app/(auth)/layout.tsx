import { LogoMark } from "@/components/ui/Logo";
import { SchemeToggle } from "@/components/ui/SchemeToggle";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="relative grid min-h-screen place-items-center px-5 py-16">
      <SchemeToggle className="absolute right-5 top-5" />
      <div className="w-full max-w-[380px] animate-fade-up">
        <div className="mb-10 flex flex-col items-center text-center">
          <LogoMark size={40} />
          <h1 className="mt-5 font-[family-name:var(--font-newsreader)] text-[34px] leading-tight tracking-tight">Easy Learn</h1>
          <p className="mt-2 text-[15px] text-muted">Learn anything, calmly.</p>
        </div>
        {children}
      </div>
    </main>
  );
}
