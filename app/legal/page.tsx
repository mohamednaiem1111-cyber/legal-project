'use client';
import { useI18n } from '@/lib/i18n';
import { IconScale, IconShield } from '@/components/Icons';

const AXES: [string, string][] = [
  ['مشروعية المعالجة وضوابط الموافقة', 'Lawfulness of processing and consent'],
  ['ممارسة حقوق الشخص المعني', 'Exercise of data-subject rights'],
  ['التزامات المتحكم والمعالج وسجل الأنشطة (ROPA)', 'Controller/processor duties and the record of processing (ROPA)'],
  ['التراخيص والتصاريح والتمثيل القانوني', 'Licences, permits and legal representation'],
  ['الإخطار بالخرق الأمني (مسار 72 ساعة)', 'Breach notification (72-hour path)'],
  ['مسؤول حماية البيانات (DPO)', 'Data protection officer (DPO)'],
  ['البيانات الحساسة وبيانات الأطفال', 'Sensitive data and children\'s data'],
  ['نقل البيانات عبر الحدود', 'Cross-border data transfers'],
  ['التسويق الإلكتروني المباشر', 'Direct electronic marketing'],
];

export default function LegalPage() {
  const { tr, lang } = useI18n();
  return (
    <div className="stack">
      <div className="head">
        <div>
          <div className="eyebrow">{tr('مساحة العمل / الإطار القانوني', 'Workspace / Legal framework')}</div>
          <h1 style={{ display: 'flex', gap: 10, alignItems: 'center' }}><IconScale size={28} />{tr('الإطار القانوني', 'Legal framework')}</h1>
          <p>{tr('المراجع التي يعتمد عليها التدقيق، وكيف تُستخدم داخل النظام.', 'The references the audit relies on and how they are used inside the system.')}</p>
        </div>
      </div>

      <div className="alert warn" style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <IconShield size={18} />{tr('المصفوفة القانونية (الأوزان والغرامات) قيد المراجعة من المحامي المسؤول؛ لذلك تظهر النتائج «استرشادية» إلى حين الاعتماد.', 'The legal matrix (weights and fines) is under review by the responsible lawyer, so results are shown as "advisory" until it is approved.')}
      </div>

      <div className="grid3">
        <div className="card"><h3>{tr('القانون 151 لسنة 2020', 'Law 151 of 2020')}</h3><p className="hint">{tr('قانون حماية البيانات الشخصية: أساس المحاور التسعة وبنود الفحص ومواد العقوبات.', 'The Personal Data Protection Law: the basis of the nine axes, the checklist items and the penalty articles.')}</p></div>
        <div className="card"><h3>{tr('اللائحة التنفيذية 816 لسنة 2025', 'Executive Regulation 816 of 2025')}</h3><p className="hint">{tr('قرار وزير الاتصالات وتكنولوجيا المعلومات بإصدار اللائحة التنفيذية للقانون.', 'The Minister of Communications and IT decree issuing the law\'s executive regulation.')}</p></div>
        <div className="card"><h3>{tr('القانون 175 لسنة 2018', 'Law 175 of 2018')}</h3><p className="hint">{tr('مكافحة جرائم تقنية المعلومات: يُفحص منه بند حفظ السجلات 180 يوماً لمقدمي الخدمة فقط، بمسار مستقل عن تصالح المادة 49.', 'Anti-cybercrime law: only the 180-day log-retention duty is checked, for service providers only, on a path separate from the Article 49 settlement.')}</p></div>
      </div>

      <div className="card">
        <h2>{tr('المحاور التسعة للتدقيق', 'The nine audit axes')}</h2>
        <ol style={{ margin: 0, paddingInlineStart: 22, lineHeight: 2 }}>
          {AXES.map(([ar, en]) => <li key={ar}>{lang === 'ar' ? ar : en}</li>)}
        </ol>
        <p className="hint" style={{ marginTop: 12 }}>{tr('الذكاء الاصطناعي يصنّف بنود كل محور فقط؛ الدرجة والغرامات ومستوى الخطر تُحسب بكود ثابت. وأي اقتباس لا يوجد حرفياً في السياسة يُخفَّض إلى «لا يمكن الحكم».', 'The AI only classifies each axis\'s items; the score, fines and risk level are computed by fixed code. Any quote not found word for word in the policy is downgraded to "not determinable".')}</p>
      </div>
    </div>
  );
}
