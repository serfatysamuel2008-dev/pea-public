import { Minus, Plus } from 'lucide-react';
import { MAX_QTY_PER_LINE } from '../../data/shop.ts';

type Props = { value: number; onChange: (n: number) => void; label: string; size?: 'sm' | 'md' };

export function QtyStepper({ value, onChange, label, size = 'md' }: Props) {
  const h = size === 'sm' ? 'h-9' : 'h-[50px]';
  const w = size === 'sm' ? 'w-9' : 'w-11';
  return (
    <div className={`inline-flex ${h} items-center rounded-full ring-1 ring-white/15`} role="group" aria-label={label}>
      <button type="button" className={`${w} ${h} grid place-items-center rounded-full transition hover:bg-white/10 disabled:opacity-30`} onClick={() => onChange(value - 1)} disabled={value <= 1} aria-label="Retirer une paire">
        <Minus size={15} />
      </button>
      <output className="min-w-7 text-center font-mono text-sm tabular-nums" aria-live="polite">{value}</output>
      <button type="button" className={`${w} ${h} grid place-items-center rounded-full transition hover:bg-white/10 disabled:opacity-30`} onClick={() => onChange(value + 1)} disabled={value >= MAX_QTY_PER_LINE} aria-label="Ajouter une paire">
        <Plus size={15} />
      </button>
    </div>
  );
}
