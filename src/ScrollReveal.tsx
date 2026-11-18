import { useEffect, useRef, type ReactNode } from 'react';

export default function ScrollReveal({ children, className, ariaLabel }: { children: ReactNode; className: string; ariaLabel?: string }) {
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;

    if (!('IntersectionObserver' in window)) {
      section.classList.add('is-visible');
      return;
    }

    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      }
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });

    observer.observe(section);
    return () => observer.disconnect();
  }, []);

  return <section ref={sectionRef} aria-label={ariaLabel} className={`scroll-reveal ${className}`}>{children}</section>;
}
