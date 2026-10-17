'use client';
import { useState } from 'react';
import type { Json } from '@/lib/api';
import { useI18n } from '@/lib/i18n';
import ReportFrame, { downloadReport } from './ReportFrame';

const STATUS: Record<string, [string, string]> = {
  'Compliant': ['مستوفى', 'Compliant'], 'Partially Compliant': ['مستوفى جزئياً', 'Partially compliant'], 'Non-Compliant': ['غير مستوفى', 'Non-compliant'],
  'Not Applicable': ['غير منطبق', 'Not applicable'], 'Not Determinable': ['لا يمكن الحكم', 'Not determinable'],
};
const riskClass = (r: string) => ({ Low: 'low', Medium: 'medium', High: 'high', Critical: 'high' } as Record<string, string>)[r] ?? 'unknown';
const RISK_EN: Record<string, string> = { Low: 'Low', Medium: 'Medium', High: 'High', Critical: 'Critical' };

export default function AuditResult({ r, company }: { r: Json; company: string }) {
  const { tr, lang } = useI18n();
  const [showReport, setShowReport] = useState(false);
  const egp = (n: unknown) => (typeof n === 'number' ? n.toLocaleString('en-US') + tr(' ج.م', ' EGP') : '—');

  if (r.exempt) {
    return <div className="alert ok" dir="auto">{r.message}<br /><small>{r.note}</small></div>;
  }

  const st = r.statistics ?? {};
  const axes: Json[] = Array.isArray(r.axes) ? r.axes : [];
  const violations: Json[] = Array.isArray(r.violations) ? r.violations : [];
  const fines = r.law_151_fines ?? {};
  const cyber = r.cyber_175 ?? {};
  const cyberStatus = STATUS[cyber.status] ? STATUS[cyber.status][lang === 'ar' ? 0 : 1] : cyber.status;

  return (
    <div className="stack">
      <div>
        <div className="eyebrow">{tr('نتائج التدقيق والتقارير الرقابية', 'Audit results and regulatory reports')}</div>
        <h2 style={{ fontSize: 24 }}>{tr('نتيجة تدقيق: ', 'Audit result: ')}<span dir="auto">{company || tr('الشركة', 'the company')}</span></h2>
      </div>
      {lang === 'en' && <div className="alert warn">Analysis content (axis names, gaps, penalties and corrective actions) is generated in Arabic, the language of the law. An English version of the legal matrix needs a lawyer-approved translation.</div>}
      {r.legal_review_status === 'PENDING_LAWYER_REVIEW' && (
        <div className="alert warn">{tr('نتيجة استرشادية: المصفوفة القانونية لم تُعتمد من المحامي بعد.', 'Advisory result: the legal matrix has not been approved by the lawyer yet.')}</div>
      )}
      {r.confidence === 'low' && <div className="alert warn">{tr('ثقة منخفضة: بنود كثيرة لا يمكن الحكم عليها من نص السياسة وحده.', 'Low confidence: many items cannot be judged from the policy text alone.')}</div>}
      {r.truncated && <div className="alert warn">{tr('المستند طويل، فتم فحص الجزء الأول منه فقط.', 'The document is long, so only its first part was audited.')}</div>}
      {r.saved === false && <div className="alert warn">{tr('النتيجة ظهرت لكن لم تُحفظ في السجل.', 'The result is shown but was not saved to your history.')}</div>}

      <div className="grid4">
        <div className="card stat"><b>{r.compliance_score === null || r.compliance_score === undefined ? '—' : `${r.compliance_score}%`}</b><span>{tr('مؤشر الامتثال', 'Compliance index')}</span></div>
        <div className="card stat"><b>{st.non_compliant ?? 0}</b><span>{tr('بند غير مستوفى', 'Non-compliant items')}</span></div>
        <div className="card stat"><b>{st.not_determinable ?? 0}</b><span>{tr('بند لا يمكن الحكم عليه', 'Items not determinable')}</span></div>
        <div className="card stat"><b><span className={`pill ${riskClass(r.risk_level)}`}>{lang === 'ar' ? (r.risk_level_ar ?? r.risk_level) : (RISK_EN[r.risk_level] ?? r.risk_level)}</span></b><span>{tr('مستوى الخطر', 'Risk level')}</span></div>
      </div>

      <div className="card">
        <h2>{tr('المحاور التسعة', 'The nine axes')}</h2>
        <div className="tablewrap">
          <table>
            <thead><tr><th>#</th><th>{tr('المحور', 'Axis')}</th><th>{tr('الوزن', 'Weight')}</th><th>{tr('النسبة', 'Percent')}</th><th>{tr('مستوفى / جزئي / غير مستوفى', 'Compliant / partial / non-compliant')}</th></tr></thead>
            <tbody>
              {axes.map((a) => (
                <tr key={a.id}>
                  <td>{a.id}</td><td dir="auto">{a.name}</td><td>{a.weight}%</td>
                  <td>{a.axis_percent === null || a.axis_percent === undefined ? '—' : `${a.axis_percent}%`}</td>
                  <td>{a.counts?.compliant ?? 0} / {a.counts?.partial ?? 0} / {a.counts?.non ?? 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card">
        <h2>{tr('جدول المخاطر والإجراءات المقترحة', 'Risk table and suggested actions')}</h2>
        {violations.length === 0 ? <p>{tr('لا توجد مخالفات مؤكدة.', 'No confirmed violations.')}</p> : (
          <div className="tablewrap">
            <table>
              <thead><tr><th>{tr('المادة', 'Article')}</th><th>{tr('وصف الفجوة', 'Gap')}</th><th>{tr('العقوبة', 'Penalty')}</th><th>{tr('الإجراء المقترح', 'Suggested action')}</th></tr></thead>
              <tbody>
                {violations.map((v, i) => (
                  <tr key={i}><td className="nowrap" dir="auto">{v.legal_article}</td><td dir="auto">{v.violation}</td><td className="nowrap" dir="auto">{v.penalty}</td><td dir="auto">{v.corrective_action || '—'}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="grid2">
        <div className="card gold">
          <h3>{tr('حاسبة التصالح الجنائي | المادة 49', 'Criminal settlement calculator | Article 49')}</h3>
          <p>{tr('نطاق الغرامات: ', 'Fine range: ')}{egp(fines.total_min_fine)} {tr('إلى', 'to')} {egp(fines.total_max_fine)}</p>
          <p>{tr('قيمة التصالح المقدّرة: ', 'Estimated settlement: ')}<b>{egp(r.settlement_art49)}</b></p>
          <p className="hint" dir="auto">{fines.settlement_art49?.formula}</p>
        </div>
        <div className="card red">
          <h3>{tr('القانون 175 لسنة 2018 (مسار مستقل)', 'Law 175 of 2018 (separate path)')}</h3>
          {cyber.applicable
            ? <p>{tr('حالة حفظ السجلات 180 يوماً: ', '180-day log-retention status: ')}<b>{cyberStatus}</b>{tr('. الغرامة المحتملة ', '. Possible fine ')}{egp(cyber.fine_min)} {tr('إلى', 'to')} {egp(cyber.fine_max)}{tr('، ولا يشملها تصالح المادة 49.', ', not covered by the Article 49 settlement.')}</p>
            : <p>{tr('لا ينطبق (الجهة ليست مقدّم خدمة اتصالات أو إنترنت).', 'Not applicable (the entity is not a telecom or internet service provider).')}</p>}
        </div>
      </div>

      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        <button className="btn" onClick={() => setShowReport((s) => !s)}>{showReport ? tr('إخفاء التقرير الكامل', 'Hide the full report') : tr('عرض التقرير الكامل', 'Show the full report')}</button>
        <button className="btn ghost" onClick={() => downloadReport(String(r.report_html ?? ''), company)}>{tr('تنزيل التقرير (افتحه واطبعه PDF)', 'Download the report (open it and print to PDF)')}</button>
      </div>
      {showReport && <ReportFrame html={String(r.report_html ?? '')} />}
    </div>
  );
}
