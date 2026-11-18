import { useEffect, useState, type FormEvent } from 'react';
import { ArrowRight, Building2, Check, MapPin, Search, ShieldCheck, Sparkles } from 'lucide-react';
import { Link, useLocation, useSearchParams } from 'react-router-dom';
import { api } from './api';
import type { Property } from './types';
import HouseIllustration from './HouseIllustration';
import PropertyGrid from './PropertyGrid';
import ScrollReveal from './ScrollReveal';

type PropertiesResponse = { properties: Property[] };

export default function BrowsePage() {
  const [params, setParams] = useSearchParams();
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState(params.get('q') ?? '');
  const isExplore = useLocation().pathname === '/explore';

  useEffect(() => {
    setQuery(params.get('q') ?? '');
    setLoading(true);
    setError('');
    api<PropertiesResponse>('properties/list', { params: { q: params.get('q') || undefined } })
      .then((result) => setProperties(result.properties))
      .catch((cause: unknown) => setError(cause instanceof Error ? cause.message : 'Could not load housing.'))
      .finally(() => setLoading(false));
  }, [params]);

  function search(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setParams(query.trim() ? { q: query.trim() } : {});
  }

  return (
    <main className="page">
      <ScrollReveal className="site-container hero landing-hero">
        <div className="hero-copy">
          <span className="eyebrow"><Sparkles size={14} /> MADE FOR YOUR NEXT MOVE</span>
          <h1>Find a home<br />that feels like <span>yours.</span></h1>
          <p>Discover places around FUTA, Akure. Browse local listings, compare the details, and reach out to agents directly.</p>
          <form className="hero-search" onSubmit={search}>
            <label className="hero-search-field">
              <MapPin size={19} aria-hidden="true" />
              <span><small>LOCATION OR KEYWORD</small><input aria-label="Search by location or housing" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Try South Gate, Akure…" /></span>
            </label>
            <button className="btn primary" type="submit"><Search size={17} /> Find a home</button>
          </form>
          <div className="hero-meta"><span><Check size={15} /> Browse at your pace</span><span><Check size={15} /> Contact agents directly</span></div>
          <div className="hero-actions"><Link className="text-link" to="/explore">Explore all homes <ArrowRight size={17} /></Link></div>
        </div>
        <HouseIllustration />
      </ScrollReveal>
      <ScrollReveal className="site-container value-strip" ariaLabel="How FUTA Homes helps">
        <div className="value-item"><span className="value-icon"><Search size={19} /></span><span><strong>Search simply</strong><small>Find homes that fit your needs</small></span></div>
        <div className="value-item"><span className="value-icon"><Building2 size={19} /></span><span><strong>Compare clearly</strong><small>See the details that matter</small></span></div>
        <div className="value-item"><span className="value-icon"><ShieldCheck size={19} /></span><span><strong>Connect directly</strong><small>Reach out to listing agents</small></span></div>
      </ScrollReveal>
      <ScrollReveal className="site-container section listing-section">
        <div className="section-header">
          <div><p className="section-label">{isExplore ? 'CURATED FOR YOUR SEARCH' : 'START EXPLORING'}</p><h2>{isExplore ? 'Homes around Akure' : 'Spaces to make your own'}</h2><p className="section-desc">{isExplore ? 'Take a look through available listings and find one that feels right.' : 'Browse current listings near FUTA and across Akure.'}</p></div>
          {!isExplore && <Link className="text-link" to="/explore">View all listings <ArrowRight size={17} /></Link>}
        </div>
        <PropertyGrid items={properties} loading={loading} error={error} />
      </ScrollReveal>
    </main>
  );
}
