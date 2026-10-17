import Link from 'next/link';
import { IconGrid, IconAlert, IconScan, IconDoc, IconScale } from '@/components/Icons';

export default function Home() {
  return (
    <div className="stack">
      <div className="head">
        <div>
          <div className="eyebrow">مساحة العمل · MA&apos;At AI</div>
          <h1>أهلاً بك في ماعت</h1>
          <p>فحص سياسة الخصوصية مقابل قانون حماية البيانات الشخصية 151 لسنة 2020 ولائحته التنفيذية 816 لسنة 2025.</p>
        </div>
      </div>

      <div className="grid2">
        <div className="card gold">
          <h2 style={{ display: 'flex', gap: 8, alignItems: 'center' }}><IconGrid size={22} />غرفة العمليات والتدقيق</h2>
          <p>ارفع ملف PDF أو الصق نص السياسة. النتيجة: درجة الامتثال، المحاور التسعة، الفجوات، ونطاق الغرامات وتقدير التصالح (م 49).</p>
          <Link className="btn" href="/audit">ابدأ التدقيق</Link>
        </div>
        <div className="card red">
          <h2 style={{ display: 'flex', gap: 8, alignItems: 'center' }}><IconAlert size={22} />مسار طوارئ: اختراق بيانات</h2>
          <p>احسب مهلة الـ 72 ساعة لإخطار المركز، وموعد إخطار أصحاب البيانات، ومسودات الإخطار والبلاغ.</p>
          <Link className="btn" href="/breach">بلاغ اختراق</Link>
        </div>
      </div>

      <div className="grid3">
        <div className="card"><h3 style={{ display: 'flex', gap: 8 }}><IconScan />1. التحليل</h3><p className="hint">الذكاء الاصطناعي يصنّف 39 بنداً محدداً مسبقاً فقط، ولا يحسب أي رقم.</p></div>
        <div className="card"><h3 style={{ display: 'flex', gap: 8 }}><IconScale />2. الحساب</h3><p className="hint">الدرجة والغرامات والخطر تُحسب بكود ثابت من المصفوفة القانونية.</p></div>
        <div className="card"><h3 style={{ display: 'flex', gap: 8 }}><IconDoc />3. التقرير</h3><p className="hint">تقرير قابل للطباعة ومسودات ROPA وبلاغ الاختراق، ولا نحفظ نص السياسة.</p></div>
      </div>
    </div>
  );
}
