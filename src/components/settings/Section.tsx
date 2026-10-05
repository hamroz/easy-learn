export function Section({ id, title, intro, children }: { id: string; title: string; intro?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section id={id} className="scroll-mt-24">
      <h2 className="font-[family-name:var(--font-newsreader)] text-[26px] tracking-tight text-text">{title}</h2>
      {intro && <p className="mt-1.5 max-w-[60ch] text-[14.5px] leading-relaxed text-muted">{intro}</p>}
      <div className="mt-6">{children}</div>
    </section>
  );
}
