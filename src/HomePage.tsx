import { useEffect, useState, type FormEvent } from 'react';
import {
  ArrowDown, ArrowRight, ArrowUpRight, Check, House, MapPin, Search, Sparkles,
} from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import { api } from './api';
import type { Property } from './types';
import PropertyGrid from './PropertyGrid';
import ScrollReveal from './ScrollReveal';

type PropertiesResponse = { properties: Property[] };

function HomeScene() {
  return (
    <div className="home-scene" role="img" aria-label="Illustration of a welcoming home in FUTA">
      <div className="home-scene-orbit orbit-a" />
      <div className="home-scene-orbit orbit-b" />
      <span className="home-scene-sparkle sparkle-a"><Sparkles size={18} /></span>
      <span className="home-scene-sparkle sparkle-b"><Sparkles size={14} /></span>
      <div className="home-scene-copy">
        <p>YOUR NEXT CHAPTER</p>
        <h2>A place.<br />A possibility.<br /><span>A fresh start.</span></h2>
      </div>
      <svg className="home-scene-house" viewBox="0 0 420 300" aria-hidden="true">
        <ellipse cx="211" cy="271" rx="151" ry="17" fill="#d99461" opacity=".22" />
        <path d="M92 142 210 52l118 90v118H92V142Z" fill="#fffdfb" stroke="#ad633f" strokeWidth="7" strokeLinejoin="round" />
        <path d="m67 145 143-112 143 112-19 24L210 62 86 169l-19-24Z" fill="#ed792f" stroke="#a95025" strokeWidth="7" strokeLinejoin="round" />
        <path d="M177 260v-70c0-19 15-34 34-34s34 15 34 34v70" fill="#f3c49f" stroke="#ab5b36" strokeWidth="6" />
        <circle cx="229" cy="222" r="4" fill="#915037" />
        <rect x="112" y="169" width="46" height="46" rx="10" fill="#ffe9d6" stroke="#bf754d" strokeWidth="5" />
        <path d="M135 171v42m-21-21h42" stroke="#bf754d" strokeWidth="4" strokeLinecap="round" />
        <rect x="263" y="169" width="46" height="46" rx="10" fill="#ffe9d6" stroke="#bf754d" strokeWidth="5" />
        <path d="M286 171v42m-21-21h42" stroke="#bf754d" strokeWidth="4" strokeLinecap="round" />
        <path d="M77 261h268" stroke="#b65a28" strokeWidth="7" strokeLinecap="round" />
        <path d="M98 260v-29m0 14c-16-3-20-15-20-24 13 2 21 9 20 24Zm226 15v-29m0 14c16-3 20-15 20-24-13 2-21 9-20 24Z" fill="#f3a267" stroke="#ce6425" strokeWidth="4" strokeLinejoin="round" />
      </svg>
      <div className="home-scene-note"><span className="home-scene-pin"><MapPin size={21} /></span><span><strong>Find your place in FUTA</strong><small>Discover. Connect. Belong.</small></span></div>
      <div className="home-scene-bottom"><span><strong>Find your perfect stay</strong><small>Explore accommodation near FUTA</small></span><span className="home-scene-bottom-icon"><MapPin size={20} /></span></div>
    </div>
  );
}

export default function HomePage() {
  const [params, setParams] = useSearchParams();
  const [query, setQuery] = useState(params.get('q') ?? '');
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

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
    document.getElementById('home-listings')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  return (
    <main className="home-page">
      <section className="home-hero site-container">
        <div className="home-hero-copy">
          <span className="home-eyebrow"><Sparkles size={14} fill="currentColor" /> LIVING MADE EASY</span>
          <h1>Your Home<br />Near <span>FUTA.</span></h1>
          <p>Discover comfortable homes, self-contained apartments and verified housing around FUTA, Akure.</p>
          <div className="home-hero-actions">
            <a className="btn primary" href="#home-search">Explore housing <ArrowRight size={17} /></a>
            <Link className="btn agent-cta" to="/auth-loginfutahomes?/agent/register">
              <House size={17} aria-hidden="true" />
              <span>Become an agent</span>
              <ArrowUpRight size={16} aria-hidden="true" />
            </Link>
          </div>
          <div className="home-benefits" aria-label="FUTA Homes benefits">
            <span><Check size={14} /> Nearby housing</span>
            <span><Check size={14} /> Viewing requests</span>
            <span><Check size={14} /> Convenience</span>
          </div>
          <a className="home-scroll-link" href="#home-search"><span>Scroll to discover</span><ArrowDown size={15} /></a>
        </div>
        <ScrollReveal className="home-scene-reveal" ariaLabel="Your next chapter">
          <HomeScene />
        </ScrollReveal>
      </section>

      <ScrollReveal className="home-search-section site-container" ariaLabel="Find your next home">
        <div className="home-section-heading">
          <p className="home-section-kicker">FUTA HOMES</p>
          <h2 id="home-search">Find your next home</h2>
          <p>Explore approved accommodation around FUTA</p>
        </div>
        <form className="home-search-card" onSubmit={search}>
          <label className="home-search-input">
            <Search size={19} aria-hidden="true" />
            <input aria-label="Search housing, locations or agents" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search housing, locations or agent names…" />
          </label>
          <button type="submit" className="btn primary"><Search size={17} /><span>Search homes</span></button>
        </form>
        <div className="home-search-hints"><span>Popular nearby</span><button type="button" onClick={() => { setQuery('South Gate'); setParams({ q: 'South Gate' }); }}>South Gate</button><button type="button" onClick={() => { setQuery('North Gate'); setParams({ q: 'North Gate' }); }}>North Gate</button><button type="button" onClick={() => { setQuery('Akure'); setParams({ q: 'Akure' }); }}>Akure</button></div>
      </ScrollReveal>

      <ScrollReveal className="home-listing-section site-container" ariaLabel="Available homes">
        <div className="home-listing-heading" id="home-listings">
          <div><p className="home-section-kicker">A GOOD PLACE TO START</p><h2>{params.get('q') ? `Homes near “${params.get('q')}”` : 'Places to feel at home'}</h2><p>Thoughtful spaces, shared by local agents.</p></div>
          <Link className="home-all-link" to="/explore">Explore all homes <ArrowRight size={16} /></Link>
        </div>
        <PropertyGrid items={properties} loading={loading} error={error} />
      </ScrollReveal>
    </main>
  );
}
