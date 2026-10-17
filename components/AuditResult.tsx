'use client';
import { useState } from 'react';
import type { Json } from '@/lib/api';
import ReportFrame, { downloadReport } from './ReportFrame';

const egp = (n: unknown) => (typeof n === 'number' ? n.toLocaleString('en-US') + ' ج.م' : '—');
const STATUS_AR: Record<string, string> = { 'Compliant': 'مستوفى', 'Partially Compliant': 'مستوفى جزئياً', 'Non-Compliant': 'غير مستوفى', 'Not Applicable': 'غير منطبق', 'Not Determinable': 'لا يمكن الحكم' };
const riskClass = (r: string) => ({ Low: 'low', Medium: 'medium', High: 'high', Critical: 'high' } as Record<string, string>)[r] ?? 'unknown';

export default function AuditResult({ r, company }: { r: Json; company: string }) {
  const [showReport, setShowReport] = useState(false);

  if (r.exempt) {
    return <div className="alert ok">{r.message}<br /><small>{r.note}</small></div>;
  }

  const st = r.statistics ?? {};
  const axes: Json[] = Array.isArray(r.axes) ? r.axes : [];
  const violations: Json[] = Array.isArray(r.violations) ? r.violations : [];
  const fines = r.law_151_fines ?? {};
  const cyber = r.cyber_175 ?? {};

  return (
    <div className="stack">
      <div>
        <div className="eyebrow">نتائج التدقيق والتقارير الرقابية</div>
        <h2 style={{ fontSize: 24 }}>نتيجة تدقيق: {company || 'الشركة'}</h2>
      </div>
      {r.legal_review_status === 'PENDING_LAWYER_REVIEW' && (
        <div className="alert warn">نتيجة استرشادية: المصفوفة القانونية لم تُعتمد من المحامي بعد.</div>
      )}
      {r.confidence === 'low' && <div className="alert warn">ثقة منخفضة: بنود كثيرة لا يمكن الحكم عليها من نص السياسة وحده.</div>}
      {r.truncated && <div className="alert warn">المستند طويل، فتم فحص الجزء الأول منه فقط.</div>}
      {r.saved === false && <div className="alert warn">النتيجة ظهرت لكن لم تُحفظ في السجل.</div>}

      <div className="grid4">
        <div className="card stat"><b>{r.compliance_score === null || r.compliance_score === undefined ? '—' : `${r.compliance_score}%`}</b><span>مؤشر الامتثال</span></div>
        <div className="card stat"><b>{st.non_compliant ?? 0}</b><span>بند غير مستوفى</span></div>
        <div className="card stat"><b>{st.not_determinable ?? 0}</b><span>بند لا يمكن الحكم عليه</span></div>
        <div className="card stat"><b><span className={`pill ${riskClass(r.risk_level)}`}>{r.risk_level_ar ?? r.risk_level}</span></b><span>مستوى الخطر</span></div>
      </div>

      <div className="card">
        <h2>المحاور التسعة</h2>
        <div className="tablewrap">
          <table>
            <thead><tr><th>#</th><th>المحور</th><th>الوزن</th><th>النسبة</th><th>مستوفى / جزئي / غير مستوفى</th></tr></thead>
            <tbody>
              {axes.map((a) => (
                <tr key={a.id}>
                  <td>{a.id}</td><td>{a.name}</td><td>{a.weight}%</td>
                  <td>{a.axis_percent === null || a.axis_percent === undefined ? '—' : `${a.axis_percent}%`}</td>
                  <td>{a.counts?.compliant ?? 0} / {a.counts?.partial ?? 0} / {a.counts?.non ?? 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card">
        <h2>جدول المخاطر والإجراءات المقترحة</h2>
        {violations.length === 0 ? <p>لا توجد مخالفات مؤكدة.</p> : (
          <div className="tablewrap">
            <table>
              <thead><tr><th>المادة</th><th>وصف الفجوة</th><th>العقوبة</th><th>الإجراء المقترح</th></tr></thead>
              <tbody>
                {violations.map((v, i) => (
                  <tr key={i}><td className="nowrap">{v.legal_article}</td><td>{v.violation}</td><td className="nowrap">{v.penalty}</td><td>{v.corrective_action || '—'}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="grid2">
        <div className="card gold">
          <h3>حاسبة التصالح الجنائي | المادة 49</h3>
          <p>نطاق الغرامات: {egp(fines.total_min_fine)} إلى {egp(fines.total_max_fine)}</p>
          <p>قيمة التصالح المقدّرة: <b>{egp(r.settlement_art49)}</b></p>
          <p className="hint">{fines.settlement_art49?.formula}</p>
        </div>
        <div className="card red">
          <h3>القانون 175 لسنة 2018 (مسار مستقل)</h3>
          {cyber.applicable
            ? <p>حالة حفظ السجلات 180 يوماً: <b>{STATUS_AR[cyber.status] ?? cyber.status}</b>. الغرامة المحتملة {egp(cyber.fine_min)} إلى {egp(cyber.fine_max)}، ولا يشملها تصالح المادة 49.</p>
            : <p>لا ينطبق (الجهة ليست مقدّم خدمة اتصالات أو إنترنت).</p>}
        </div>
      </div>

      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        <button className="btn" onClick={() => setShowReport((s) => !s)}>{showReport ? 'إخفاء التقرير الكامل' : 'عرض التقرير الكامل'}</button>
        <button className="btn ghost" onClick={() => downloadReport(String(r.report_html ?? ''), company)}>تنزيل التقرير (افتحه واطبعه PDF)</button>
      </div>
      {showReport && <ReportFrame html={String(r.report_html ?? '')} />}
    </div>
  );
}
