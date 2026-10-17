'use client';
import { useEffect, useState } from 'react';
import { checkBreach, isError, type Json } from '@/lib/api';

const URGENCY_AR: Record<string, string> = {
  SAFE: 'آمن', WARNING: 'تحذير', CRITICAL: 'حرج', EXPIRED: 'انتهت المهلة', NOTIFIED: 'تم إخطار المركز',
};

// datetime-local gives "2026-10-17T14:30" in the user's local time -> ISO with timezone
const toIso = (v: string) => (v ? new Date(v).toISOString() : undefined);

function Countdown({ deadline }: { deadline: string }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(t); }, []);
  const ms = Date.parse(deadline) - now;
  if (ms <= 0) return <span className="big" style={{ color: 'var(--bad)' }}>انتهت المهلة</span>;
  const h = Math.floor(ms / 3600000), m = Math.floor((ms % 3600000) / 60000), s = Math.floor((ms % 60000) / 1000);
  return <span className="clock" dir="ltr">{h}:{String(m).padStart(2, '0')}:{String(s).padStart(2, '0')}</span>;
}

function Copy({ text }: { text: string }) {
  const [done, setDone] = useState(false);
  return (
    <button type="button" className="btn ghost small"
      onClick={async () => { try { await navigator.clipboard.writeText(text); setDone(true); setTimeout(() => setDone(false), 1500); } catch { /* ignore */ } }}>
      {done ? 'تم النسخ' : 'نسخ'}
    </button>
  );
}

export default function BreachPage() {
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
    if (!f.aware) { setError('حدد وقت علم الشركة بالاختراق.'); return; }
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
          <h1>مسار طوارئ: إخطار اختراق البيانات</h1>
          <p>مهلة إخطار المركز 72 ساعة من وقت العلم. لا يتم حفظ أي بيانات عن الحادثة.</p>
        </div>
      </div>

      <form className="card" onSubmit={submit}>
        <div className="grid2">
          <div className="field"><label>اسم الشركة</label><input type="text" maxLength={120} value={f.company_name} onChange={set('company_name')} /></div>
          <div className="field"><label>وقت علم الشركة بالاختراق *</label><input type="datetime-local" required value={f.aware} onChange={set('aware')} /></div>
          <div className="field"><label>عدد المتضررين</label><input type="number" min={0} value={f.affected_count} onChange={set('affected_count')} /></div>
          <div className="field"><label>وقت إخطار المركز (لو تم)</label><input type="datetime-local" value={f.notified} onChange={set('notified')} /></div>
        </div>
        <div className="field"><label>وصف الاختراق وأسبابه</label><textarea style={{ minHeight: 90 }} maxLength={2000} value={f.description} onChange={set('description')} /></div>
        <div className="field"><label>فئات البيانات المتأثرة (افصل بفاصلة)</label><input type="text" value={f.categories} onChange={set('categories')} placeholder="أسماء، أرقام هواتف، بيانات بطاقات" /></div>
        <div className="grid2">
          <div className="field"><label>الآثار المحتملة</label><textarea style={{ minHeight: 80 }} maxLength={2000} value={f.potential_impact} onChange={set('potential_impact')} /></div>
          <div className="field"><label>إجراءات الاحتواء</label><textarea style={{ minHeight: 80 }} maxLength={2000} value={f.containment_measures} onChange={set('containment_measures')} /></div>
        </div>
        <div className="grid3">
          <div className="field"><label>مسؤول حماية البيانات</label><input type="text" value={f.dpo_name} onChange={set('dpo_name')} /></div>
          <div className="field"><label>بريده</label><input type="email" dir="ltr" value={f.dpo_email} onChange={set('dpo_email')} /></div>
          <div className="field"><label>هاتفه</label><input type="text" dir="ltr" value={f.dpo_phone} onChange={set('dpo_phone')} /></div>
        </div>
        {error && <div className="alert err">{error}</div>}
        <button className="btn" disabled={busy}>{busy ? <span className="spin" /> : 'احسب المهلة وجهّز المسودات'}</button>
      </form>

      {r && (
        <div className="stack">
          <div className="grid2">
            <div className="card red center">
              <p>الوقت المتبقي لإخطار المركز</p>
              {r.center_notified_on_time === null || r.center_notified_on_time === undefined
                ? <Countdown deadline={r.deadline_iso} />
                : <span className="big">{r.center_notified_on_time ? 'تم الإخطار في الموعد' : 'تم الإخطار متأخراً'}</span>}
              <p style={{ marginTop: 8 }}><span className={`pill ${r.urgency}`}>{URGENCY_AR[r.urgency] ?? r.urgency}</span></p>
              <p className="hint">آخر موعد: {r.deadline_72h_cairo} (توقيت القاهرة)</p>
            </div>
            <div className="card">
              <h3>المطلوب الآن</h3>
              <ol style={{ margin: 0, paddingInlineStart: 20 }}>
                <li>{r.action_plan?.step_1}</li>
                <li>{r.action_plan?.step_2} آخر موعد: <b>{r.notify_data_subjects_by}</b></li>
                <li>{r.action_plan?.step_3}</li>
              </ol>
              <p className="hint">{r.working_days_note}</p>
            </div>
          </div>
          {Array.isArray(r.required_notification_items_missing) && r.required_notification_items_missing.length > 0 && (
            <div className="alert warn">بيانات ناقصة في الإخطار: {r.required_notification_items_missing.join('، ')}</div>
          )}
          <div className="card">
            <div className="head" style={{ marginBottom: 8 }}><h3>مسودة إخطار المركز</h3><Copy text={r.notification_draft} /></div>
            <pre className="draft">{r.notification_draft}</pre>
          </div>
          <div className="card">
            <div className="head" style={{ marginBottom: 8 }}><h3>مسودة بلاغ مباحث الإنترنت</h3><Copy text={r.law_175_victim_report_draft} /></div>
            <pre className="draft">{r.law_175_victim_report_draft}</pre>
          </div>
          <p className="hint">{r.disclaimer}</p>
        </div>
      )}
    </div>
  );
}
