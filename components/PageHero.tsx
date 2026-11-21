export default function PageHero({ eyebrow, title, children }: { eyebrow?: string; title: string; children?: React.ReactNode }) {
  return (
    <section className="relative overflow-hidden bg-ink text-white">
      <div aria-hidden className="pointer-events-none absolute -right-20 -top-28 h-64 w-64 rounded-full bg-gold/20 blur-3xl" />
      <div className="wrap relative py-8 sm:py-10">
        {eyebrow && <p className="eyebrow !text-gold-light">{eyebrow}</p>}
        <h1 className="mt-2 font-display text-3xl font-bold leading-tight sm:text-4xl">{title}</h1>
        {children && <div className="mt-3 max-w-xl text-[15px] leading-relaxed text-neutral-300">{children}</div>}
      </div>
    </section>
  );
}
