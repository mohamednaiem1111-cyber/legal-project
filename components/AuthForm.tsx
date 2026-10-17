'use client';
import { useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useI18n, LangToggle } from '@/lib/i18n';
import Logo from './Logo';

const AR_ERRORS: Record<string, string> = {
  'Invalid login credentials': 'البريد أو كلمة المرور غير صحيحة.',
  'Email not confirmed': 'لم يتم تأكيد البريد بعد. افتح رسالة التأكيد في بريدك.',
  'User already registered': 'البريد مسجل بالفعل. سجّل الدخول.',
};

export default function AuthForm({ onBack }: { onBack?: () => void }) {
  const { tr, lang } = useI18n();
  const [mode, setMode] = useState<'in' | 'up'>('in');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ kind: 'err' | 'ok'; text: string } | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    if (password.length < 8) { setMsg({ kind: 'err', text: tr('كلمة المرور 8 أحرف على الأقل.', 'The password must be at least 8 characters.') }); return; }
    setBusy(true);
    const sb = supabase();
    const { data, error } = mode === 'in'
      ? await sb.auth.signInWithPassword({ email, password })
      : await sb.auth.signUp({ email, password, options: { emailRedirectTo: window.location.origin } });
    setBusy(false);
    if (error) { setMsg({ kind: 'err', text: lang === 'ar' ? (AR_ERRORS[error.message] ?? error.message) : error.message }); return; }
    if (mode === 'up' && !data.session) setMsg({ kind: 'ok', text: tr('تم إنشاء الحساب. افتح رسالة التأكيد في بريدك ثم سجّل الدخول.', 'Account created. Open the confirmation email, then sign in.') });
  }

  return (
    <div className="auth">
      <div className="center" style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 10 }}><Logo size={64} /></div>
        <h1>MA&apos;At AI</h1>
        <p style={{ color: 'var(--muted)' }}>{tr('فحص امتثال سياسات الخصوصية لقانون 151 لسنة 2020', 'Privacy-policy compliance check against Law 151 of 2020')}</p>
      </div>
      <div className="card">
        <div className="tabs">
          <button type="button" className={mode === 'in' ? 'on' : ''} onClick={() => setMode('in')}>{tr('تسجيل الدخول', 'Sign in')}</button>
          <button type="button" className={mode === 'up' ? 'on' : ''} onClick={() => setMode('up')}>{tr('حساب جديد', 'New account')}</button>
        </div>
        {msg && <div className={`alert ${msg.kind}`}>{msg.text}</div>}
        <form onSubmit={submit}>
          <div className="field">
            <label htmlFor="email">{tr('البريد الإلكتروني', 'Email')}</label>
            <input id="email" type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} dir="ltr" />
          </div>
          <div className="field">
            <label htmlFor="pw">{tr('كلمة المرور', 'Password')}</label>
            <input id="pw" type="password" required minLength={8} autoComplete={mode === 'in' ? 'current-password' : 'new-password'}
              value={password} onChange={(e) => setPassword(e.target.value)} dir="ltr" />
          </div>
          <button className="btn block" disabled={busy}>
            {busy ? <span className="spin" /> : mode === 'in' ? tr('دخول', 'Sign in') : tr('إنشاء الحساب', 'Create account')}
          </button>
        </form>
      </div>
      <p className="center" style={{ marginTop: 14, display: 'flex', gap: 8, justifyContent: 'center' }}>
        {onBack && <button type="button" className="btn ghost small" onClick={onBack}>{tr('العودة للصفحة الرئيسية', 'Back to home')}</button>}
        <LangToggle />
      </p>
    </div>
  );
}
