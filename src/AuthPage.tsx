import { useState, type FormEvent } from 'react';
import { ArrowRight, House, Sparkles } from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { api, embeddedRoute, getSessionContext, prepareSessionContext, setCsrf, type SessionContext } from './api';
import type { Account } from './types';
import { notifyToast } from './toast';

function profileUrl(user: Account) {
  if (user.role === 'admin') return '/auth-loginfutahomes?/admin';
  return user.role === 'agent' ? '/agent/profile?section=overview' : `/${user.role}/profile?futahomes/account`;
}

export default function AuthPage({ onAuthenticated }: { onAuthenticated: (user: Account) => void }) {
  const location = useLocation();
  const navigate = useNavigate();
  const route = location.pathname === '/auth-loginfutahomes'
    ? embeddedRoute(location.search)
    : location.pathname;
  const isRegister = route.endsWith('/register');
  const isAdminLogin = route.startsWith('/admin');
  const sessionContext = getSessionContext(location.pathname, location.search);
  const registrationRole: SessionContext = route.startsWith('/agent/') ? 'agent' : 'user';
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setBusy(true);
    const form = new FormData(event.currentTarget);
    const data: Record<string, string> = Object.fromEntries(
      Array.from(form.entries()).map(([key, value]) => [key, String(value)]),
    );
    try {
      const selectedContext: SessionContext = isRegister && data.role === 'agent' ? 'agent' : sessionContext;
      await prepareSessionContext(selectedContext);
      const result = await api<{ user: Account; csrf: string }>(isRegister ? 'register' : 'login', {
        data,
        sessionContext: selectedContext,
      });
      setCsrf(result.csrf, selectedContext);
      onAuthenticated(result.user);
      notifyToast(isRegister ? 'Your account was created.' : 'You are signed in.');
      navigate(profileUrl(result.user));
    } catch (cause: unknown) {
      const message = cause instanceof Error ? cause.message : 'Could not sign you in.';
      setError(message);
      notifyToast(message, 'error');
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="auth-wrap page auth-page">
      <div className="auth-house-backdrop" aria-hidden="true">
        <img src="/demo/london-house-auth.jpg" alt="" />
      </div>
      <form className="auth-card card" onSubmit={submit}>
        <div className="auth-welcome">
          <span className="auth-welcome-icon">{isRegister ? <House size={21} /> : <Sparkles size={20} />}</span>
          <span className="auth-welcome-copy">
            <span className="auth-welcome-label">{isRegister ? 'JOIN FUTA HOMES' : 'WELCOME BACK'}</span>
            <span className="auth-welcome-caption">{isRegister ? 'Your next home starts here' : 'Good to see you again'}</span>
          </span>
        </div>
        <h1>{isRegister ? 'Create your account' : 'Sign in'}</h1>
        <p className="muted">{isRegister ? 'Create an account to find a home or list a property.' : 'Sign in to continue to FUTA Homes.'}</p>
        {error && <div className="alert error" role="alert">{error}</div>}
        {isRegister && <label>Your name<input name="name" autoComplete="name" required minLength={2} /></label>}
        <label>Email address<input name="email" type="email" autoComplete="email" required /></label>
        {isRegister && <label>Phone number (optional)<input name="phone" type="tel" autoComplete="tel" /></label>}
        {isRegister && <label>Account type<select name="role" defaultValue={registrationRole}><option value="user">I’m looking for a home</option><option value="agent">I’m listing properties</option></select></label>}
        <label>Password<input name="password" type="password" autoComplete={isRegister ? 'new-password' : 'current-password'} required minLength={8} maxLength={72} /></label>
        <button className="btn primary full" type="submit" disabled={busy}>{busy ? 'Please wait…' : isRegister ? 'Create account' : 'Sign in'} <ArrowRight size={17} /></button>
        {!isAdminLogin && <p className="auth-options">
          {isRegister ? 'Already have an account?' : 'New to FUTA Homes?'}{' '}
            <Link className="text-link" to={`/auth-loginfutahomes?/${registrationRole}/${isRegister ? 'login' : 'register'}`}>{isRegister ? 'Sign in' : 'Create an account'}</Link>
        </p>}
      </form>
    </main>
  );
}
