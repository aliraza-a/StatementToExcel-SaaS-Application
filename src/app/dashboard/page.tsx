'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  FileSpreadsheet,
  Download,
  Trash2,
  Sparkles,
  Crown,
  Clock,
  ArrowLeft,
  FileText,
  Eye,
  PlusCircle,
  CheckCircle2,
} from 'lucide-react';
import { Navbar } from '@/components/navbar';
import { PricingModal } from '@/components/pricing-modal';
import { AuthModal } from '@/components/auth-modal';
import { PreviewTable } from '@/components/preview-table';
import { createClient } from '@/lib/supabase/client';
import { Conversion, Profile } from '@/types/database';
import { createExcelWorkbook, generateCsvString } from '@/lib/engine/excel-generator';
import * as XLSX from 'xlsx';

export default function DashboardPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [conversions, setConversions] = useState<Conversion[]>([]);
  const [loading, setLoading] = useState(true);
  const [isPricingOpen, setIsPricingOpen] = useState(false);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [selectedConversion, setSelectedConversion] = useState<Conversion | null>(null);
  const [paymentSuccessNotice, setPaymentSuccessNotice] = useState(false);

  useEffect(() => {
    // Check if redirected with ?payment=success
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('payment') === 'success') {
        setPaymentSuccessNotice(true);
        setTimeout(() => setPaymentSuccessNotice(false), 8000);
      }
    }

    const supabase = createClient();

    async function loadDashboardData() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          router.push('/');
          return;
        }

        // Fetch Profile
        const { data: profileData } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();

        if (profileData) {
          setProfile(profileData as Profile);
        }

        // Fetch Conversions
        const { data: convData, error: convErr } = await supabase
          .from('conversions')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        if (!convErr && convData) {
          setConversions(convData as Conversion[]);
        }
      } catch (err) {
        console.error('Error loading dashboard:', err);
      } finally {
        setLoading(false);
      }
    }

    loadDashboardData();
  }, [router]);

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this conversion record?')) return;

    try {
      const supabase = createClient();
      await supabase.from('conversions').delete().eq('id', id);
      setConversions((prev) => prev.filter((c) => c.id !== id));
      if (selectedConversion?.id === id) {
        setSelectedConversion(null);
      }
    } catch (err) {
      console.error('Failed to delete conversion:', err);
    }
  };

  const handleDownloadExcel = (conv: Conversion) => {
    const txs = conv.extracted_data?.transactions || [];
    const workbook = createExcelWorkbook(txs, conv.file_name);
    const baseName = conv.file_name.replace(/\.[^/.]+$/, '');
    XLSX.writeFile(workbook, `${baseName}_converted.xlsx`);
  };

  const handleDownloadCsv = (conv: Conversion) => {
    const txs = conv.extracted_data?.transactions || [];
    const csvContent = generateCsvString(txs);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const baseName = conv.file_name.replace(/\.[^/.]+$/, '');
    link.setAttribute('href', url);
    link.setAttribute('download', `${baseName}_converted.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const totalPages = conversions.reduce((acc, c) => acc + (c.page_count || 1), 0);
  const totalTransactions = conversions.reduce(
    (acc, c) => acc + (c.extracted_data?.transactions?.length || 0),
    0
  );

  return (
    <div className="min-h-screen flex flex-col bg-neutral-50/50 dark:bg-neutral-950">
      <Navbar
        onOpenAuth={() => setIsAuthOpen(true)}
        onOpenPricing={() => setIsPricingOpen(true)}
      />

      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        {/* Payment Success Alert */}
        {paymentSuccessNotice && (
          <div className="mb-6 p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 flex items-center gap-3 text-emerald-800 dark:text-emerald-300 animate-in fade-in duration-300">
            <CheckCircle2 className="h-5 w-5 text-emerald-600" />
            <div className="text-xs">
              <p className="font-bold">Payment Confirmed!</p>
              <p>Your credits and plan have been refreshed. Happy converting!</p>
            </div>
          </div>
        )}

        {/* Dashboard Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
          <div>
            <div className="flex items-center gap-2">
              <Link
                href="/"
                className="p-1 rounded-lg text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 transition-colors"
                title="Back to Home"
              >
                <ArrowLeft className="h-4 w-4" />
              </Link>
              <h1 className="text-2xl font-black tracking-tight text-neutral-900 dark:text-white">
                Conversion History & Dashboard
              </h1>
            </div>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
              Manage your past bank statements, download Excel and CSV exports, and monitor credits.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm transition-all"
            >
              <PlusCircle className="h-4 w-4" />
              Convert New Statement
            </Link>
          </div>
        </div>

        {/* User Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          {/* Plan & Credits */}
          <div className="p-5 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-sm flex items-center justify-between">
            <div>
              <span className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400">
                Current Plan
              </span>
              <div className="flex items-center gap-2 mt-1">
                {profile?.is_pro ? (
                  <span className="inline-flex items-center gap-1 text-base font-bold text-amber-500">
                    <Crown className="h-4 w-4 fill-amber-500" /> PRO Lifetime
                  </span>
                ) : (
                  <span className="text-base font-bold text-neutral-900 dark:text-white">
                    {profile?.credits_remaining ?? 3} Free Credits
                  </span>
                )}
              </div>
            </div>
            {!profile?.is_pro && (
              <button
                onClick={() => setIsPricingOpen(true)}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-neutral-900 hover:bg-neutral-800 dark:bg-white dark:text-neutral-900 text-white transition-colors"
              >
                Upgrade
              </button>
            )}
          </div>

          {/* Total Processed */}
          <div className="p-5 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-sm">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400">
              Statements Processed
            </span>
            <p className="text-2xl font-black text-neutral-900 dark:text-white mt-1">
              {conversions.length}
            </p>
          </div>

          {/* Total Transactions */}
          <div className="p-5 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-sm">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400">
              Total Extracted Rows
            </span>
            <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
              {totalTransactions}
            </p>
          </div>
        </div>

        {/* Selected Conversion Preview */}
        {selectedConversion && (
          <div className="mb-8 p-4 sm:p-6 rounded-3xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-sm">
            <PreviewTable
              fileName={selectedConversion.file_name}
              initialTransactions={selectedConversion.extracted_data?.transactions || []}
              onReset={() => setSelectedConversion(null)}
            />
          </div>
        )}

        {/* Past Conversions Ledger Table */}
        <div className="overflow-hidden rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-sm">
          <div className="p-4 border-b border-neutral-100 dark:border-neutral-800 flex items-center justify-between">
            <h3 className="text-sm font-bold text-neutral-900 dark:text-white">
              Statement Log
            </h3>
            <span className="text-xs text-neutral-400">
              {conversions.length} records
            </span>
          </div>

          {loading ? (
            <div className="p-12 text-center text-xs text-neutral-400">
              Loading conversion history...
            </div>
          ) : conversions.length === 0 ? (
            <div className="p-12 text-center space-y-3">
              <FileSpreadsheet className="h-10 w-10 text-neutral-300 dark:text-neutral-700 mx-auto" />
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                You haven&apos;t converted any bank statements yet.
              </p>
              <Link
                href="/"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                Upload First Statement
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead className="bg-neutral-50 dark:bg-neutral-800 border-b border-neutral-200 dark:border-neutral-800 text-neutral-600 dark:text-neutral-400">
                  <tr>
                    <th className="py-3 px-4">Document</th>
                    <th className="py-3 px-4">Pages</th>
                    <th className="py-3 px-4">Transactions</th>
                    <th className="py-3 px-4">Converted Date</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                  {conversions.map((c) => {
                    const count = c.extracted_data?.transactions?.length || 0;
                    const dateStr = new Date(c.created_at).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    });

                    return (
                      <tr
                        key={c.id}
                        className="hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors"
                      >
                        <td className="py-3 px-4 font-semibold text-neutral-900 dark:text-white flex items-center gap-2">
                          <FileText className="h-4 w-4 text-emerald-600 shrink-0" />
                          <span className="truncate max-w-xs">{c.file_name}</span>
                        </td>
                        <td className="py-3 px-4 text-neutral-600 dark:text-neutral-400">
                          {c.page_count} {c.page_count === 1 ? 'page' : 'pages'}
                        </td>
                        <td className="py-3 px-4 font-mono text-neutral-600 dark:text-neutral-400">
                          {count} rows
                        </td>
                        <td className="py-3 px-4 text-neutral-500">
                          {dateStr}
                        </td>
                        <td className="py-3 px-4 text-right space-x-2">
                          <button
                            onClick={() => setSelectedConversion(c)}
                            title="Preview & Edit"
                            className="p-1.5 rounded-lg border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300 transition-colors"
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => handleDownloadCsv(c)}
                            title="Download CSV"
                            className="p-1.5 rounded-lg border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300 transition-colors"
                          >
                            <FileText className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => handleDownloadExcel(c)}
                            title="Download Excel (.xlsx)"
                            className="p-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white transition-colors"
                          >
                            <FileSpreadsheet className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => handleDelete(c.id)}
                            title="Delete"
                            className="p-1.5 rounded-lg text-neutral-400 hover:text-red-500 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      <PricingModal
        isOpen={isPricingOpen}
        onClose={() => setIsPricingOpen(false)}
        onRequireAuth={() => setIsPricingOpen(false)}
      />

      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
      />
    </div>
  );
}
