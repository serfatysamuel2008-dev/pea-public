const ITEMS = ['STUDIOS', 'SEE THINGS DIFFERENTLY', '29,90 €', 'STUDIOS', 'YOUR WORLD. YOUR FRAME.', 'NOT MADE TO BLEND IN', '29,90 €'];

/** Bandeau défilant en continu (s'arrête si l'utilisateur réduit les animations). */
export function Marquee({ tone = 'volt', reverse = false, tilt = 0 }: { tone?: 'volt' | 'ink' | 'flash'; reverse?: boolean; tilt?: number }) {
  const styles = {
    volt: 'bg-volt text-ink',
    ink: 'bg-ink text-paper',
    flash: 'bg-flash text-ink',
  }[tone];
  const row = (
    <ul className="flex shrink-0 items-center" aria-hidden>
      {ITEMS.map((t, i) => (
        <li key={i} className="display flex items-center whitespace-nowrap px-6 text-[clamp(28px,5vw,64px)]">
          {t}
          <span className="ml-12 inline-block h-3 w-3 rotate-45 bg-current" />
        </li>
      ))}
    </ul>
  );
  return (
    <div className="relative z-10 overflow-x-clip">
    <div className={`overflow-hidden py-4 ${styles}`} style={{ transform: tilt ? `rotate(${tilt}deg) scale(1.05)` : undefined }}>
      <p className="sr-only">STUDIOS — See things differently — 29,90 € — Your world. Your frame.</p>
      <div className="marquee" data-reverse={reverse}>
        {row}
        {row}
      </div>
    </div>
    </div>
  );
}
