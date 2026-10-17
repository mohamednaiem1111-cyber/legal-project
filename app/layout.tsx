import type { Metadata } from 'next';
import { Cairo } from 'next/font/google';
import './globals.css';
import Shell from '@/components/Shell';

const cairo = Cairo({ subsets: ['arabic', 'latin'], weight: ['400', '500', '600', '700', '800'], display: 'swap', variable: '--font-ar' });

export const metadata: Metadata = {
  title: 'MA\'At AI | ماعت',
  description: 'فحص امتثال سياسات الخصوصية لقانون حماية البيانات الشخصية المصري 151 لسنة 2020',
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="rtl">
      <body className={cairo.variable}>
        <Shell>{children}</Shell>
      </body>
    </html>
  );
}
