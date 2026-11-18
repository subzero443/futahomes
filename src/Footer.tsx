import { MapPin } from 'lucide-react';
import { Link } from 'react-router-dom';
import BrandMark from './BrandMark';

export default function Footer() {
  return (
    <footer className="footer modern-footer">
      <div className="site-container">
        <div className="footer-main">
          <div className="footer-about">
            <BrandMark footer />
            <p>A simpler way to discover accommodation around FUTA and across Akure.</p>
            <span className="footer-location"><MapPin size={16} /> Akure, Ondo State, Nigeria</span>
          </div>
          <div className="footer-column"><h3>Explore</h3><Link to="/explore">Browse homes</Link><Link to="/auth-loginfutahomes?/user/login">Sign in</Link><Link to="/auth-loginfutahomes?/user/register">Create account</Link></div>
          <div className="footer-column"><h3>For housing agents</h3><Link to="/auth-loginfutahomes?/agent/login">Agent sign in</Link><Link to="/auth-loginfutahomes?/agent/register">List housing</Link></div>
        </div>
        <div className="footer-bottom"><span>© {new Date().getFullYear()} FUTA Homes</span><span>Find a place to feel at home.</span></div>
      </div>
    </footer>
  );
}
