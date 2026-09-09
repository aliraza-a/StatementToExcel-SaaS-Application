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
  metadataBase: new URL('https://statementtoexcel.com'),
  title: 'StatementToExcel - Convert Bank Statements to Excel & CSV in Seconds',
  description:
    'Extract tabular bank statements, invoices, and credit card PDF records directly into clean, standardized 5-column Excel (.xlsx) and CSV files with 99.8% accuracy using AI.',
  keywords: [
    'bank statement to excel',
    'convert pdf statement to excel',
    'bank statement converter',
    'pdf to csv bank statement',
    'ai statement parser',
    'extract transactions from pdf',
    'credit card statement converter',
    'finance automation',
    'pdf to spreadsheet'
  ],
  authors: [{ name: 'StatementToExcel', url: 'https://statementtoexcel.com' }],
  creator: 'StatementToExcel',
  publisher: 'StatementToExcel',
  applicationName: 'StatementToExcel',
  openGraph: {
    title: 'StatementToExcel - Bank Statement to Excel & CSV Converter',
    description:
      'Extract tabular bank statements, invoices, and credit card PDF records directly into clean, standardized 5-column Excel (.xlsx) and CSV files.',
    url: 'https://statementtoexcel.com',
    siteName: 'StatementToExcel',
    locale: 'en_US',
    type: 'website',
    images: [
      {
        url: '/og-image.png', // Fallback if no specific OG image is added yet
        width: 1200,
        height: 630,
        alt: 'StatementToExcel Preview',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'StatementToExcel - Bank Statement to Excel Converter',
    description:
      'Instant AI-powered bank statement and invoice conversion to clean Excel and CSV tables.',
    creator: '@statementtoexcel',
    images: ['/og-image.png'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  alternates: {
    canonical: 'https://statementtoexcel.com',
  },
};

import { PaddleLoader } from '@/components/paddle-loader';

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col font-sans bg-neutral-50 dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100">
        <PaddleLoader />
        {children}
      </body>
    </html>
  );
}
