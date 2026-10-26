import type { ReactNode } from 'react';
import { useSeo } from '../lib/seo.ts';
import { PageShell } from '../components/layout/PageShell.tsx';

/** Gabarit commun des pages d'information et légales. */
export function InfoPage({ title, description, eyebrow, children }: { title: string; description: string; eyebrow?: string; children: ReactNode }) {
  useSeo({ title, description });
  return (
    <PageShell >
      <article className="container-x pb-24 pt-32 sm:pt-40">
        {eyebrow && <p className="eyebrow mb-4 text-white/50">{eyebrow}</p>}
        <h1 className="display max-w-4xl text-5xl sm:text-6xl lg:text-7xl">{title}</h1>
        <div className="prose-studios mt-12 max-w-3xl">{children}</div>
      </article>
    </PageShell>
  );
}

/** Champ à compléter par la marque avant la mise en ligne (visible pour ne pas être oublié). */
export function Todo({ children }: { children: ReactNode }) {
  return <mark className="rounded bg-white/10 px-1.5 py-0.5 font-mono text-[0.85em] text-paper">[À compléter : {children}]</mark>;
}
