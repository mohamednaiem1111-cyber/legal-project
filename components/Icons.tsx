// Small inline icon set (stroke icons, inherit currentColor). No external dependency.
type P = { size?: number };
const base = (size: number) => ({ width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.7, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, 'aria-hidden': true });

export const IconGrid = ({ size = 18 }: P) => <svg {...base(size)}><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" /></svg>;
export const IconUpload = ({ size = 18 }: P) => <svg {...base(size)}><path d="M12 16V4" /><path d="m7 9 5-5 5 5" /><path d="M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3" /></svg>;
export const IconHome = ({ size = 18 }: P) => <svg {...base(size)}><path d="m3 11 9-8 9 8" /><path d="M5 10v10h14V10" /></svg>;
export const IconAlert = ({ size = 18 }: P) => <svg {...base(size)}><path d="M12 3 2.5 20h19L12 3Z" /><path d="M12 10v4" /><path d="M12 17.2v.01" /></svg>;
export const IconHistory = ({ size = 18 }: P) => <svg {...base(size)}><circle cx="6" cy="6" r="2.2" /><circle cx="6" cy="18" r="2.2" /><circle cx="18" cy="12" r="2.2" /><path d="M6 8.2v7.6" /><path d="M8.2 7c4 0 6 2 7.8 4" /></svg>;
export const IconScale = ({ size = 18 }: P) => <svg {...base(size)}><path d="M12 3v18" /><path d="M7 21h10" /><path d="M5 7h14" /><path d="m5 7-3 7a3 3 0 0 0 6 0L5 7Z" /><path d="m19 7-3 7a3 3 0 0 0 6 0l-3-7Z" /></svg>;
export const IconShield = ({ size = 18 }: P) => <svg {...base(size)}><path d="M12 3 4 6v6c0 4.5 3.2 8 8 9 4.8-1 8-4.5 8-9V6l-8-3Z" /><path d="m9 12 2 2 4-4" /></svg>;
export const IconPlus = ({ size = 18 }: P) => <svg {...base(size)}><path d="M12 5v14" /><path d="M5 12h14" /></svg>;
export const IconDoc = ({ size = 18 }: P) => <svg {...base(size)}><path d="M7 3h7l5 5v13H7V3Z" /><path d="M14 3v5h5" /><path d="M10 13h6" /><path d="M10 17h6" /></svg>;
export const IconScan = ({ size = 18 }: P) => <svg {...base(size)}><path d="M4 8V5a1 1 0 0 1 1-1h3" /><path d="M16 4h3a1 1 0 0 1 1 1v3" /><path d="M20 16v3a1 1 0 0 1-1 1h-3" /><path d="M8 20H5a1 1 0 0 1-1-1v-3" /><path d="M4 12h16" /></svg>;
export const IconRadar = ({ size = 18 }: P) => <svg {...base(size)}><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="4.5" /><path d="M12 12 18 6" /></svg>;
export const IconChart = ({ size = 18 }: P) => <svg {...base(size)}><path d="M4 20V4" /><path d="M4 20h16" /><path d="m7 15 4-4 3 3 5-6" /></svg>;
export const IconList = ({ size = 18 }: P) => <svg {...base(size)}><path d="M9 6h11" /><path d="M9 12h11" /><path d="M9 18h11" /><path d="M4 6h.01" /><path d="M4 12h.01" /><path d="M4 18h.01" /></svg>;
export const IconLogout = ({ size = 18 }: P) => <svg {...base(size)}><path d="M9 4H5a1 1 0 0 0-1 1v14a1 1 0 0 0 1 1h4" /><path d="m16 8 4 4-4 4" /><path d="M20 12H9" /></svg>;
