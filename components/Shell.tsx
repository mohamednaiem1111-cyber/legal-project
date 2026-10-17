'use client';
// Sidebar + login gate. Every page is shown only to a logged-in user.
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabaseClient';
import AuthForm from './AuthForm';

const NAV = [
  { href: '/', label: 'الرئيسية' },
  { href: '/audit', label: 'غرفة التدقيق' },
  { href: '/breach', label: 'بلاغ اختراق (72 ساعة)' },
  { href: '/history', label: 'سجل الفحوصات' },
];

export default function Shell({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);
  const [configError, setConfigError] = useState(false);

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
  if (!session) return <AuthForm />;

  return (
    <div className="shell">
      <aside className="side">
        <div className="brand">⚖ MA&apos;At AI<small>ماعت للامتثال القانوني</small></div>
        <nav className="nav">
          {NAV.map((n) => (
            <Link key={n.href} href={n.href} className={path === n.href ? 'active' : ''}>{n.label}</Link>
          ))}
        </nav>
        <div className="spacer" />
        <div className="who">{session.user.email}</div>
        <button className="btn ghost small" style={{ color: '#fff', borderColor: 'rgba(255,255,255,.3)' }}
          onClick={() => supabase().auth.signOut()}>تسجيل الخروج</button>
      </aside>
      <main className="main">{children}</main>
    </div>
  );
}
