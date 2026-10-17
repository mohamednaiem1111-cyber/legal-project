'use client';
// Sidebar + top bar + login gate. "/" is public (landing); every other page needs a logged-in user.
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabaseClient';
import { useI18n, LangToggle } from '@/lib/i18n';
import AuthForm from './AuthForm';
import Landing from './Landing';
import Logo from './Logo';
import { IconHome, IconUpload, IconAlert, IconHistory, IconScale, IconShield, IconPlus, IconLogout } from './Icons';

export default function Shell({ children }: { children: React.ReactNode }) {
  const { tr } = useI18n();
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

  const NAV = [
    { href: '/', label: tr('مساحة العمل', 'Workspace'), icon: <IconHome /> },
    { href: '/audit', label: tr('غرفة العمليات والتدقيق', 'Operations room & audit'), icon: <IconUpload /> },
    { href: '/breach', label: tr('بلاغ اختراق (72 ساعة)', 'Breach notice (72 h)'), icon: <IconAlert /> },
    { href: '/history', label: tr('سجل التدقيق', 'Audit history'), icon: <IconHistory /> },
    { href: '/legal', label: tr('الإطار القانوني', 'Legal framework'), icon: <IconScale /> },
  ];
  const TITLES: Record<string, string> = {
    '/': tr('مساحة العمل', 'Workspace'), '/audit': tr('غرفة العمليات', 'Operations room'), '/breach': tr('بلاغ اختراق', 'Breach notice'),
    '/history': tr('سجل التدقيق', 'Audit history'), '/legal': tr('الإطار القانوني', 'Legal framework'),
  };

  if (!ready) return <div className="auth center"><span className="spin" /></div>;
  if (configError) {
    return <div className="auth"><div className="alert err">{tr('إعدادات Supabase ناقصة في Vercel (NEXT_PUBLIC_SUPABASE_URL و NEXT_PUBLIC_SUPABASE_ANON_KEY). بعد إضافتها اعمل Redeploy.', 'Supabase settings are missing in Vercel (NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY). Add them, then redeploy.')}</div></div>;
  }
  if (!session) {
    if (path === '/' && !wantLogin) return <Landing onLogin={() => setWantLogin(true)} />;
    return <AuthForm onBack={path === '/' ? () => setWantLogin(false) : undefined} />;
  }

  const here = TITLES[path] ?? tr('مساحة العمل', 'Workspace');
  return (
    <div className="shell">
      <aside className="side">
        <div className="brand">
          <Logo size={42} />
          <div><b>MA&apos;At<i>AI</i></b><small>Legal Intelligence</small></div>
        </div>
        <div className="ws">
          <div><small>{tr('مساحة العمل', 'Workspace')}</small><b>MA&apos;At</b><small>{tr('مساحة عمل خاصة', 'Private workspace')}</small></div>
          <IconShield size={20} />
        </div>
        <div className="nav-label">{tr('مساحة العمل', 'Workspace')}</div>
        <nav className="nav">
          {NAV.map((n) => (
            <Link key={n.href} href={n.href} className={path === n.href ? 'active' : ''}>{n.icon}{n.label}</Link>
          ))}
        </nav>
        <div className="spacer" />
        <div className="who">{session.user.email}</div>
        <button className="btn ghost small" onClick={() => supabase().auth.signOut()}><IconLogout size={16} />{tr('تسجيل الخروج', 'Sign out')}</button>
      </aside>
      <div className="content">
        <div className="topbar">
          <div className="crumbs"><span>{tr('مساحة العمل', 'Workspace')}</span><span>/</span><b>{here}</b></div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <LangToggle />
            <Link className="btn small" href="/audit"><IconPlus size={16} />{tr('تدقيق جديد', 'New audit')}</Link>
          </div>
        </div>
        <div className="notice"><IconShield size={15} />{tr('النتائج استرشادية وتحتاج مراجعة محامٍ مختص قبل الاعتماد.', 'Results are advisory and need review by a qualified lawyer before being relied on.')}</div>
        <main className="main">{children}</main>
      </div>
    </div>
  );
}
