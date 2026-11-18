import { House, MapPin, Sparkles } from 'lucide-react';

export default function HouseIllustration() {
  return (
    <div className="hero-visual" role="img" aria-label="Friendly illustration of a home in Akure">
      <div className="scene-sun" />
      <span className="scene-cloud cloud-one" />
      <span className="scene-cloud cloud-two" />
      <span className="scene-sparkle sparkle-one"><Sparkles size={19} /></span>
      <span className="scene-sparkle sparkle-two"><Sparkles size={14} /></span>
      <div className="house-illustration">
        <svg viewBox="0 0 520 440" aria-hidden="true">
          <ellipse cx="264" cy="397" rx="177" ry="22" fill="#d9a77f" opacity=".22" />
          <path d="M92 207 260 74l168 133v166H92V207Z" fill="#fffdfb" stroke="#9e552f" strokeWidth="8" strokeLinejoin="round" />
          <path d="M64 210 260 52l196 158-24 29L260 96 88 239l-24-29Z" fill="#e87536" stroke="#a94d25" strokeWidth="8" strokeLinejoin="round" />
          <path d="M213 373V259c0-27 21-48 47-48s47 21 47 48v114" fill="#f3bf98" stroke="#a94d25" strokeWidth="7" />
          <circle cx="288" cy="319" r="5" fill="#a94d25" />
          <rect x="121" y="244" width="62" height="62" rx="14" fill="#fce4d1" stroke="#bd6539" strokeWidth="6" />
          <path d="M152 247v56m-28-28h56" stroke="#bd6539" strokeWidth="5" strokeLinecap="round" />
          <rect x="337" y="244" width="62" height="62" rx="14" fill="#fce4d1" stroke="#bd6539" strokeWidth="6" />
          <path d="M368 247v56m-28-28h56" stroke="#bd6539" strokeWidth="5" strokeLinecap="round" />
          <path d="M77 373h366" stroke="#9e552f" strokeWidth="8" strokeLinecap="round" />
          <path d="M108 373v-31m0 15c-20-4-25-18-25-29 17 2 27 11 25 29Zm0-1c18-4 23-17 23-28-15 2-25 11-23 28Zm307 15v-30m0 14c-19-4-24-17-24-28 16 2 26 10 24 28Zm0-1c17-4 22-16 22-27-15 2-24 10-22 27Z" fill="#f3a267" stroke="#ce6425" strokeWidth="4" strokeLinejoin="round" />
        </svg>
      </div>
      <div className="house-bubble bubble-home"><span className="bubble-icon"><House size={18} /></span><span><small>YOUR NEXT CHAPTER</small><strong>A home of your own</strong></span></div>
      <div className="house-bubble bubble-location"><span className="bubble-avatar"><MapPin size={17} /></span><span><small>FIND YOUR PLACE</small><strong>Akure, Nigeria</strong></span></div>
      <span className="scene-orbit orbit-one" /><span className="scene-orbit orbit-two" />
    </div>
  );
}
