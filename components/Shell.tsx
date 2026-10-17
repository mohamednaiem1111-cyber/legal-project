'use client';
// Sidebar + top bar + login gate. "/" is public (landing); every other page needs a logged-in user.
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabaseClient';
import AuthForm from './AuthForm';
import Landing from './Landing';
import Logo from './Logo';
import { IconHome, IconUpload, IconAlert, IconHistory, IconScale, IconShield, IconPlus, IconLogout } from './Icons';

const NAV = [
  { href: '/', label: 'مساحة العمل', icon: <IconHome /> },
  { href: '/audit', label: 'غرفة العمليات والتدقيق', icon: <IconUpload /> },
  { href: '/breach', label: 'بلاغ اختراق (72 ساعة)', icon: <IconAlert /> },
  { href: '/history', label: 'سجل التدقيق', icon: <IconHistory /> },
  { href: '/legal', label: 'الإطار القانوني', icon: <IconScale /> },
];
const TITLES: Record<string, string> = { '/': 'مساحة العمل', '/audit': 'غرفة العمليات', '/breach': 'بلاغ اختراق', '/history': 'سجل التدقيق', '/legal': 'الإطار القانوني' };

export default function Shell({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);
  const [configError, setConfigError] = useState(false);
  const [wantLogin, setWantLogin] = useState(false);

  useEffect(() => {
    let sb;
    try { sb = supabase(); } catch { setConfigError(true); setReady(true); return; }
    sb.auth.getSession().then(({ data }) => { setSession(data.session); setReady(true); });
    const { data } = sb.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => data.subscription.unsubscribe();
  }, []);

  if (!ready) return <div className="auth center"><span className="spin" /></div>;
  if (configError) {
    return <div className="auth"><div className="alert err">إعدادات Supabase ناقصة في Vercel (NEXT_PUBLIC_SUPABASE_URL و NEXT_PUBLIC_SUPABASE_ANON_KEY). بعد إضافتها اعمل Redeploy.</div></div>;
  }
  if (!session) {
    if (path === '/' && !wantLogin) return <Landing onLogin={() => setWantLogin(true)} />;
    return <AuthForm onBack={path === '/' ? () => setWantLogin(false) : undefined} />;
  }

  const here = TITLES[path] ?? 'مساحة العمل';
  return (
    <div className="shell">
      <aside className="side">
        <div className="brand">
          <Logo size={42} />
          <div><b>MA&apos;At<i>AI</i></b><small>Legal Intelligence</small></div>
        </div>
        <div className="ws">
          <div><small>مساحة العمل</small><b>MA&apos;At</b><small>مساحة عمل خاصة</small></div>
          <IconShield size={20} />
        </div>
        <div className="nav-label">مساحة العمل</div>
        <nav className="nav">
          {NAV.map((n) => (
            <Link key={n.href} href={n.href} className={path === n.href ? 'active' : ''}>{n.icon}{n.label}</Link>
          ))}
        </nav>
        <div className="spacer" />
        <div className="who">{session.user.email}</div>
        <button className="btn ghost small" onClick={() => supabase().auth.signOut()}><IconLogout size={16} />تسجيل الخروج</button>
      </aside>
      <div className="content">
        <div className="topbar">
          <div className="crumbs"><span>مساحة العمل</span><span>/</span><b>{here}</b></div>
          <Link className="btn small" href="/audit"><IconPlus size={16} />تدقيق جديد</Link>
        </div>
        <div className="notice"><IconShield size={15} />النتائج استرشادية وتحتاج مراجعة محامٍ مختص قبل الاعتماد.</div>
        <main className="main">{children}</main>
      </div>
    </div>
  );
}
