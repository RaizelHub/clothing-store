interface PlaceholderProps {
  title: string;
  phase: string;
}

// Stand-in for routes not yet built. Swapped out page-by-page as each
// phase lands, so routing/layout never has to be retrofitted later.
export function Placeholder({ title, phase }: PlaceholderProps) {
  return (
    <section className="container-editorial flex min-h-[60vh] flex-col items-center justify-center text-center">
      <h1 className="text-3xl">{title}</h1>
      <p className="mt-3 text-sm uppercase tracking-widest text-stone-400">{phase}</p>
    </section>
  );
}
