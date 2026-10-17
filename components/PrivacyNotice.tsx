'use client';
import { useI18n } from '@/lib/i18n';
import { IconShield } from './Icons';

// Shown before any text leaves the browser. Keep it honest: this is a prototype that uses free-tier services.
export default function PrivacyNotice({ withConsent, agreed, onAgree }: { withConsent?: boolean; agreed?: boolean; onAgree?: (v: boolean) => void }) {
  const { tr } = useI18n();
  return (
    <div className="card soft" style={{ marginBottom: 14, fontSize: 13.5 }}>
      <h3 style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 15 }}><IconShield size={18} />{tr('إشعار الخصوصية', 'Privacy notice')}</h3>
      <ul style={{ margin: '6px 0', paddingInlineStart: 20, lineHeight: 1.9 }}>
        <li>{tr('لا نحفظ نص السياسة ولا التقرير؛ نحفظ ملخص النتيجة فقط (درجات وأرقام محاور) في سجلك.', 'We do not store the policy text or the report; only a result summary (scores and axis numbers) is kept in your history.')}</li>
        <li>{tr('يُرسَل النص مؤقتاً للمعالجة عبر خادم سير العمل (n8n) ونموذج الذكاء الاصطناعي (Google Gemini)، وتُخفى تلقائياً الإيميلات وأرقام الهاتف والأرقام القومية وأرقام البطاقات قبل الإرسال.', 'The text is sent temporarily for processing through the workflow server (n8n) and the AI model (Google Gemini). Emails, phone numbers, national IDs and card numbers are masked automatically before sending.')}</li>
        <li>{tr('هذه نسخة تجريبية تعمل بخدمات مجانية؛ شروط المزوّدين المجانية قد تختلف عن المدفوعة. لا ترفع بيانات أشخاص حقيقيين.', 'This is a prototype running on free services; free-tier provider terms can differ from paid ones. Do not upload real people\'s data.')}</li>
      </ul>
      {withConsent && (
        <label className="check" style={{ marginTop: 6 }}>
          <input type="checkbox" required checked={!!agreed} onChange={(e) => onAgree?.(e.target.checked)} />
          {tr('اطّلعت على إشعار الخصوصية وأوافق على معالجة النص بهذه الطريقة.', 'I have read the privacy notice and agree to the text being processed this way.')}
        </label>
      )}
    </div>
  );
}
