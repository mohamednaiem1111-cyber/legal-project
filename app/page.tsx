'use client';
import Link from 'next/link';
import { useI18n } from '@/lib/i18n';
import { IconGrid, IconAlert, IconScan, IconDoc, IconScale } from '@/components/Icons';

export default function Home() {
  const { tr } = useI18n();
  return (
    <div className="stack">
      <div className="head">
        <div>
          <div className="eyebrow">{tr('مساحة العمل · MA\'At AI', 'Workspace · MA\'At AI')}</div>
          <h1>{tr('أهلاً بك في ماعت', 'Welcome to MA\'At')}</h1>
          <p>{tr('فحص سياسة الخصوصية مقابل قانون حماية البيانات الشخصية 151 لسنة 2020 ولائحته التنفيذية 816 لسنة 2025.', 'Check a privacy policy against the Personal Data Protection Law 151 of 2020 and its Executive Regulation 816 of 2025.')}</p>
        </div>
      </div>

      <div className="grid2">
        <div className="card gold">
          <h2 style={{ display: 'flex', gap: 8, alignItems: 'center' }}><IconGrid size={22} />{tr('غرفة العمليات والتدقيق', 'Operations room & audit')}</h2>
          <p>{tr('ارفع ملف PDF أو الصق نص السياسة. النتيجة: درجة الامتثال، المحاور التسعة، الفجوات، ونطاق الغرامات وتقدير التصالح (م 49).', 'Upload a PDF or paste the policy text. You get the compliance score, the nine axes, the gaps, the fine range and the Article 49 settlement estimate.')}</p>
          <Link className="btn" href="/audit">{tr('ابدأ التدقيق', 'Start an audit')}</Link>
        </div>
        <div className="card red">
          <h2 style={{ display: 'flex', gap: 8, alignItems: 'center' }}><IconAlert size={22} />{tr('مسار طوارئ: اختراق بيانات', 'Emergency path: data breach')}</h2>
          <p>{tr('احسب مهلة الـ 72 ساعة لإخطار المركز، وموعد إخطار أصحاب البيانات، ومسودات الإخطار والبلاغ.', 'Compute the 72-hour deadline to notify the Center, the deadline to notify data subjects, and the notification and police-report drafts.')}</p>
          <Link className="btn" href="/breach">{tr('بلاغ اختراق', 'Breach notice')}</Link>
        </div>
      </div>

      <div className="grid3">
        <div className="card"><h3 style={{ display: 'flex', gap: 8 }}><IconScan />{tr('1. التحليل', '1. Analysis')}</h3><p className="hint">{tr('الذكاء الاصطناعي يصنّف 39 بنداً محدداً مسبقاً فقط، ولا يحسب أي رقم.', 'The AI only classifies 39 fixed checklist items; it never computes a number.')}</p></div>
        <div className="card"><h3 style={{ display: 'flex', gap: 8 }}><IconScale />{tr('2. الحساب', '2. Computation')}</h3><p className="hint">{tr('الدرجة والغرامات والخطر تُحسب بكود ثابت من المصفوفة القانونية.', 'The score, fines and risk level come from fixed code reading the legal matrix.')}</p></div>
        <div className="card"><h3 style={{ display: 'flex', gap: 8 }}><IconDoc />{tr('3. التقرير', '3. Report')}</h3><p className="hint">{tr('تقرير قابل للطباعة ومسودات ROPA وبلاغ الاختراق، ولا نحفظ نص السياسة.', 'A printable report plus ROPA and breach drafts. The policy text is not stored.')}</p></div>
      </div>
    </div>
  );
}
