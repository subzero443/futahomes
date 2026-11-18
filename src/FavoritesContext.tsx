import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { api } from './api';
import type { Account, Property } from './types';

type FavoritesContextValue = {
  properties: Property[];
  loading: boolean;
  error: string;
  canSave: boolean;
  isSaved: (propertyId: number) => boolean;
  toggle: (property: Property) => Promise<boolean>;
};

const FavoritesContext = createContext<FavoritesContextValue | null>(null);

export function FavoritesProvider({ user, children }: { user: Account | null; children: ReactNode }) {
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    if (user?.role !== 'user') {
      setProperties([]);
      setLoading(false);
      setError('');
      return () => { active = false; };
    }

    setLoading(true);
    setProperties([]);
    setError('');
    api<{ properties: Property[] }>('favorites/list', { sessionContext: 'user' })
      .then((result) => {
        if (active) setProperties(result.properties);
      })
      .catch((cause: unknown) => {
        if (active) setError(cause instanceof Error ? cause.message : 'Could not load saved properties.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => { active = false; };
  }, [user?.id, user?.role]);

  const toggle = useCallback(async (property: Property) => {
    if (user?.role !== 'user') throw new Error('Sign in as a home seeker to save properties.');
    const result = await api<{ saved: boolean }>('favorites/toggle', {
      data: { property_id: property.id },
      sessionContext: 'user',
    });
    setProperties((current) => result.saved
      ? current.some((item) => item.id === property.id) ? current : [property, ...current]
      : current.filter((item) => item.id !== property.id));
    return result.saved;
  }, [user?.role]);

  const isSaved = useCallback((propertyId: number) => properties.some((property) => property.id === propertyId), [properties]);
  const canSave = user?.role === 'user';
  const value = useMemo(() => ({ properties, loading, error, canSave, isSaved, toggle }), [properties, loading, error, canSave, isSaved, toggle]);

  return <FavoritesContext.Provider value={value}>{children}</FavoritesContext.Provider>;
}

export function useFavorites() {
  const context = useContext(FavoritesContext);
  if (!context) throw new Error('useFavorites must be used within FavoritesProvider.');
  return context;
}
