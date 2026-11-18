import { useEffect, useState } from 'react';
import { Bookmark, CalendarDays, Compass, LayoutDashboard, LogIn, LogOut, UserPlus, UserRound } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import type { Account } from './types';

export default function MobileViewPage({ user, onSignOut }: { user: Account | null; onSignOut: () => void }) {
  const location = useLocation();
  const [isHidden, setIsHidden] = useState(false);
  const profilePath = user?.role === 'agent'
    ? '/agent/profile?section=profile'
    : user?.role === 'admin'
      ? '/auth-loginfutahomes?/admin'
      : user
        ? '/user/profile?futahomes/account'
        : '/auth-loginfutahomes?/user/login';

  useEffect(() => {
    let previousY = window.scrollY;
    let frame = 0;

    function updateVisibility() {
      const currentY = window.scrollY;
      const bottomGap = document.documentElement.scrollHeight - window.innerHeight - currentY;
      if (currentY <= 24) {
        setIsHidden(false);
      } else if (bottomGap <= 24 || currentY - previousY > 8) {
        setIsHidden(true);
      } else if (previousY - currentY > 8) {
        setIsHidden(false);
      }
      previousY = currentY;
    }

    function onScroll() {
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(updateVisibility);
    }

    function onFocus(event: FocusEvent) {
      const target = event.target;
      if (target instanceof HTMLElement
        && !target.closest('.mobile-view-nav')
        && (target.matches('input, textarea, select') || (target instanceof HTMLButtonElement && target.type === 'submit'))) {
        setIsHidden(true);
      }
    }

    window.addEventListener('scroll', onScroll, { passive: true });
    document.addEventListener('focusin', onFocus);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener('scroll', onScroll);
      document.removeEventListener('focusin', onFocus);
    };
  }, []);

  useEffect(() => {
    setIsHidden(false);
  }, [location.pathname, location.search]);

  const navClass = `mobile-view-nav${user?.role === 'agent' ? ' agent-mobile-view-nav' : ''}${user?.role === 'user' ? ' user-mobile-view-nav' : ''}${isHidden ? ' is-hidden' : ''}`;

  if (user?.role === 'agent') {
    return (
      <nav className={navClass} aria-label="Mobile navigation">
        <Link to="/explore" className={location.pathname === '/explore' ? 'mobile-nav-link active' : 'mobile-nav-link'}>
          <Compass size={20} /><span>Explore</span>
        </Link>
        <Link to="/agent/profile?section=overview" className={location.pathname === '/agent/profile' && (new URLSearchParams(location.search).get('section') || 'overview') === 'overview' ? 'mobile-nav-link active' : 'mobile-nav-link'}>
          <LayoutDashboard size={20} /><span>Dashboard</span>
        </Link>
        <Link to="/agent/profile?section=bookings" className={new URLSearchParams(location.search).get('section') === 'bookings' ? 'mobile-nav-link active' : 'mobile-nav-link'}>
          <CalendarDays size={20} /><span>Bookings</span>
        </Link>
        <Link to={profilePath} className={new URLSearchParams(location.search).get('section') === 'profile' ? 'mobile-nav-link active' : 'mobile-nav-link'}>
          <UserRound size={20} /><span>Profile</span>
        </Link>
      </nav>
    );
  }

  const accountActive = location.pathname === '/user/profile';
  return (
    <nav className={navClass} aria-label="Mobile navigation">
      <Link to="/explore" aria-current={location.pathname === '/explore' ? 'page' : undefined} className={location.pathname === '/explore' ? 'mobile-nav-link active' : 'mobile-nav-link'}>
        <Compass size={19} /><span>Explore</span>
      </Link>
      {user?.role === 'user'
        ? <>
            <Link to="/user/saved" aria-current={location.pathname === '/user/saved' ? 'page' : undefined} className={location.pathname === '/user/saved' ? 'mobile-nav-link active' : 'mobile-nav-link'}>
              <Bookmark size={19} /><span>Saved</span>
            </Link>
            <Link to={profilePath} aria-current={accountActive ? 'page' : undefined} className={accountActive ? 'mobile-nav-link active' : 'mobile-nav-link'}>
              <UserRound size={19} /><span>Account</span>
            </Link>
            <button type="button" className="mobile-nav-link" onClick={onSignOut}>
              <LogOut size={19} /><span>Sign out</span>
            </button>
          </>
        : user
          ? <>
              <Link to={profilePath} className={location.pathname.includes('/profile') ? 'mobile-nav-link active' : 'mobile-nav-link'}>
                <UserRound size={19} /><span>Account</span>
              </Link>
              <button type="button" className="mobile-nav-link" onClick={onSignOut}>
                <LogOut size={19} /><span>Sign out</span>
              </button>
            </>
          : <>
            <Link to="/auth-loginfutahomes?/user/login" className="mobile-nav-link">
              <LogIn size={19} /><span>Sign in</span>
            </Link>
            <Link to="/auth-loginfutahomes?/user/register" className="mobile-nav-link">
              <UserPlus size={19} /><span>Join</span>
            </Link>
          </>}
    </nav>
  );
}
