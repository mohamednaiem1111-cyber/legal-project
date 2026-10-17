'use client';
import { useEffect, useState } from 'react';
import { listMyAudits, deleteMyAudits, type Json } from '@/lib/api';
import { useI18n } from '@/lib/i18n';

export default function HistoryPage() {
  const { tr, lang } = useI18n();
  const [rows, setRows] = useState<Json[] | null>(null);
  const [error, setError] = useState(false);
  const [open, setOpen] = useState<string | null>(null);

  useEffect(() => {
    listMyAudits().then(({ data, error }) => {
      if (error) setError(true);
      else setRows(data ?? []);
    });
  }, []);

  return (
    <div className="stack">
      <div className="head">
        <div>
          <div className="eyebrow">{tr('مساحة العمل / سجل التدقيق', 'Workspace / Audit history')}</div>
          <h1>{tr('سجل التدقيق', 'Audit history')}</h1>
          <p>{tr('آخر 50 فحص قمت بها. لا يظهر لك فحوصات غيرك، ولا يُحفظ نص السياسة أو التقرير.', 'Your last 50 audits. You only see your own, and neither the policy text nor the report is stored.')}</p>
        </div>
      </div>
      {rows && rows.length > 0 && (
        <div>
          <button type="button" className="btn ghost small" onClick={async () => {
            if (!window.confirm(tr('حذف سجل التدقيق بالكامل نهائياً؟ لا يمكن التراجع.', 'Permanently delete your whole audit history? This cannot be undone.'))) return;
            const { error: delErr } = await deleteMyAudits();
            if (delErr) setError(true); else { setRows([]); setOpen(null); }
          }}>{tr('حذف سجلي بالكامل', 'Delete my history')}</button>
        </div>
      )}
      {error && <div className="alert err">{tr('تعذر تنفيذ العملية أو تحميل السجل.', 'The operation or loading the history failed.')}</div>}
      {!rows && !error && <span className="spin" />}
      {rows && rows.length === 0 && <div className="card">{tr('لا توجد فحوصات بعد.', 'No audits yet.')}</div>}
      {rows && rows.length > 0 && (
        <div className="card tablewrap">
          <table>
            <thead><tr><th>{tr('التاريخ', 'Date')}</th><th>{tr('الشركة', 'Company')}</th><th>{tr('الدرجة', 'Score')}</th><th>{tr('مستوى الخطر', 'Risk level')}</th></tr></thead>
            <tbody>
              {rows.map((row) => {
                const id = String(row.id);
                const axes: Json[] = row.audit_result?.axes ?? [];
                return [
                  <tr key={id} className="click" onClick={() => setOpen(open === id ? null : id)}>
                    <td>{new Date(row.created_at).toLocaleString(lang === 'ar' ? 'ar-EG' : 'en-GB', { dateStyle: 'medium', timeStyle: 'short' })}</td>
                    <td dir="auto">{row.company_name}</td>
                    <td className="score-chip">{row.compliance_score === null ? '—' : `${row.compliance_score}%`}</td>
                    <td dir="auto">{row.risk_level}</td>
                  </tr>,
                  open === id && (
                    <tr key={id + '-d'}>
                      <td colSpan={4}>
                        {axes.length === 0 ? tr('لا توجد تفاصيل.', 'No details.') : (
                          <table>
                            <thead><tr><th>{tr('المحور', 'Axis')}</th><th>{tr('الوزن', 'Weight')}</th><th>{tr('النسبة', 'Percent')}</th><th>{tr('مخالفة؟', 'Violation?')}</th></tr></thead>
                            <tbody>{axes.map((a) => (
                              <tr key={a.id}><td>{a.id}</td><td>{a.weight}%</td><td>{a.percent ?? '—'}{a.percent !== null && a.percent !== undefined ? '%' : ''}</td><td>{a.has_violation ? tr('نعم', 'Yes') : tr('لا', 'No')}</td></tr>
                            ))}</tbody>
                          </table>
                        )}
                      </td>
                    </tr>
                  ),
                ];
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
