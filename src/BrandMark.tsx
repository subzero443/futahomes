import { Link } from 'react-router-dom';
import { House } from 'lucide-react';

export default function BrandMark({ footer = false }: { footer?: boolean }) {
  return (
    <Link className={`brand${footer ? ' footer-brand' : ''}`} to="/" aria-label="FUTA Homes home">
      <span className="brand-icon"><House /></span>
      <span className="brand-wordmark"><strong>FUTA</strong> <span>Homes</span></span>
    </Link>
  );
}
