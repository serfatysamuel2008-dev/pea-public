import { PRODUCTS } from '../data/products.ts';
import { BRAND } from '../data/shop.ts';
import { useSeo } from '../lib/seo.ts';
import { PageShell } from '../components/layout/PageShell.tsx';
import { Campaign } from '../components/home/Campaign.tsx';
import { FindYourFrame } from '../components/home/FindYourFrame.tsx';
import { Lineup } from '../components/home/Lineup.tsx';
import { Manifesto } from '../components/home/Manifesto.tsx';
import { Marquee } from '../components/home/Marquee.tsx';
import { PriceSection } from '../components/home/PriceSection.tsx';
import { Stage } from '../components/home/Stage.tsx';
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
    description: `${BRAND.name} : lunettes de soleil rondes en ${PRODUCTS.length} coloris, toutes à 29,90 €. Écaille, cristal, dégradé, translucide… Trouve ta paire.`,
    jsonLd: JSON_LD,
  });
  return (
    <PageShell>
      <Stage />
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
