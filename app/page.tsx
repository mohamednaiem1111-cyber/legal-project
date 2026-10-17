import Link from 'next/link';

export default function Home() {
  return (
    <div className="stack">
      <div className="head">
        <div>
          <h1>أهلاً بك في ماعت</h1>
          <p>فحص سياسة الخصوصية مقابل قانون حماية البيانات الشخصية 151 لسنة 2020 ولائحته التنفيذية 816 لسنة 2025.</p>
        </div>
      </div>
      <div className="grid2">
        <div className="card">
          <h2>غرفة التدقيق</h2>
          <p>ارفع ملف PDF أو الصق نص السياسة. النتيجة: درجة الامتثال، المحاور التسعة، الفجوات، والغرامات المحتملة.</p>
          <Link className="btn" href="/audit">ابدأ الفحص</Link>
        </div>
        <div className="card red">
          <h2>مسار طوارئ: اختراق بيانات</h2>
          <p>احسب مهلة الـ 72 ساعة لإخطار المركز، وموعد إخطار أصحاب البيانات، ومسودات الإخطار والبلاغ.</p>
          <Link className="btn" href="/breach">بلاغ اختراق</Link>
        </div>
      </div>
      <div className="alert warn">النتائج استرشادية وتحتاج مراجعة محامٍ مختص قبل الاعتماد. لا نحفظ نص السياسة، نحفظ ملخص النتيجة فقط.</div>
    </div>
  );
}
