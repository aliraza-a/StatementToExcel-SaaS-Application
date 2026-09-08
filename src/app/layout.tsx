import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'StatementToExcel - Convert Messy Bank Statements into Clean Excel in 3 Seconds',
  description:
    'Extract tabular bank statements, invoices, and credit card PDF records directly into clean, standardized 5-column Excel (.xlsx) and CSV files with high accuracy.',
  icons: {
    icon: '/favicon.ico',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col font-sans bg-neutral-50 dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100">
        {children}
      </body>
    </html>
  );
}
