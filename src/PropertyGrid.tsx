import { Building2 } from 'lucide-react';
import type { Property } from './types';
import PropertyCard from './PropertyCard';

export default function PropertyGrid({ items, loading, error }: { items: Property[]; loading: boolean; error: string }) {
  if (loading) return <div className="loading" role="status">Finding available homes…</div>;
  if (error) return <div className="alert error" role="alert">{error}</div>;
  if (!items.length) return <div className="empty"><Building2 /><h3>No homes found</h3><p>Try a different search or check back soon for new listings.</p></div>;
  return <div className="ui-grid properties-grid">{items.map((property) => <PropertyCard key={property.id} property={property} />)}</div>;
}
