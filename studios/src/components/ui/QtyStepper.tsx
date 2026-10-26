import { Minus, Plus } from 'lucide-react';
import { MAX_QTY_PER_LINE } from '../../data/shop.ts';

type Props = { value: number; onChange: (n: number) => void; label: string; size?: 'sm' | 'md' };

export function QtyStepper({ value, onChange, label, size = 'md' }: Props) {
  const h = size === 'sm' ? 'h-9' : 'h-12';
  const w = size === 'sm' ? 'w-9' : 'w-12';
  return (
    <div className={`inline-flex ${h} items-center rounded-full ring-1 ring-black/15`} role="group" aria-label={label}>
      <button type="button" className={`${w} ${h} grid place-items-center rounded-full transition hover:bg-black/5 disabled:opacity-30`} onClick={() => onChange(value - 1)} disabled={value <= 1} aria-label="Retirer une paire">
        <Minus size={16} />
      </button>
      <output className="min-w-8 text-center font-mono text-sm tabular-nums" aria-live="polite">{value}</output>
      <button type="button" className={`${w} ${h} grid place-items-center rounded-full transition hover:bg-black/5 disabled:opacity-30`} onClick={() => onChange(value + 1)} disabled={value >= MAX_QTY_PER_LINE} aria-label="Ajouter une paire">
        <Plus size={16} />
      </button>
    </div>
  );
}
