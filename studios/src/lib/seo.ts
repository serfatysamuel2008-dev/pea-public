import { useEffect } from 'react';
import { BRAND } from '../data/shop.ts';

type Seo = { title?: string; description: string; image?: string; noindex?: boolean; jsonLd?: object };

function setMeta(attr: 'name' | 'property', key: string, content: string) {
  let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, key);
    document.head.append(el);
  }
  el.content = content;
}

/** Titre, description, Open Graph et données structurées de la page courante. */
export function useSeo({ title, description, image, noindex, jsonLd }: Seo) {
  useEffect(() => {
    const full = title ? `${title} — ${BRAND.name}` : `${BRAND.name} — Lunettes de soleil à 29,90 €`;
    document.title = full;
    setMeta('name', 'description', description);
    setMeta('property', 'og:title', full);
    setMeta('property', 'og:description', description);
    if (image) setMeta('property', 'og:image', new URL(image, window.location.href).href);
    setMeta('name', 'robots', noindex ? 'noindex' : 'index,follow');
    let script = document.getElementById('jsonld') as HTMLScriptElement | null;
    if (jsonLd) {
      if (!script) {
        script = document.createElement('script');
        script.id = 'jsonld';
        script.type = 'application/ld+json';
        document.head.append(script);
      }
      script.textContent = JSON.stringify(jsonLd);
    } else script?.remove();
  }, [title, description, image, noindex, jsonLd]);
}
