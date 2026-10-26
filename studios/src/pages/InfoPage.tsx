import type { ReactNode } from 'react';
import { useSeo } from '../lib/seo.ts';
import { PageShell } from '../components/layout/PageShell.tsx';

/** Gabarit commun des pages d'information et légales. */
export function InfoPage({ title, description, eyebrow, children }: { title: string; description: string; eyebrow?: string; children: ReactNode }) {
  useSeo({ title, description });
  return (
    <PageShell tone="light">
      <article className="container-x pb-24 pt-32 sm:pt-40">
        {eyebrow && <p className="eyebrow mb-4 text-black/50">{eyebrow}</p>}
        <h1 className="display max-w-5xl text-[15vw] sm:text-[8vw] lg:text-[6.5vw]">{title}</h1>
        <div className="prose-studios mt-12 max-w-3xl">{children}</div>
      </article>
    </PageShell>
  );
}

/** Champ à compléter par la marque avant la mise en ligne (visible pour ne pas être oublié). */
export function Todo({ children }: { children: ReactNode }) {
  return <mark className="rounded bg-volt px-1.5 py-0.5 font-mono text-[0.85em] text-ink">[À compléter : {children}]</mark>;
}
