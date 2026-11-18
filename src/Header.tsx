import { useState } from 'react';
import { House, Menu, X } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import type { Account } from './types';
import BrandMark from './BrandMark';
import ProfilePhoto from './ProfilePhoto';
import ThemeToggle from './ThemeToggle';

export default function Header({ user, onSignOut }: { user: Account | null; onSignOut: () => void }) {
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const accountUrl = user?.role === 'admin'
    ? '/auth-loginfutahomes?/admin'
    : user?.role === 'agent'
      ? '/agent/profile?section=overview'
      : '/user/profile?futahomes/account';

  function closeMenu() {
    setMenuOpen(false);
  }

  return (
    <header className="header">
      <div className="header-inner">
        <BrandMark />
        <nav className="desktop-links" aria-label="Main navigation">
          <Link to="/" aria-current={location.pathname === '/' ? 'page' : undefined} className={location.pathname === '/' ? 'nav-link active' : 'nav-link'}>Home</Link>
          <Link to="/explore" aria-current={location.pathname === '/explore' ? 'page' : undefined} className={location.pathname === '/explore' ? 'nav-link active' : 'nav-link'}>Explore housing</Link>
        </nav>
        <div className="header-end">
          <ThemeToggle />
          {user ? (
            <>
              <Link className="header-account desktop-account" to={accountUrl}>
                <ProfilePhoto name={user.name} photo={user.avatar} />
                <span className="muted hidden sm:inline">Hi, {user.name}</span>
              </Link>
              <button className="btn outline btn-sm" onClick={onSignOut}>Sign out</button>
            </>
          ) : (
            <>
              <Link className="btn outline btn-sm desktop-auth" to="/auth-loginfutahomes?/user/login">Sign in</Link>
              <Link className="btn primary btn-sm desktop-start" to="/auth-loginfutahomes?/user/register">Get started</Link>
            </>
          )}
        </div>
        <div className="mobile-header-actions">
          <ThemeToggle />
          <Link className="mobile-header-account" to={user ? accountUrl : '/login'} aria-label={user ? 'Open your account' : 'Sign in'}>
            {user ? <ProfilePhoto name={user.name} photo={user.avatar} /> : <House size={19} />}
          </Link>
          <button className="mobile-header-menu" type="button" aria-label={menuOpen ? 'Close menu' : 'Open menu'} aria-expanded={menuOpen} onClick={() => setMenuOpen((open) => !open)}>
            {menuOpen ? <X size={21} /> : <Menu size={21} />}
          </button>
        </div>
      </div>
      {menuOpen && <nav className="site-mobile-menu" aria-label="Mobile menu">
        <Link to="/" onClick={closeMenu}>Home</Link>
        <Link to="/explore" onClick={closeMenu}>Explore housing</Link>
        {user ? <>
          {(user.role === 'agent' || user.role === 'admin') && <Link to={accountUrl} onClick={closeMenu}>Dashboard</Link>}
          {user.role === 'agent' && <Link to="/agent/profile?section=bookings" onClick={closeMenu}>Bookings</Link>}
          <Link to={accountUrl} onClick={closeMenu}>Profile</Link>
          <button type="button" onClick={() => { closeMenu(); onSignOut(); }}>Sign out</button>
        </> : <>
          <Link to="/auth-loginfutahomes?/user/login" onClick={closeMenu}>Sign in</Link>
          <Link to="/auth-loginfutahomes?/user/register" onClick={closeMenu}>Create an account</Link>
        </>}
        <div className="mobile-theme-item flex items-center justify-between px-5 py-3 border-t border-orange-100">
          <span className="text-sm font-semibold">Appearance</span>
          <ThemeToggle showLabel />
        </div>
      </nav>}
    </header>
  );
}
