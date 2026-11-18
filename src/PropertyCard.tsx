import { ArrowRight, BedDouble, Bookmark, Building2, MapPin, ShieldCheck } from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { mediaUrl, naira, prettyDate } from './api';
import { useFavorites } from './FavoritesContext';
import { notifyToast } from './toast';
import type { Property } from './types';

export default function PropertyCard({ property, showSave = true }: { property: Property; showSave?: boolean }) {
  const navigate = useNavigate();
  const { canSave, isSaved, loading, toggle } = useFavorites();
  const [saving, setSaving] = useState(false);
  const saved = isSaved(property.id);

  async function toggleSaved() {
    if (!canSave) {
      navigate('/auth-loginfutahomes?/user/login', { state: { from: '/explore' } });
      return;
    }
    setSaving(true);
    try {
      const isNowSaved = await toggle(property);
      notifyToast(isNowSaved ? 'Housing saved to your homes.' : 'Housing removed from your saved homes.');
    } catch (cause) {
      notifyToast(cause instanceof Error ? cause.message : 'Could not save this housing.', 'error');
    } finally {
      setSaving(false);
    }
  }

  return (
    <article className="property-card">
      <div className="card-image">
        <Link to={`/properties/${property.id}`} aria-label={`View ${property.title}`}>
          <img src={mediaUrl(property.image)} alt={property.title} />
        </Link>
        <span className="tag">{property.listing_type === 'sale' ? 'For sale' : 'For rent'}</span>
        {showSave && <button className={`property-save-button${saved ? ' is-saved' : ''}`} type="button" aria-label={saved ? `Remove ${property.title} from saved homes` : `Save ${property.title}`} aria-pressed={saved} disabled={loading || saving} onClick={() => void toggleSaved()}>
          <Bookmark size={18} fill={saved ? 'currentColor' : 'none'} /><span>{saving ? 'Saving…' : saved ? 'Saved' : 'Save'}</span>
        </button>}
      </div>
      <div className="card-content">
        <div className="card-badges">
          {property.verified_agent && <span className="tag green"><ShieldCheck size={14} /> Verified agent</span>}
          {property.effective_plan !== 'free' && <span className="tag">{property.effective_plan}</span>}
        </div>
        <h3><Link to={`/properties/${property.id}`}>{property.title}</Link></h3>
        <p className="line muted"><MapPin size={16} />{property.location}</p>
        <div className="detail-mini muted">
          <span className="line"><BedDouble size={16} /> {property.bedrooms} bed</span>
          <span className="line"><Building2 size={16} /> {property.property_type}</span>
        </div>
        <div className="cost">
          <span className="price">{naira(property.price)}</span>
          {property.listing_type === 'rent' && <span className="muted"> / {property.price_period}</span>}
        </div>
        <p className="agent-line">Listed by {property.business_name || property.agent_name} · {prettyDate(property.created_at)}</p>
        <Link className="text-link" to={`/properties/${property.id}`}>View housing <ArrowRight size={16} /></Link>
      </div>
    </article>
  );
}
