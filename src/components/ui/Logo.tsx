import Link from "next/link";

export function LogoMark({ size = 26 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden>
      <circle cx="16" cy="16" r="14" fill="none" stroke="currentColor" strokeWidth="1.6" opacity="0.35" />
      <path d="M16 6c1.6 5.4 4.6 8.4 10 10-5.4 1.6-8.4 4.6-10 10-1.6-5.4-4.6-8.4-10-10 5.4-1.6 8.4-4.6 10-10z" fill="var(--accent)" />
    </svg>
  );
}

export function Logo() {
  return (
    <Link href="/" className="group inline-flex items-center gap-2.5 text-text">
      <LogoMark />
      <span className="font-[family-name:var(--font-newsreader)] text-[21px] tracking-tight">Easy Learn</span>
    </Link>
  );
}
