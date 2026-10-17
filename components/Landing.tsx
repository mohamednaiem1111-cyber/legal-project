'use client';
// Public landing page (visible without login) - matches the team's approved design.
import Logo from './Logo';
import { IconGrid, IconScan, IconDoc, IconScale, IconShield } from './Icons';

const FEATURES = [
  { icon: <IconGrid size={26} />, title: 'غرفة العمليات الذكية', text: 'تحليل السياسة على مراحل واضحة مع تقدّم مباشر.' },
  { icon: <IconScan size={26} />, title: 'تدقيق شامل على 9 محاور', text: 'بنود محددة مسبقاً، والذكاء الاصطناعي يصنّف فقط ولا يحسب الأرقام.' },
  { icon: <IconDoc size={26} />, title: 'تقرير ومسودات', text: 'تقرير قابل للطباعة ومسودة سجل المعالجة (ROPA) ومسودات بلاغ الاختراق.' },
  { icon: <IconScale size={26} />, title: 'الغرامات والمسؤولية', text: 'نطاق الغرامات وحاسبة التصالح (م 49) للمراجعة القانونية.' },
];

export default function Landing({ onLogin }: { onLogin: () => void }) {
  return (
    <div className="public">
      <header className="pubnav">
        <div className="brand" style={{ padding: 0 }}>
          <Logo size={42} />
          <div><b>MA&apos;At<i>AI</i></b><small>Legal Intelligence</small></div>
        </div>
        <nav>
          <a href="#top">الرئيسية</a>
          <a href="#features">الخدمات</a>
          <button className="btn small" onClick={onLogin}>تسجيل الدخول</button>
        </nav>
      </header>

      <div id="top" style={{ padding: '18px 40px 0', textAlign: 'center' }}>
        <div className="refs">
          <IconShield size={16} />
          <span>الإطار المصري لحماية البيانات الشخصية</span>·<b>القانون 151 / 2020</b>·<b>اللائحة التنفيذية 816 / 2025</b>
        </div>
      </div>

      <section className="hero">
        <div>
          <div className="eyebrow">الذكاء القانوني المصري · MA&apos;At AI</div>
          <h1>ماعت AI — ميزان حماية البيانات الشخصية والامتثال الرقابي</h1>
          <p className="lead">
            أداة لتدقيق سياسات الخصوصية في الشركات وفق أحكام القانون رقم 151 لسنة 2020 ولائحته التنفيذية رقم 816 لسنة 2025،
            مع حساب مهل بلاغ الاختراق (72 ساعة) وتقدير الغرامات للمراجعة القانونية.
          </p>
          <div className="cta">
            <button className="btn" onClick={onLogin}>الدخول إلى غرفة العمليات ←</button>
            <button className="btn ghost" onClick={onLogin}>بدء تدقيق جديد</button>
          </div>
        </div>
        <div className="seal">
          <Logo size={190} />
          <b style={{ color: 'var(--ink)' }}>الخصوصية · البيانات · الثقة</b>
          <span>الإطار المصري لحماية البيانات الشخصية</span>
        </div>
      </section>

      <section id="features" className="features">
        {FEATURES.map((f) => (
          <div className="feature" key={f.title}>{f.icon}<h3>{f.title}</h3><p>{f.text}</p></div>
        ))}
      </section>

      <p className="disclaimer">النتائج استرشادية وتحتاج مراجعة محامٍ مختص قبل الاعتماد. لا نحفظ نص السياسة، نحفظ ملخص النتيجة فقط.</p>

      <footer className="pubfoot">
        <span>MA&apos;At AI © 2026 — مشروع تخرج ضمن مبادرة رواد مصر الرقمية (DEPI)</span>
        <span>بيانات شخصية · مبادئ مصونة</span>
      </footer>
    </div>
  );
}
