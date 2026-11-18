import { useEffect, useState } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { Check, CircleAlert, X } from 'lucide-react';
import { api, embeddedRoute, getSessionContext, setCsrf, type SessionContext } from './api';
import type { Account } from './types';
import { notifyToast, type ToastKind } from './toast';
import Footer from './Footer';
import Header from './Header';
import MobileViewPage from './MobileViewPage';
import AuthPage from './AuthPage';
import AdminDashboardPage from './AdminDashboardPage';
import AgentDashboardPage from './AgentDashboardPage';
import HomePage from './HomePage';
import BrowsePage from './BrowsePage';
import ProfilePage from './ProfilePage';
import PropertyPage from './PropertyPage';
import SavedPropertiesPage from './SavedPropertiesPage';
import { FavoritesProvider } from './FavoritesContext';

type SessionResponse = { user: Account | null; csrf: string };
type ToastMessage = { message: string; kind: ToastKind; id: number };

export default function App() {
  const location = useLocation();
  const [user, setUser] = useState<Account | null>(null);
  const [sessionReady, setSessionReady] = useState(false);
  const [loadedContext, setLoadedContext] = useState<SessionContext | null>(null);
  const [toast, setToast] = useState<ToastMessage | null>(null);
  const sessionContext = getSessionContext(location.pathname, location.search);
  const contextReady = sessionReady && loadedContext === sessionContext;
  const embeddedPath = location.pathname === '/auth-loginfutahomes'
    ? embeddedRoute(location.search)
    : '';
  const isAdminRoute = location.pathname.startsWith('/admin') || location.pathname === '/auth-loginfutahomes';
  const isAgentWorkspace = location.pathname === '/agent/profile' || location.pathname.startsWith('/agent/dashboard');
  const isAuthRoute = ['/login', '/user/login', '/agent/login', '/register', '/user/register', '/agent/register']
    .includes(location.pathname) || (location.pathname === '/auth-loginfutahomes' && /\/(user|agent|admin)\/(login|register)$/.test(embeddedPath));

  useEffect(() => {
    function showToast(event: Event) {
      const detail = (event as CustomEvent<{ message: string; kind: ToastKind }>).detail;
      if (!detail?.message) return;
      setToast({ ...detail, id: Date.now() });
    }
    window.addEventListener('futa-homes-toast', showToast);
    return () => window.removeEventListener('futa-homes-toast', showToast);
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), toast.kind === 'error' ? 6000 : 3500);
    return () => window.clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    let active = true;
    setSessionReady(false);
    setLoadedContext(null);
    setUser(null);
    api<SessionResponse>('session', { sessionContext })
      .then((session) => {
        if (!active) return;
        setCsrf(session.csrf, sessionContext);
        setUser(session.user);
      })
      .catch(() => {
        if (!active) return;
        setCsrf('', sessionContext);
        setUser(null);
      })
      .finally(() => {
        if (active) {
          setLoadedContext(sessionContext);
          setSessionReady(true);
        }
      });
    return () => { active = false; };
  }, [sessionContext]);

  async function signOut() {
    try {
      await api('logout', { method: 'POST' });
      setCsrf('', sessionContext);
      setUser(null);
      notifyToast('You have signed out.');
    } catch (cause) {
      notifyToast(cause instanceof Error ? cause.message : 'Could not sign out.', 'error');
    }
  }

  return (
    <FavoritesProvider user={user}>
    <>
      {toast && <div key={toast.id} className={`app-toast ${toast.kind}`} role={toast.kind === 'error' ? 'alert' : 'status'}>
        {toast.kind === 'error' ? <CircleAlert size={19} /> : <Check size={19} />}
        <span>{toast.message}</span>
        <button type="button" onClick={() => setToast(null)} aria-label="Dismiss notification"><X size={17} /></button>
      </div>}
      {!isAdminRoute && !isAgentWorkspace && !isAuthRoute && <Header user={user} onSignOut={signOut} />}
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/explore" element={<BrowsePage />} />
        <Route path="/properties/:id" element={<PropertyPage user={user} />} />
        <Route path="/login" element={<AuthPage onAuthenticated={setUser} />} />
        <Route path="/user/login" element={<AuthPage onAuthenticated={setUser} />} />
        <Route path="/agent/login" element={<AuthPage onAuthenticated={setUser} />} />
        <Route path="/register" element={<AuthPage onAuthenticated={setUser} />} />
        <Route path="/user/register" element={<AuthPage onAuthenticated={setUser} />} />
        <Route path="/agent/register" element={<AuthPage onAuthenticated={setUser} />} />
        <Route path="/user/profile" element={<ProfilePage user={user} sessionReady={contextReady} />} />
        <Route path="/user/saved" element={<SavedPropertiesPage user={user} sessionReady={contextReady} />} />
        <Route path="/agent/*" element={<AgentDashboardPage user={user} sessionReady={contextReady} onSignOut={signOut} onAccountUpdate={setUser} />} />
        <Route path="/auth-loginfutahomes" element={
          /\/(user|agent|admin)\/(login|register)$/.test(embeddedPath)
            ? <AuthPage onAuthenticated={setUser} />
            : !contextReady
              ? <main className="loading page" role="status">Checking account access…</main>
              : sessionContext === 'admin'
                ? !user
                  ? <AuthPage onAuthenticated={setUser} />
                  : embeddedPath === '/admin/profileacc'
                    ? <ProfilePage user={user} sessionReady={contextReady} />
                    : <AdminDashboardPage user={user} sessionReady={contextReady} onSignOut={signOut} />
                : <Navigate to={sessionContext === 'agent' ? '/agent/profile?section=overview' : '/user/profile?futahomes/account'} replace />
        } />
        <Route path="/admin/*" element={
          <Navigate
            to={`/auth-loginfutahomes?${location.pathname === '/admin/profile' ? '/admin/profileacc' : location.pathname}`}
            replace
          />
        } />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      {!isAdminRoute && !isAgentWorkspace && !isAuthRoute && <Footer />}
      {!isAdminRoute && !isAuthRoute && <MobileViewPage user={user} onSignOut={signOut} />}
    </>
    </FavoritesProvider>
  );
}
