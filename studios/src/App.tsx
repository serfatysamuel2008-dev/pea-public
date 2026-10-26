import { AnimatePresence } from 'framer-motion';
import { lazy, Suspense, useEffect, type ReactNode } from 'react';
import { BrowserRouter, HashRouter, Route, Routes, useLocation } from 'react-router-dom';
import { CartDrawer } from './components/cart/CartDrawer.tsx';
import { Intro } from './components/home/Intro.tsx';
import { Footer } from './components/layout/Footer.tsx';
import { Header } from './components/layout/Header.tsx';
import Home from './pages/Home.tsx';
import { CartProvider } from './store/cart.tsx';
import { FavoritesProvider } from './store/favorites.tsx';
import { ToastProvider } from './store/toast.tsx';

// Pages secondaires chargées à la demande.
const Collection = lazy(() => import('./pages/Collection.tsx'));
const ProductPage = lazy(() => import('./pages/ProductPage.tsx'));
const Checkout = lazy(() => import('./pages/Checkout.tsx'));
const Confirmation = lazy(() => import('./pages/Confirmation.tsx'));
const Favorites = lazy(() => import('./pages/Favorites.tsx'));
const Faq = lazy(() => import('./pages/Faq.tsx'));
const Contact = lazy(() => import('./pages/Contact.tsx'));
const NotFound = lazy(() => import('./pages/NotFound.tsx'));
const Shipping = lazy(() => import('./pages/Legal.tsx').then((m) => ({ default: m.Shipping })));
const Mentions = lazy(() => import('./pages/Legal.tsx').then((m) => ({ default: m.Mentions })));
const Privacy = lazy(() => import('./pages/Legal.tsx').then((m) => ({ default: m.Privacy })));
const Terms = lazy(() => import('./pages/Legal.tsx').then((m) => ({ default: m.Terms })));

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
  }, [pathname]);
  return null;
}

function Loading() {
  return <div className="min-h-screen bg-ink" aria-busy="true" />;
}

function AnimatedRoutes() {
  const location = useLocation();
  return (
    <AnimatePresence mode="wait">
      <Suspense key={location.pathname} fallback={<Loading />}>
        <Routes location={location}>
          <Route path="/" element={<Home />} />
          <Route path="/collection" element={<Collection />} />
          <Route path="/produit/:slug" element={<ProductPage />} />
          <Route path="/commande" element={<Checkout />} />
          <Route path="/commande/confirmation" element={<Confirmation />} />
          <Route path="/favoris" element={<Favorites />} />
          <Route path="/faq" element={<Faq />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/livraison-retours" element={<Shipping />} />
          <Route path="/mentions-legales" element={<Mentions />} />
          <Route path="/confidentialite" element={<Privacy />} />
          <Route path="/cgv" element={<Terms />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
    </AnimatePresence>
  );
}

/** Routeur à base d'ancre pour les hébergements sans réécriture d'URL (aperçu statique). */
function Router({ children }: { children: ReactNode }) {
  if (import.meta.env.VITE_HASH_ROUTER === '1') return <HashRouter>{children}</HashRouter>;
  return <BrowserRouter basename={import.meta.env.BASE_URL.replace(/\/$/, '') || '/'}>{children}</BrowserRouter>;
}

export default function App() {
  return (
    <Router>
      <ToastProvider>
        <FavoritesProvider>
          <CartProvider>
            <div className="grain">
              <Intro />
              <ScrollToTop />
              <Header />
              <AnimatedRoutes />
              <Footer />
              <CartDrawer />
            </div>
          </CartProvider>
        </FavoritesProvider>
      </ToastProvider>
    </Router>
  );
}
