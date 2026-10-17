'use client';
// Public landing page (visible without login) - matches the team's approved design.
import { useI18n, LangToggle } from '@/lib/i18n';
import Logo from './Logo';
import { IconGrid, IconScan, IconDoc, IconScale, IconShield } from './Icons';

export default function Landing({ onLogin }: { onLogin: () => void }) {
  const { tr } = useI18n();
  const FEATURES = [
    { icon: <IconGrid size={26} />, title: tr('غرفة العمليات الذكية', 'Smart operations room'), text: tr('تحليل السياسة على مراحل واضحة مع تقدّم مباشر.', 'The policy is analysed in clear stages with live progress.') },
    { icon: <IconScan size={26} />, title: tr('تدقيق شامل على 9 محاور', 'Nine-axis audit'), text: tr('بنود محددة مسبقاً، والذكاء الاصطناعي يصنّف فقط ولا يحسب الأرقام.', 'A fixed checklist: the AI only classifies, it never computes the numbers.') },
    { icon: <IconDoc size={26} />, title: tr('تقرير ومسودات', 'Report & drafts'), text: tr('تقرير قابل للطباعة ومسودة سجل المعالجة (ROPA) ومسودات بلاغ الاختراق.', 'A printable report, a draft record of processing (ROPA) and breach-notification drafts.') },
    { icon: <IconScale size={26} />, title: tr('الغرامات والمسؤولية', 'Fines & liability'), text: tr('نطاق الغرامات وحاسبة التصالح (م 49) للمراجعة القانونية.', 'Fine ranges and the Article 49 settlement estimate, for legal review.') },
  ];
  return (
    <div className="public">
      <header className="pubnav">
        <div className="brand" style={{ padding: 0 }}>
          <Logo size={42} />
          <div><b>MA&apos;At<i>AI</i></b><small>Legal Intelligence</small></div>
        </div>
        <nav>
          <a href="#top">{tr('الرئيسية', 'Home')}</a>
          <a href="#features">{tr('الخدمات', 'Services')}</a>
          <LangToggle />
          <button className="btn small" onClick={onLogin}>{tr('تسجيل الدخول', 'Sign in')}</button>
        </nav>
      </header>

      <div id="top" style={{ padding: '18px 40px 0', textAlign: 'center' }}>
        <div className="refs">
          <IconShield size={16} />
          <span>{tr('الإطار المصري لحماية البيانات الشخصية', 'Egyptian personal-data protection framework')}</span>·
          <b>{tr('القانون 151 / 2020', 'Law 151 / 2020')}</b>·<b>{tr('اللائحة التنفيذية 816 / 2025', 'Executive Regulation 816 / 2025')}</b>
        </div>
      </div>

      <section className="hero">
        <div>
          <div className="eyebrow">{tr('الذكاء القانوني المصري · MA\'At AI', 'Egyptian legal intelligence · MA\'At AI')}</div>
          <h1>{tr('ماعت AI — ميزان حماية البيانات الشخصية والامتثال الرقابي', 'MA\'At AI — a scale for personal-data protection and regulatory compliance')}</h1>
          <p className="lead">
            {tr(
              'أداة لتدقيق سياسات الخصوصية في الشركات وفق أحكام القانون رقم 151 لسنة 2020 ولائحته التنفيذية رقم 816 لسنة 2025، مع حساب مهل بلاغ الاختراق (72 ساعة) وتقدير الغرامات للمراجعة القانونية.',
              'A tool that audits companies\' privacy policies against Law 151 of 2020 and its Executive Regulation 816 of 2025, computes breach-notification deadlines (72 hours) and estimates fines for legal review.',
            )}
          </p>
          <div className="cta">
            <button className="btn" onClick={onLogin}>{tr('الدخول إلى غرفة العمليات ←', 'Enter the operations room →')}</button>
            <button className="btn ghost" onClick={onLogin}>{tr('بدء تدقيق جديد', 'Start a new audit')}</button>
          </div>
        </div>
        <div className="seal">
          <Logo size={190} />
          <b style={{ color: 'var(--ink)' }}>{tr('الخصوصية · البيانات · الثقة', 'Privacy · Data · Trust')}</b>
          <span>{tr('الإطار المصري لحماية البيانات الشخصية', 'Egyptian personal-data protection framework')}</span>
        </div>
      </section>

      <section id="features" className="features">
        {FEATURES.map((f) => (
          <div className="feature" key={f.title}>{f.icon}<h3>{f.title}</h3><p>{f.text}</p></div>
        ))}
      </section>

      <p className="disclaimer">{tr('النتائج استرشادية وتحتاج مراجعة محامٍ مختص قبل الاعتماد. لا نحفظ نص السياسة، نحفظ ملخص النتيجة فقط.', 'Results are advisory and need review by a qualified lawyer. We do not store the policy text, only a summary of the result.')}</p>

      <footer className="pubfoot">
        <span>{tr('MA\'At AI © 2026 — مشروع تخرج ضمن مبادرة رواد مصر الرقمية (DEPI)', 'MA\'At AI © 2026 — a graduation project of the Digital Egypt Pioneers Initiative (DEPI)')}</span>
        <span>{tr('بيانات شخصية · مبادئ مصونة', 'Personal data · protected principles')}</span>
      </footer>
    </div>
  );
}
