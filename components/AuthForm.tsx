'use client';
import { useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

const AR_ERRORS: Record<string, string> = {
  'Invalid login credentials': 'البريد أو كلمة المرور غير صحيحة.',
  'Email not confirmed': 'لم يتم تأكيد البريد بعد. افتح رسالة التأكيد في بريدك.',
  'User already registered': 'البريد مسجل بالفعل. سجّل الدخول.',
};

export default function AuthForm() {
  const [mode, setMode] = useState<'in' | 'up'>('in');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ kind: 'err' | 'ok'; text: string } | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    if (password.length < 8) { setMsg({ kind: 'err', text: 'كلمة المرور 8 أحرف على الأقل.' }); return; }
    setBusy(true);
    const sb = supabase();
    const { data, error } = mode === 'in'
      ? await sb.auth.signInWithPassword({ email, password })
      : await sb.auth.signUp({ email, password, options: { emailRedirectTo: window.location.origin } });
    setBusy(false);
    if (error) { setMsg({ kind: 'err', text: AR_ERRORS[error.message] ?? error.message }); return; }
    if (mode === 'up' && !data.session) setMsg({ kind: 'ok', text: 'تم إنشاء الحساب. افتح رسالة التأكيد في بريدك ثم سجّل الدخول.' });
  }

  return (
    <div className="auth">
      <div className="center" style={{ marginBottom: 20 }}>
        <h1>⚖ MA&apos;At AI</h1>
        <p style={{ color: 'var(--muted)' }}>فحص امتثال سياسات الخصوصية لقانون 151 لسنة 2020</p>
      </div>
      <div className="card">
        <div className="tabs">
          <button type="button" className={mode === 'in' ? 'on' : ''} onClick={() => setMode('in')}>تسجيل الدخول</button>
          <button type="button" className={mode === 'up' ? 'on' : ''} onClick={() => setMode('up')}>حساب جديد</button>
        </div>
        {msg && <div className={`alert ${msg.kind}`}>{msg.text}</div>}
        <form onSubmit={submit}>
          <div className="field">
            <label htmlFor="email">البريد الإلكتروني</label>
            <input id="email" type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} dir="ltr" />
          </div>
          <div className="field">
            <label htmlFor="pw">كلمة المرور</label>
            <input id="pw" type="password" required minLength={8} autoComplete={mode === 'in' ? 'current-password' : 'new-password'}
              value={password} onChange={(e) => setPassword(e.target.value)} dir="ltr" />
          </div>
          <button className="btn" style={{ width: '100%' }} disabled={busy}>
            {busy ? <span className="spin" /> : mode === 'in' ? 'دخول' : 'إنشاء الحساب'}
          </button>
        </form>
      </div>
    </div>
  );
}
