import { BRAND } from '../../data/shop.ts';

/** Logo STUDIOS : capitales espacées, sobres. */
export function Wordmark({ className = '' }: { className?: string }) {
  return <span className={`font-display font-semibold uppercase tracking-[0.32em] ${className}`}>{BRAND.name}</span>;
}
