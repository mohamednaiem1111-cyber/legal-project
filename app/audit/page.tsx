'use client';
import { useEffect, useState } from 'react';
import { runAudit, isError, MAX_PDF_BYTES, type Json } from '@/lib/api';
import AuditResult from '@/components/AuditResult';

const STAGES = ['تحليل المستند', 'استخراج البيانات', 'تقييم المخاطر', 'الملخص التنفيذي'];

export default function AuditPage() {
  const [mode, setMode] = useState<'pdf' | 'text'>('pdf');
  const [company, setCompany] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [text, setText] = useState('');
  const [isSP, setIsSP] = useState(false);
  const [isForeign, setIsForeign] = useState(false);
  const [busy, setBusy] = useState(false);
  const [stage, setStage] = useState(0);
  const [error, setError] = useState('');
  const [result, setResult] = useState<Json | null>(null);

  // cosmetic progress while waiting (the real work happens on the server)
  useEffect(() => {
    if (!busy) return;
    setStage(0);
    const t = setInterval(() => setStage((s) => Math.min(s + 1, STAGES.length - 1)), 12000);
    return () => clearInterval(t);
  }, [busy]);

  function pickFile(f: File | null) {
    setError('');
    if (!f) { setFile(null); return; }
    if (f.type && f.type !== 'application/pdf') { setError('ارفع ملف PDF فقط.'); return; }
    if (f.size > MAX_PDF_BYTES) { setError('الحد الأقصى لحجم الملف 4 ميجابايت.'); return; }
    setFile(f);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(''); setResult(null);
    if (!company.trim()) { setError('اكتب اسم الشركة.'); return; }
    if (mode === 'pdf' && !file) { setError('اختر ملف PDF.'); return; }
    if (mode === 'text' && text.trim().length < 200) { setError('النص قصير جداً (200 حرف على الأقل).'); return; }
    setBusy(true);
    const r = await runAudit({
      companyName: company.trim(), file: mode === 'pdf' ? file : null, policyText: mode === 'text' ? text : undefined,
      isServiceProvider: isSP, isForeignEntity: isForeign,
    });
    setBusy(false);
    if (isError(r)) {
      if (r.status === 401) { setError('انتهت الجلسة. سجّل الدخول مرة أخرى.'); return; }
      setError(r.message);
      return;
    }
    setResult(r);
  }

  return (
    <div className="stack">
      <div className="head">
        <div>
          <h1>غرفة التدقيق الذكي</h1>
          <p>الفحص بياخد من دقيقة لدقيقتين. متقفلش الصفحة.</p>
        </div>
      </div>

      <form className="card" onSubmit={submit}>
        <div className="field">
          <label htmlFor="company">اسم الشركة</label>
          <input id="company" type="text" maxLength={120} value={company} onChange={(e) => setCompany(e.target.value)} />
        </div>

        <div className="tabs">
          <button type="button" className={mode === 'pdf' ? 'on' : ''} onClick={() => setMode('pdf')}>01 رفع PDF</button>
          <button type="button" className={mode === 'text' ? 'on' : ''} onClick={() => setMode('text')}>02 لصق النص</button>
        </div>

        {mode === 'pdf' ? (
          <div className="field">
            <label htmlFor="file">ملف سياسة الخصوصية</label>
            <input id="file" type="file" accept="application/pdf,.pdf" onChange={(e) => pickFile(e.target.files?.[0] ?? null)} />
            <div className="hint">PDF نصي (مش صورة ممسوحة)، حتى 4 ميجابايت.</div>
          </div>
        ) : (
          <div className="field">
            <label htmlFor="text">نص سياسة الخصوصية</label>
            <textarea id="text" maxLength={120000} value={text} onChange={(e) => setText(e.target.value)} />
            <div className="hint">{text.length.toLocaleString('en-US')} / 120,000 حرف</div>
          </div>
        )}

        <div className="field">
          <label className="check"><input type="checkbox" checked={isSP} onChange={(e) => setIsSP(e.target.checked)} /> الجهة مقدّم خدمة اتصالات أو إنترنت (يفعّل بند القانون 175)</label>
          <label className="check"><input type="checkbox" checked={isForeign} onChange={(e) => setIsForeign(e.target.checked)} /> الجهة أجنبية</label>
        </div>

        {error && <div className="alert err">{error}</div>}
        <button className="btn" disabled={busy}>{busy ? <>جارٍ التحليل <span className="spin" /></> : 'ابدأ الفحص'}</button>

        {busy && (
          <div className="steps">
            {STAGES.map((s, i) => <div key={s} className={`step ${i <= stage ? 'on' : ''}`}>{i + 1}. {s}</div>)}
          </div>
        )}
      </form>

      {result && <AuditResult r={result} company={company} />}
    </div>
  );
}
