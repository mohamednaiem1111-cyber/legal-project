'use client';
import { useEffect, useRef, useState } from 'react';
import { runAudit, isError, MAX_PDF_BYTES, type Json } from '@/lib/api';
import { useI18n } from '@/lib/i18n';
import AuditResult from '@/components/AuditResult';
import PrivacyNotice from '@/components/PrivacyNotice';
import { IconScan, IconDoc, IconRadar, IconList } from '@/components/Icons';

export default function AuditPage() {
  const { tr } = useI18n();
  const [mode, setMode] = useState<'pdf' | 'text'>('pdf');
  const [company, setCompany] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [text, setText] = useState('');
  const [isSP, setIsSP] = useState(false);
  const [isForeign, setIsForeign] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [stage, setStage] = useState(0);
  const [error, setError] = useState('');
  const [result, setResult] = useState<Json | null>(null);
  const resultRef = useRef<HTMLDivElement>(null);

  const STAGES = [
    { title: tr('تحليل المستند', 'Document analysis'), text: tr('قراءة النص وتجهيزه للفحص', 'Reading and preparing the text'), icon: <IconScan size={18} /> },
    { title: tr('استخراج البيانات', 'Data extraction'), text: tr('تحديد الأغراض وفئات البيانات والأسانيد', 'Identifying purposes, data categories and legal bases'), icon: <IconDoc size={18} /> },
    { title: tr('تقييم المخاطر', 'Risk assessment'), text: tr('تصنيف البنود مقابل القانون واللائحة', 'Classifying the items against the law and regulation'), icon: <IconRadar size={18} /> },
    { title: tr('الملخص التنفيذي', 'Executive summary'), text: tr('حساب الدرجة والغرامات وتجهيز التقرير', 'Computing the score and fines and preparing the report'), icon: <IconList size={18} /> },
  ];

  // cosmetic progress while waiting (the real work happens on the server)
  useEffect(() => {
    if (!busy) return;
    setStage(0);
    const t = setInterval(() => setStage((s) => Math.min(s + 1, 3)), 4000);
    return () => clearInterval(t);
  }, [busy]);

  useEffect(() => { if (result) resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }, [result]);

  function pickFile(f: File | null) {
    setError('');
    if (!f) { setFile(null); return; }
    if (f.type && f.type !== 'application/pdf') { setError(tr('ارفع ملف PDF فقط.', 'Upload a PDF file only.')); return; }
    if (f.size > MAX_PDF_BYTES) { setError(tr('الحد الأقصى لحجم الملف 4 ميجابايت.', 'The maximum file size is 4 MB.')); return; }
    setFile(f);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(''); setResult(null);
    if (!company.trim()) { setError(tr('اكتب اسم الشركة.', 'Enter the company name.')); return; }
    if (mode === 'pdf' && !file) { setError(tr('اختر ملف PDF.', 'Choose a PDF file.')); return; }
    if (mode === 'text' && text.trim().length < 200) { setError(tr('النص قصير جداً (200 حرف على الأقل).', 'The text is too short (at least 200 characters).')); return; }
    setBusy(true);
    const r = await runAudit({
      companyName: company.trim(), file: mode === 'pdf' ? file : null, policyText: mode === 'text' ? text : undefined,
      isServiceProvider: isSP, isForeignEntity: isForeign,
    });
    setBusy(false);
    if (isError(r)) {
      if (r.status === 401) { setError(tr('انتهت الجلسة. سجّل الدخول مرة أخرى.', 'Your session expired. Sign in again.')); return; }
      setError(r.message);
      return;
    }
    setResult(r);
  }

  const nodeState = (i: number) => (result ? 'done' : busy ? (i < stage ? 'done' : i === stage ? 'run' : '') : '');
  const stateLabel = (s: string) => (s === 'done' ? tr('اكتملت', 'Done') : s === 'run' ? tr('جارٍ التنفيذ', 'Running') : tr('في الانتظار', 'Waiting'));

  return (
    <div className="stack">
      <div className="head">
        <div>
          <div className="eyebrow">{tr('مساحة العمل / غرفة العمليات', 'Workspace / Operations room')}</div>
          <h1>{tr('لوحة غرفة عمليات الذكاء الاصطناعي', 'AI operations-room board')}</h1>
          <p>{tr('من الأدلة المعقدة إلى قرارات واضحة. الفحص يأخذ من 10 ثوانٍ إلى دقيقتين، فلا تقفل الصفحة.', 'From complex evidence to clear decisions. An audit takes 10 seconds to 2 minutes, so keep the page open.')}</p>
        </div>
      </div>

      <div className="ops">
        <form className="card" onSubmit={submit}>
          <div className="field">
            <label htmlFor="company">{tr('اسم الشركة', 'Company name')}</label>
            <input id="company" type="text" maxLength={120} value={company} onChange={(e) => setCompany(e.target.value)} />
          </div>

          <div className="tabs">
            <button type="button" className={mode === 'pdf' ? 'on' : ''} onClick={() => setMode('pdf')}>{tr('01 رفع PDF', '01 Upload PDF')}</button>
            <button type="button" className={mode === 'text' ? 'on' : ''} onClick={() => setMode('text')}>{tr('02 لصق النص', '02 Paste text')}</button>
          </div>

          {mode === 'pdf' ? (
            <div className="field">
              <label htmlFor="file">{tr('ملف سياسة الخصوصية', 'Privacy-policy file')}</label>
              <input id="file" type="file" accept="application/pdf,.pdf" onChange={(e) => pickFile(e.target.files?.[0] ?? null)} />
              <div className="hint">{tr('PDF نصي (مش صورة ممسوحة)، حتى 4 ميجابايت.', 'A text PDF (not a scanned image), up to 4 MB.')}</div>
            </div>
          ) : (
            <div className="field">
              <label htmlFor="text">{tr('نص سياسة الخصوصية', 'Privacy-policy text')}</label>
              <textarea id="text" maxLength={120000} value={text} onChange={(e) => setText(e.target.value)} />
              <div className="hint">{text.length.toLocaleString('en-US')} / 120,000 {tr('حرف', 'characters')}</div>
            </div>
          )}

          <div className="field">
            <label className="check"><input type="checkbox" checked={isSP} onChange={(e) => setIsSP(e.target.checked)} /> {tr('الجهة مقدّم خدمة اتصالات أو إنترنت (يفعّل بند القانون 175)', 'The entity is a telecom or internet service provider (enables the Law 175 item)')}</label>
            <label className="check"><input type="checkbox" checked={isForeign} onChange={(e) => setIsForeign(e.target.checked)} /> {tr('الجهة أجنبية', 'The entity is foreign')}</label>
          </div>

          <PrivacyNotice withConsent agreed={agreed} onAgree={setAgreed} />
          {error && <div className="alert err" dir="auto">{error}</div>}
          <button className="btn block" disabled={busy}>{busy ? <>{tr('جارٍ التحليل', 'Analysing')} <span className="spin" /></> : tr('بدء عملية الذكاء الاصطناعي', 'Start AI analysis')}</button>
        </form>

        <div className="pipeline" aria-live="polite">
          <div className="pipeline-head">
            <span>{tr('MA\'At / 01 · خط المعالجة', 'MA\'At / 01 · Processing pipeline')}</span>
            <span className="live">{busy ? tr('جارٍ العمل', 'Working') : result ? tr('اكتمل', 'Complete') : tr('جاهز للاستكشاف', 'Ready')}</span>
          </div>
          <div className="nodes">
            {STAGES.map((s, i) => {
              const st = nodeState(i);
              return (
                <div key={s.title} className={`node ${st}`}>
                  <div className="no">0{i + 1}</div>
                  <h3>{s.icon}{s.title}</h3>
                  <p>{s.text}</p>
                  <div className="state"><span className="dot" />{stateLabel(st)}</div>
                </div>
              );
            })}
          </div>
          <div className="pipeline-foot">{tr('التقدّم المعروض تقريبي؛ المعالجة الفعلية تتم على الخادم.', 'The progress shown is approximate; the real processing runs on the server.')}</div>
        </div>
      </div>

      {result && (
        <div ref={resultRef} className="paper">
          <AuditResult r={result} company={company} />
        </div>
      )}
    </div>
  );
}
