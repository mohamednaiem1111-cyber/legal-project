'use client';
import { useEffect, useState } from 'react';
import { listMyAudits, type Json } from '@/lib/api';

export default function HistoryPage() {
  const [rows, setRows] = useState<Json[] | null>(null);
  const [error, setError] = useState('');
  const [open, setOpen] = useState<string | null>(null);

  useEffect(() => {
    listMyAudits().then(({ data, error }) => {
      if (error) setError('تعذر تحميل السجل.');
      else setRows(data ?? []);
    });
  }, []);

  return (
    <div className="stack">
      <div className="head"><div><h1>سجل الفحوصات</h1><p>آخر 50 فحص قمت بها. لا يظهر لك فحوصات غيرك.</p></div></div>
      {error && <div className="alert err">{error}</div>}
      {!rows && !error && <span className="spin" />}
      {rows && rows.length === 0 && <div className="card">لا توجد فحوصات بعد.</div>}
      {rows && rows.length > 0 && (
        <div className="card tablewrap">
          <table>
            <thead><tr><th>التاريخ</th><th>الشركة</th><th>الدرجة</th><th>مستوى الخطر</th></tr></thead>
            <tbody>
              {rows.map((row) => {
                const id = String(row.id);
                const axes: Json[] = row.audit_result?.axes ?? [];
                return [
                  <tr key={id} className="click" onClick={() => setOpen(open === id ? null : id)}>
                    <td>{new Date(row.created_at).toLocaleString('ar-EG', { dateStyle: 'medium', timeStyle: 'short' })}</td>
                    <td>{row.company_name}</td>
                    <td>{row.compliance_score === null ? '—' : `${row.compliance_score}%`}</td>
                    <td>{row.risk_level}</td>
                  </tr>,
                  open === id && (
                    <tr key={id + '-d'}>
                      <td colSpan={4}>
                        {axes.length === 0 ? 'لا توجد تفاصيل.' : (
                          <table>
                            <thead><tr><th>المحور</th><th>الوزن</th><th>النسبة</th><th>مخالفة؟</th></tr></thead>
                            <tbody>{axes.map((a) => (
                              <tr key={a.id}><td>{a.id}</td><td>{a.weight}%</td><td>{a.percent ?? '—'}{a.percent !== null && a.percent !== undefined ? '%' : ''}</td><td>{a.has_violation ? 'نعم' : 'لا'}</td></tr>
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
