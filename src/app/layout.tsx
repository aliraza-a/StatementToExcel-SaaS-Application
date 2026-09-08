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
  title: 'StatementToExcel - Convert Bank Statements to Excel & CSV in Seconds',
  description:
    'Extract tabular bank statements, invoices, and credit card PDF records directly into clean, standardized 5-column Excel (.xlsx) and CSV files with 99.8% accuracy.',
  keywords: [
    'bank statement to excel',
    'convert pdf statement to excel',
    'bank statement converter',
    'pdf to csv bank statement',
    'ai statement parser',
    'extract transactions from pdf',
    'credit card statement converter',
  ],
  authors: [{ name: 'StatementToExcel' }],
  creator: 'StatementToExcel',
  openGraph: {
    title: 'StatementToExcel - Bank Statement to Excel & CSV Converter',
    description:
      'Extract tabular bank statements, invoices, and credit card PDF records directly into clean, standardized 5-column Excel (.xlsx) and CSV files.',
    url: 'https://statementtoexcel.com',
    siteName: 'StatementToExcel',
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'StatementToExcel - Bank Statement to Excel Converter',
    description:
      'Instant AI-powered bank statement and invoice conversion to clean Excel and CSV tables.',
  },
  robots: {
    index: true,
    follow: true,
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
