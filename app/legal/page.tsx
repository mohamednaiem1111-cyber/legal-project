import { IconScale, IconShield } from '@/components/Icons';

const AXES = [
  'مشروعية المعالجة وضوابط الموافقة',
  'ممارسة حقوق الشخص المعني',
  'التزامات المتحكم والمعالج وسجل الأنشطة (ROPA)',
  'التراخيص والتصاريح والتمثيل القانوني',
  'الإخطار بالخرق الأمني (مسار 72 ساعة)',
  'مسؤول حماية البيانات (DPO)',
  'البيانات الحساسة وبيانات الأطفال',
  'نقل البيانات عبر الحدود',
  'التسويق الإلكتروني المباشر',
];

export default function LegalPage() {
  return (
    <div className="stack">
      <div className="head">
        <div>
          <div className="eyebrow">مساحة العمل / الإطار القانوني</div>
          <h1 style={{ display: 'flex', gap: 10, alignItems: 'center' }}><IconScale size={28} />الإطار القانوني</h1>
          <p>المراجع التي يعتمد عليها التدقيق، وكيف تُستخدم داخل النظام.</p>
        </div>
      </div>

      <div className="alert warn" style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <IconShield size={18} />المصفوفة القانونية (الأوزان والغرامات) قيد المراجعة من المحامي المسؤول؛ لذلك تظهر النتائج «استرشادية» إلى حين الاعتماد.
      </div>

      <div className="grid3">
        <div className="card"><h3>القانون 151 لسنة 2020</h3><p className="hint">قانون حماية البيانات الشخصية: أساس المحاور التسعة وبنود الفحص ومواد العقوبات.</p></div>
        <div className="card"><h3>اللائحة التنفيذية 816 لسنة 2025</h3><p className="hint">قرار وزير الاتصالات وتكنولوجيا المعلومات بإصدار اللائحة التنفيذية للقانون.</p></div>
        <div className="card"><h3>القانون 175 لسنة 2018</h3><p className="hint">مكافحة جرائم تقنية المعلومات: يُفحص منه بند حفظ السجلات 180 يوماً لمقدمي الخدمة فقط، بمسار مستقل عن تصالح المادة 49.</p></div>
      </div>

      <div className="card">
        <h2>المحاور التسعة للتدقيق</h2>
        <ol style={{ margin: 0, paddingInlineStart: 22, lineHeight: 2 }}>
          {AXES.map((a) => <li key={a}>{a}</li>)}
        </ol>
        <p className="hint" style={{ marginTop: 12 }}>الذكاء الاصطناعي يصنّف بنود كل محور فقط؛ الدرجة والغرامات ومستوى الخطر تُحسب بكود ثابت. وأي اقتباس لا يوجد حرفياً في السياسة يُخفَّض إلى «لا يمكن الحكم».</p>
      </div>
    </div>
  );
}
