import type { Metadata } from 'next';
import './globals.css';
import Shell from '@/components/Shell';

export const metadata: Metadata = {
  title: 'MA\'At AI | ماعت',
  description: 'فحص امتثال سياسات الخصوصية لقانون حماية البيانات الشخصية المصري 151 لسنة 2020',
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="rtl">
      <body>
        <Shell>{children}</Shell>
      </body>
    </html>
  );
}
