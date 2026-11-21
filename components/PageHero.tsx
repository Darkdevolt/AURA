export default function PageHero({ eyebrow, title, children }: { eyebrow?: string; title: string; children?: React.ReactNode }) {
  return (
    <section className="relative overflow-hidden bg-ink-grad text-white">
      <div aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_80%_at_100%_0%,rgba(196,138,22,0.22),transparent_70%)]" />
      <div className="wrap relative py-10 sm:py-14">
        {eyebrow && <p className="eyebrow !text-gold-light">{eyebrow}</p>}
        <h1 className="font-brand mt-3 text-[1.7rem] leading-[1.15] sm:text-4xl">{title}</h1>
        {children && <div className="mt-4 max-w-xl text-[15px] leading-relaxed text-neutral-300">{children}</div>}
      </div>
      <div aria-hidden className="gold-rule" />
    </section>
  );
}
