// Placeholder emblem (scales of justice in a gold ring). Replace with the team's official seal by
// dropping the image in /public and using <img src="/logo.png"> here.
export default function Logo({ size = 44 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" role="img" aria-label="MA'At AI" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="lg-bg" cx="50%" cy="38%" r="70%"><stop offset="0" stopColor="#1e3f8a" /><stop offset="1" stopColor="#0c192e" /></radialGradient>
        <linearGradient id="lg-gold" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#f0d57a" /><stop offset="1" stopColor="#b8932a" /></linearGradient>
      </defs>
      <circle cx="32" cy="32" r="30" fill="url(#lg-bg)" stroke="url(#lg-gold)" strokeWidth="2.5" />
      <circle cx="32" cy="32" r="25" fill="none" stroke="#d2ae35" strokeOpacity=".35" strokeWidth="1" />
      <g stroke="url(#lg-gold)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" fill="none">
        <path d="M32 14v30" /><path d="M24 46h16" /><path d="M18 21h28" />
        <path d="m18 21-5 11a5 5 0 0 0 10 0l-5-11Z" /><path d="m46 21-5 11a5 5 0 0 0 10 0l-5-11Z" />
      </g>
      <circle cx="32" cy="14" r="2.4" fill="#f0d57a" />
    </svg>
  );
}
