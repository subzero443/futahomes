import { useEffect, useState } from 'react';
import { ArrowRight, Bookmark, Compass, ExternalLink, Heart, MessageCircle, Trash2 } from 'lucide-react';
import { Link, Navigate } from 'react-router-dom';
import type { Account, Property } from './types';
import { notifyToast } from './toast';
import { useFavorites } from './FavoritesContext';
import PropertyCard from './PropertyCard';

function whatsappUrl(property: Property) {
  const digits = (property.agent_phone || '').replace(/\D/g, '');
  const phone = digits.startsWith('00') ? digits.slice(2) : digits.startsWith('0') ? `234${digits.slice(1)}` : digits;
  if (!phone) return '';
  const message = `Hello, I'm interested in ${property.title} (${property.location}).`;
  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
}

export default function SavedPropertiesPage({ user, sessionReady }: { user: Account | null; sessionReady: boolean }) {
  const { properties, loading, error, toggle } = useFavorites();
  const [busyProperty, setBusyProperty] = useState<number | null>(null);

  useEffect(() => {
    if (error) notifyToast(error, 'error');
  }, [error]);

  if (!sessionReady) return <main className="loading page" role="status">Loading your saved homes…</main>;
  if (!user) return <Navigate to="/auth-loginfutahomes?/user/login" replace state={{ from: '/user/saved' }} />;
  if (user.role !== 'user') return <Navigate to={user.role === 'agent' ? '/agent/profile?section=overview' : '/auth-loginfutahomes?/admin'} replace />;

  async function remove(property: Property) {
    setBusyProperty(property.id);
    try {
      await toggle(property);
      notifyToast('Property removed from your saved homes.');
    } catch (cause) {
      notifyToast(cause instanceof Error ? cause.message : 'Could not update saved properties.', 'error');
    } finally {
      setBusyProperty(null);
    }
  }

  return (
    <main className="site-container page section saved-page">
      <div className="saved-page-heading">
        <div>
          <span className="saved-page-kicker"><Heart size={15} /> YOUR SHORTLIST</span>
          <h1 className="page-title">Saved properties</h1>
          <p className="section-desc">Keep your favourite homes close and contact agents when you’re ready.</p>
        </div>
        <Link className="btn outline saved-explore-link" to="/explore"><Compass size={17} /> Explore homes <ArrowRight size={16} /></Link>
      </div>
      {loading ? <div className="loading" role="status">Loading your saved homes…</div>
        : error ? <div className="alert error saved-load-error" role="alert">{error}</div>
        : properties.length ? <div className="ui-grid properties-grid saved-properties-grid">
          {properties.map((property) => (
            <article className="saved-property-item" key={property.id}>
              <PropertyCard property={property} showSave={false} />
              <div className="saved-property-actions">
                {whatsappUrl(property)
                  ? <a className="saved-whatsapp-link" href={whatsappUrl(property)} target="_blank" rel="noreferrer"><MessageCircle size={17} /> Chat with agent <ExternalLink size={14} /></a>
                  : <span className="saved-no-contact">Agent contact unavailable</span>}
                <button className="saved-remove-button" type="button" disabled={busyProperty === property.id} onClick={() => void remove(property)}><Trash2 size={16} /> {busyProperty === property.id ? 'Removing…' : 'Remove'}</button>
              </div>
            </article>
          ))}
        </div>
        : <section className="saved-empty card">
          <span><Bookmark size={27} /></span>
          <h2>No saved homes yet</h2>
          <p>When you find a place you like, tap its save button and it will appear here.</p>
          <Link className="btn primary" to="/explore">Explore properties <ArrowRight size={17} /></Link>
        </section>}
    </main>
  );
}
