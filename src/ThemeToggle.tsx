import { useEffect, useState } from 'react';
import { Moon, Sun } from 'lucide-react';

export function getInitialTheme(): 'light' | 'dark' {
  if (typeof window === 'undefined') return 'light';
  try {
    const saved = localStorage.getItem('futa-theme');
    if (saved === 'dark' || saved === 'light') return saved;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  } catch {
    return 'light';
  }
}

export function applyTheme(theme: 'light' | 'dark') {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  if (theme === 'dark') {
    root.classList.add('dark');
  } else {
    root.classList.remove('dark');
  }
  try {
    localStorage.setItem('futa-theme', theme);
  } catch {}
}

export default function ThemeToggle({ className = '', showLabel = false }: { className?: string; showLabel?: boolean }) {
  const [theme, setTheme] = useState<'light' | 'dark'>(getInitialTheme);

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  function toggle() {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  }

  const isDark = theme === 'dark';

  return (
    <button
      type="button"
      onClick={toggle}
      className={`theme-toggle-btn inline-flex items-center gap-2 rounded-xl px-2.5 py-2 text-xs font-bold transition-all duration-200 cursor-pointer ${
        isDark
          ? 'bg-amber-400/15 text-amber-300 hover:bg-amber-400/25 border border-amber-400/30'
          : 'bg-orange-50 text-slate-700 hover:bg-orange-100 hover:text-futa border border-orange-200'
      } ${className}`}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode (high contrast)'}
      title={isDark ? 'Switch to light mode' : 'Switch to dark mode (easier on eyes & low-vision reading)'}
    >
      {isDark ? <Sun size={17} className="text-amber-300 shrink-0" /> : <Moon size={17} className="text-slate-600 shrink-0" />}
      {showLabel && <span>{isDark ? 'Light mode' : 'Dark mode'}</span>}
    </button>
  );
}
