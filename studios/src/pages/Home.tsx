import { PRODUCTS } from '../data/products.ts';
import { BRAND } from '../data/shop.ts';
import { useSeo } from '../lib/seo.ts';
import { PageShell } from '../components/layout/PageShell.tsx';
import { Campaign } from '../components/home/Campaign.tsx';
import { FindYourFrame } from '../components/home/FindYourFrame.tsx';
import { Hero } from '../components/home/Hero.tsx';
import { Lineup } from '../components/home/Lineup.tsx';
import { Manifesto } from '../components/home/Manifesto.tsx';
import { Marquee } from '../components/home/Marquee.tsx';
import { PriceSection } from '../components/home/PriceSection.tsx';
import { TrustStrip } from '../components/home/TrustStrip.tsx';

const JSON_LD = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: BRAND.name,
  url: BRAND.siteUrl,
  sameAs: [BRAND.instagram, BRAND.tiktok],
};

export default function Home() {
  useSeo({
    description: `${BRAND.name} : ${PRODUCTS.length} modèles de lunettes de soleil au design affirmé, tous à 29,90 €. Aviateur, rond, carré, masque, écaille, cristal… Trouve ta monture.`,
    jsonLd: JSON_LD,
  });
  return (
    <PageShell>
      <Hero />
      <Marquee tone="volt" tilt={-2} />
      <Manifesto />
      <Lineup />
      <FindYourFrame />
      <Marquee tone="ink" reverse />
      <Campaign />
      <PriceSection />
      <TrustStrip />
    </PageShell>
  );
}
