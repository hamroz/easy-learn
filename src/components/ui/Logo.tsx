import Link from "next/link";

/** Candle flame: a calm light to read by. */
export function LogoMark({ size = 26 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden>
      <path d="M16 4.5c3.4 4.2 5.5 7.4 5.5 10.6a5.5 5.5 0 0 1-11 0c0-3.2 2.1-6.4 5.5-10.6z" fill="#e8925c" />
      <path d="M16 12.5c1.4 1.8 2.2 3.1 2.2 4.4a2.2 2.2 0 0 1-4.4 0c0-1.3.8-2.6 2.2-4.4z" fill="#fff" opacity="0.75" />
      <path d="M10 27h12" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
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
