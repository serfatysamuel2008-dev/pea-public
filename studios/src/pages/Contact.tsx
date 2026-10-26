import { Mail } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { BRAND } from '../data/shop.ts';
import { InfoPage } from './InfoPage.tsx';

/** Formulaire de contact : ouvre la messagerie de l'utilisateur (aucun serveur d'envoi pour l'instant). */
export default function Contact() {
  const [form, setForm] = useState({ name: '', email: '', subject: 'Question sur un modèle', message: '' });
  const [error, setError] = useState<string | null>(null);
  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.message.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(form.email)) {
      setError('Indique ton nom, un e-mail valide et ton message.');
      return;
    }
    setError(null);
    const body = `${form.message}\n\n— ${form.name} (${form.email})`;
    window.location.href = `mailto:${BRAND.contactEmail}?subject=${encodeURIComponent(`[${BRAND.name}] ${form.subject}`)}&body=${encodeURIComponent(body)}`;
  };
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => setForm({ ...form, [k]: e.target.value });

  return (
    <InfoPage title="Parlons-en." eyebrow="Contact" description="Contacter STUDIOS : une question sur un modèle, une commande ou un retour.">
      <p className="text-lg text-white/70">
        Une question sur un modèle, une commande ou un retour ? Écris-nous à{' '}
        <a href={`mailto:${BRAND.contactEmail}`} className="font-bold underline">
          {BRAND.contactEmail}
        </a>{' '}
        ou utilise le formulaire ci-dessous.
      </p>
      <form onSubmit={submit} noValidate className="mt-10 grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium">Nom</span>
          <input className="field" value={form.name} onChange={set('name')} autoComplete="name" />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium">E-mail</span>
          <input className="field" type="email" value={form.email} onChange={set('email')} autoComplete="email" />
        </label>
        <label className="block sm:col-span-2">
          <span className="mb-1.5 block text-sm font-medium">Sujet</span>
          <select className="field" value={form.subject} onChange={set('subject')}>
            <option>Question sur un modèle</option>
            <option>Ma commande</option>
            <option>Retour ou échange</option>
            <option>Autre</option>
          </select>
        </label>
        <label className="block sm:col-span-2">
          <span className="mb-1.5 block text-sm font-medium">Message</span>
          <textarea className="field min-h-40" value={form.message} onChange={set('message')} />
        </label>
        {error && (
          <p role="alert" className="text-sm text-signal sm:col-span-2">
            {error}
          </p>
        )}
        <div className="sm:col-span-2">
          <button type="submit" className="btn-light">
            <Mail size={16} /> Envoyer
          </button>
          <p className="mt-3 text-sm text-white/50">Le message s’ouvre dans ta messagerie, prêt à être envoyé.</p>
        </div>
      </form>
    </InfoPage>
  );
}
