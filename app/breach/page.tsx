'use client';
import { useEffect, useState } from 'react';
import { checkBreach, isError, type Json } from '@/lib/api';
import { useI18n } from '@/lib/i18n';

const URGENCY: Record<string, [string, string]> = {
  SAFE: ['آمن', 'Safe'], WARNING: ['تحذير', 'Warning'], CRITICAL: ['حرج', 'Critical'], EXPIRED: ['انتهت المهلة', 'Expired'], NOTIFIED: ['تم إخطار المركز', 'Center notified'],
};

// datetime-local gives "2026-10-17T14:30" in the user's local time -> ISO with timezone
const toIso = (v: string) => (v ? new Date(v).toISOString() : undefined);

function Countdown({ deadline }: { deadline: string }) {
  const { tr } = useI18n();
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(t); }, []);
  const ms = Date.parse(deadline) - now;
  if (ms <= 0) return <span className="big" style={{ color: 'var(--bad)' }}>{tr('انتهت المهلة', 'Deadline expired')}</span>;
  const h = Math.floor(ms / 3600000), m = Math.floor((ms % 3600000) / 60000), s = Math.floor((ms % 60000) / 1000);
  return <span className="clock" dir="ltr">{h}:{String(m).padStart(2, '0')}:{String(s).padStart(2, '0')}</span>;
}

function Copy({ text }: { text: string }) {
  const { tr } = useI18n();
  const [done, setDone] = useState(false);
  return (
    <button type="button" className="btn ghost small"
      onClick={async () => { try { await navigator.clipboard.writeText(text); setDone(true); setTimeout(() => setDone(false), 1500); } catch { /* ignore */ } }}>
      {done ? tr('تم النسخ', 'Copied') : tr('نسخ', 'Copy')}
    </button>
  );
}

export default function BreachPage() {
  const { tr, lang } = useI18n();
  const [f, setF] = useState({
    company_name: '', aware: '', notified: '', description: '', affected_count: '',
    categories: '', potential_impact: '', containment_measures: '',
    dpo_name: '', dpo_email: '', dpo_phone: '',
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [r, setR] = useState<Json | null>(null);
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setF({ ...f, [k]: e.target.value });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(''); setR(null);
    if (!f.aware) { setError(tr('حدد وقت علم الشركة بالاختراق.', 'Set the time the company became aware of the breach.')); return; }
    setBusy(true);
    const res = await checkBreach({
      company_name: f.company_name || undefined,
      incident_date: toIso(f.aware),
      center_notified_at: toIso(f.notified),
      description: f.description || undefined,
      affected_count: f.affected_count === '' ? undefined : Number(f.affected_count),
      categories: f.categories ? f.categories.split(/[،,]/).map((s) => s.trim()).filter(Boolean) : undefined,
      potential_impact: f.potential_impact || undefined,
      containment_measures: f.containment_measures || undefined,
      dpo: (f.dpo_name || f.dpo_email || f.dpo_phone) ? { name: f.dpo_name, email: f.dpo_email, phone: f.dpo_phone } : undefined,
    });
    setBusy(false);
    if (isError(res)) {
      const details = Array.isArray((res as Json).errors) ? ' ' + (res as Json).errors.join('، ') : '';
      setError(res.message + details);
      return;
    }
    setR(res);
  }

  return (
    <div className="stack">
      <div className="head">
        <div>
          <div className="eyebrow">{tr('مساحة العمل / بلاغ اختراق', 'Workspace / Breach notice')}</div>
          <h1>{tr('مسار طوارئ: إخطار اختراق البيانات', 'Emergency path: data-breach notification')}</h1>
          <p>{tr('مهلة إخطار المركز 72 ساعة من وقت العلم. لا يتم حفظ أي بيانات عن الحادثة، ولا يُرسَل شيء للذكاء الاصطناعي في هذا المسار (حساب ثابت فقط).', 'The deadline to notify the Center is 72 hours from awareness. No data about the incident is stored, and nothing is sent to the AI on this path (fixed computation only).')}</p>
        </div>
      </div>

      <form className="card" onSubmit={submit}>
        <div className="grid2">
          <div className="field"><label>{tr('اسم الشركة', 'Company name')}</label><input type="text" maxLength={120} value={f.company_name} onChange={set('company_name')} /></div>
          <div className="field"><label>{tr('وقت علم الشركة بالاختراق *', 'Time the company became aware of the breach *')}</label><input type="datetime-local" required value={f.aware} onChange={set('aware')} /></div>
          <div className="field"><label>{tr('عدد المتضررين', 'Number of people affected')}</label><input type="number" min={0} value={f.affected_count} onChange={set('affected_count')} /></div>
          <div className="field"><label>{tr('وقت إخطار المركز (لو تم)', 'Time the Center was notified (if done)')}</label><input type="datetime-local" value={f.notified} onChange={set('notified')} /></div>
        </div>
        <div className="field"><label>{tr('وصف الاختراق وأسبابه', 'Description and causes of the breach')}</label><textarea style={{ minHeight: 90 }} maxLength={2000} value={f.description} onChange={set('description')} /></div>
        <div className="field"><label>{tr('فئات البيانات المتأثرة (افصل بفاصلة)', 'Affected data categories (comma separated)')}</label><input type="text" value={f.categories} onChange={set('categories')} placeholder={tr('أسماء، أرقام هواتف، بيانات بطاقات', 'Names, phone numbers, card data')} /></div>
        <div className="grid2">
          <div className="field"><label>{tr('الآثار المحتملة', 'Potential impact')}</label><textarea style={{ minHeight: 80 }} maxLength={2000} value={f.potential_impact} onChange={set('potential_impact')} /></div>
          <div className="field"><label>{tr('إجراءات الاحتواء', 'Containment measures')}</label><textarea style={{ minHeight: 80 }} maxLength={2000} value={f.containment_measures} onChange={set('containment_measures')} /></div>
        </div>
        <div className="grid3">
          <div className="field"><label>{tr('مسؤول حماية البيانات', 'Data protection officer')}</label><input type="text" value={f.dpo_name} onChange={set('dpo_name')} /></div>
          <div className="field"><label>{tr('بريده', 'Email')}</label><input type="email" dir="ltr" value={f.dpo_email} onChange={set('dpo_email')} /></div>
          <div className="field"><label>{tr('هاتفه', 'Phone')}</label><input type="text" dir="ltr" value={f.dpo_phone} onChange={set('dpo_phone')} /></div>
        </div>
        {error && <div className="alert err" dir="auto">{error}</div>}
        <button className="btn" disabled={busy}>{busy ? <span className="spin" /> : tr('احسب المهلة وجهّز المسودات', 'Compute the deadline and prepare the drafts')}</button>
      </form>

      {r && (
        <div className="stack">
          {lang === 'en' && <div className="alert warn">The action plan and the two drafts below are generated in Arabic, the language of the filings.</div>}
          <div className="grid2">
            <div className="card red center">
              <p>{tr('الوقت المتبقي لإخطار المركز', 'Time left to notify the Center')}</p>
              {r.center_notified_on_time === null || r.center_notified_on_time === undefined
                ? <Countdown deadline={r.deadline_iso} />
                : <span className="big">{r.center_notified_on_time ? tr('تم الإخطار في الموعد', 'Notified on time') : tr('تم الإخطار متأخراً', 'Notified late')}</span>}
              <p style={{ marginTop: 8 }}><span className={`pill ${r.urgency}`}>{URGENCY[r.urgency] ? URGENCY[r.urgency][lang === 'ar' ? 0 : 1] : r.urgency}</span></p>
              <p className="hint">{tr('آخر موعد: ', 'Deadline: ')}<span dir="ltr">{r.deadline_72h_cairo}</span>{tr(' (توقيت القاهرة)', ' (Cairo time)')}</p>
            </div>
            <div className="card">
              <h3>{tr('المطلوب الآن', 'What to do now')}</h3>
              <ol style={{ margin: 0, paddingInlineStart: 20 }} dir="auto">
                <li>{r.action_plan?.step_1}</li>
                <li>{r.action_plan?.step_2} {tr('آخر موعد: ', 'Deadline: ')}<b>{r.notify_data_subjects_by}</b></li>
                <li>{r.action_plan?.step_3}</li>
              </ol>
              <p className="hint" dir="auto">{r.working_days_note}</p>
            </div>
          </div>
          {Array.isArray(r.required_notification_items_missing) && r.required_notification_items_missing.length > 0 && (
            <div className="alert warn" dir="auto">{tr('بيانات ناقصة في الإخطار: ', 'Missing details in the notification: ')}{r.required_notification_items_missing.join('، ')}</div>
          )}
          <div className="card">
            <div className="head" style={{ marginBottom: 8 }}><h3>{tr('مسودة إخطار المركز', 'Draft notification to the Center')}</h3><Copy text={r.notification_draft} /></div>
            <pre className="draft" dir="rtl">{r.notification_draft}</pre>
          </div>
          <div className="card">
            <div className="head" style={{ marginBottom: 8 }}><h3>{tr('مسودة بلاغ مباحث الإنترنت', 'Draft report to the cybercrime police')}</h3><Copy text={r.law_175_victim_report_draft} /></div>
            <pre className="draft" dir="rtl">{r.law_175_victim_report_draft}</pre>
          </div>
          <p className="hint" dir="auto">{r.disclaimer}</p>
        </div>
      )}
    </div>
  );
}
