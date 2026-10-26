import { BRAND } from '../../data/shop.ts';

/** Logo STUDIOS : capitales condensées, le « O » remplacé par un verre. */
export function Wordmark({ className = '' }: { className?: string }) {
  return (
    <span className={`inline-flex items-baseline font-display uppercase leading-none tracking-[0.02em] ${className}`} aria-label={BRAND.name}>
      <span aria-hidden>STUDI</span>
      <span aria-hidden className="relative mx-[0.04em] inline-block h-[0.7em] w-[0.62em] translate-y-[0.02em] rounded-[45%_45%_50%_50%/40%_40%_60%_60%] bg-current">
        <span className="absolute inset-[0.12em] rounded-[inherit] bg-gradient-to-br from-volt via-electric to-flash" />
      </span>
      <span aria-hidden>S</span>
    </span>
  );
}
