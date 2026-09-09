'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Navbar } from '@/components/navbar';
import { Dropzone } from '@/components/dropzone';
import { PreviewTable } from '@/components/preview-table';
import { AuthModal } from '@/components/auth-modal';
import { PricingModal } from '@/components/pricing-modal';
import { PasswordModal } from '@/components/password-modal';
import { ConversionResult } from '@/types/statement';
import { PRICING_PLANS } from '@/lib/paddle';
import { createClient } from '@/lib/supabase/client';
import {
  FileSpreadsheet,
  CheckCircle2,
  Lock,
  Zap,
  ShieldCheck,
  Table,
  Layers,
  FileCheck,
  Sparkles,
  Crown,
  Check,
  CreditCard,
} from 'lucide-react';

export default function Home() {
  const [conversionResult, setConversionResult] = useState<ConversionResult | null>(null);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [authMessage, setAuthMessage] = useState<string | undefined>();
  const [isPricingOpen, setIsPricingOpen] = useState(false);
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [passwordModalData, setPasswordModalData] = useState<{
    isOpen: boolean;
    fileName: string;
    errorMessage?: string;
    retryFn?: (password: string) => void;
  }>({
    isOpen: false,
    fileName: '',
  });

  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }: any) => {
      setIsLoggedIn(!!data?.user);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event: any, session: any) => {
      setIsLoggedIn(!!session?.user);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const handleRequireAuth = (msg?: string) => {
    setAuthMessage(msg);
    setIsAuthOpen(true);
  };

  const handleRequestPassword = (fileName: string, retryFn: (pwd: string) => void) => {
    setPasswordModalData({
      isOpen: true,
      fileName,
      retryFn,
    });
  };

  const handlePasswordSubmit = (password: string) => {
    if (passwordModalData.retryFn) {
      const fn = passwordModalData.retryFn;
      setPasswordModalData({ isOpen: false, fileName: '' });
      fn(password);
    }
  };

  const handleCheckout = async (planId: string) => {
    setLoadingPlan(planId);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        handleRequireAuth('Please sign in or create an account to complete your purchase.');
        return;
      }

      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId }),
      });

      const resText = await res.text();
      let data: any;
      try {
        data = resText ? JSON.parse(resText) : {};
      } catch {
        throw new Error(`Server returned error (${res.status}): ${resText.slice(0, 100) || res.statusText}`);
      }
      if (!res.ok) {
        throw new Error(data.error || 'Failed to initialize checkout.');
      }

      if (data.url) {
        window.location.href = data.url;
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Checkout failed.';
      alert(msg);
    } finally {
      setLoadingPlan(null);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-neutral-50/50 dark:bg-neutral-950">
      {/* Top Navigation */}
      <Navbar
        onOpenAuth={() => handleRequireAuth()}
        onOpenPricing={() => {
          const el = document.getElementById('pricing');
          if (el) {
            el.scrollIntoView({ behavior: 'smooth' });
          } else {
            setIsPricingOpen(true);
          }
        }}
      />

      {/* Hero Section */}
      <main className="flex-1">
        <section className="relative pt-10 pb-16 sm:pt-14 sm:pb-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
          {/* Subtle Background Glow */}
          <div className="absolute inset-x-0 top-0 -z-10 flex transform-gpu justify-center overflow-hidden blur-3xl">
            <div className="aspect-[1108/632] w-[69.25rem] flex-none bg-gradient-to-r from-emerald-500/20 to-teal-500/10 opacity-40 dark:opacity-20" />
          </div>

          <div className="text-center max-w-3xl mx-auto space-y-4 mb-10">
            {/* Top Pricing & Model Pill */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-neutral-700 dark:text-neutral-300 shadow-xs">
              <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-bold">
                <Sparkles className="h-3.5 w-3.5" />
                Try Free
              </span>
              <span>•</span>
              <span>One-Time $4.99</span>
              <span>•</span>
              <span className="font-bold text-neutral-900 dark:text-white">$29 Lifetime Deal</span>
            </div>

            {/* Main Headline */}
            <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight text-neutral-900 dark:text-white leading-[1.15]">
              Convert Messy Bank Statements into Clean Excel in{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 to-teal-500 dark:from-emerald-400 dark:to-teal-300">
                3 Seconds
              </span>
            </h1>

            {/* Subheading */}
            <p className="text-sm sm:text-base text-neutral-600 dark:text-neutral-400 max-w-2xl mx-auto">
              Stop typing transactions manually. StatementToExcel extracts complex tabular statements directly into standard 5 columns: Date, Description, Debit, Credit, and Balance.
            </p>

            {/* Key Value Bullets */}
            <div className="flex flex-wrap items-center justify-center gap-4 pt-2 text-xs font-medium text-neutral-500 dark:text-neutral-400">
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                Strict 5-Column Standard
              </span>
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                Zero Data Retention (Privacy-First)
              </span>
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                1-Click Excel (.xlsx) & CSV Export
              </span>
            </div>
          </div>

          {/* Interactive Workspace Area: Dropzone or Preview Table */}
          <div className="mt-6">
            {conversionResult ? (
              <PreviewTable
                fileName={conversionResult.fileName}
                initialTransactions={conversionResult.transactions}
                isScanned={conversionResult.isScanned}
                onReset={() => setConversionResult(null)}
              />
            ) : (
              <Dropzone
                onConversionSuccess={(result) => setConversionResult(result)}
                onRequireAuth={handleRequireAuth}
                onRequirePricing={() => {
                  const el = document.getElementById('pricing');
                  if (el) el.scrollIntoView({ behavior: 'smooth' });
                  else setIsPricingOpen(true);
                }}
                onRequestPassword={handleRequestPassword}
                isLoggedIn={isLoggedIn}
              />
            )}
          </div>
        </section>

        {/* How It Works Section */}
        <section id="how-it-works" className="py-16 bg-white dark:bg-neutral-900 border-y border-neutral-200 dark:border-neutral-800">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-xl mx-auto mb-12">
              <h2 className="text-xs uppercase font-bold tracking-wider text-emerald-600 dark:text-emerald-400">
                Simple 3-Step Process
              </h2>
              <p className="text-2xl sm:text-3xl font-extrabold text-neutral-900 dark:text-white mt-1">
                How StatementToExcel Works
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {/* Step 1 */}
              <div className="p-6 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-sm relative">
                <div className="h-10 w-10 rounded-xl bg-emerald-600 text-white font-bold flex items-center justify-center text-sm mb-4">
                  01
                </div>
                <h3 className="text-base font-bold text-neutral-900 dark:text-white">
                  Drop Your PDF Statement
                </h3>
                <p className="text-xs text-neutral-600 dark:text-neutral-400 mt-2 leading-relaxed">
                  Upload native digital PDFs or scanned paper statements up to 20MB. Encrypted statement passwords can be unlocked safely.
                </p>
              </div>

              {/* Step 2 */}
              <div className="p-6 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-sm relative">
                <div className="h-10 w-10 rounded-xl bg-emerald-600 text-white font-bold flex items-center justify-center text-sm mb-4">
                  02
                </div>
                <h3 className="text-base font-bold text-neutral-900 dark:text-white">
                  Intelligent Dual Pipeline
                </h3>
                <p className="text-xs text-neutral-600 dark:text-neutral-400 mt-2 leading-relaxed">
                  Our regex & coordinate table engine parses digital PDFs in milliseconds, with instant Google Gemini Vision fallback for complex scans.
                </p>
              </div>

              {/* Step 3 */}
              <div className="p-6 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-sm relative">
                <div className="h-10 w-10 rounded-xl bg-emerald-600 text-white font-bold flex items-center justify-center text-sm mb-4">
                  03
                </div>
                <h3 className="text-base font-bold text-neutral-900 dark:text-white">
                  Preview, Edit & Export
                </h3>
                <p className="text-xs text-neutral-600 dark:text-neutral-400 mt-2 leading-relaxed">
                  Review the interactive table, edit descriptions or amounts inline, and download formatted `.xlsx` (Excel) or `.csv` files.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Features Comparison */}
        <section id="features" className="py-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
          <div className="text-center max-w-xl mx-auto mb-12">
            <h2 className="text-xs uppercase font-bold tracking-wider text-emerald-600 dark:text-emerald-400">
              Built for Bookkeepers & Auditors
            </h2>
            <p className="text-2xl sm:text-3xl font-extrabold text-neutral-900 dark:text-white mt-1">
              Why generic PDF converters fail
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="p-6 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-sm">
              <Table className="h-6 w-6 text-emerald-600 mb-3" />
              <h4 className="text-sm font-bold text-neutral-900 dark:text-white">
                Multi-Line Memo Stitching
              </h4>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1.5">
                Banks often split transaction payees across multiple lines. Our engine stitches them back into a single clean description row.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-sm">
              <Zap className="h-6 w-6 text-amber-500 mb-3" />
              <h4 className="text-sm font-bold text-neutral-900 dark:text-white">
                Accounting Parentheses & Signs
              </h4>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1.5">
                Correctly parses accounting formatting like (125.00), -45.00, and CR/DR codes into distinct Debit and Credit columns.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-sm">
              <ShieldCheck className="h-6 w-6 text-emerald-600 mb-3" />
              <h4 className="text-sm font-bold text-neutral-900 dark:text-white">
                Zero Data Retention Guarantee
              </h4>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1.5">
                Your bank statements are processed in memory and immediately flushed. Your sensitive financial data is never trained on or sold.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-sm">
              <Lock className="h-6 w-6 text-blue-500 mb-3" />
              <h4 className="text-sm font-bold text-neutral-900 dark:text-white">
                Password Decryption
              </h4>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1.5">
                Securely enter your statement password to convert protected e-statements without having to manually remove passwords first.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-sm">
              <Layers className="h-6 w-6 text-purple-500 mb-3" />
              <h4 className="text-sm font-bold text-neutral-900 dark:text-white">
                Strict 5-Column Schema
              </h4>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1.5">
                No random column splits. Every output is guaranteed: Date, Description, Debit, Credit, and Balance.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-sm">
              <FileCheck className="h-6 w-6 text-emerald-600 mb-3" />
              <h4 className="text-sm font-bold text-neutral-900 dark:text-white">
                SheetJS Native Number Formats
              </h4>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1.5">
                Downloaded `.xlsx` files contain real numeric values, so you can immediately use `=SUM(C2:C50)` and import into QuickBooks or Xero.
              </p>
            </div>
          </div>
        </section>

        {/* Dedicated Prominent On-Page Pricing Section */}
        <section id="pricing" className="py-20 bg-white dark:bg-neutral-900 border-t border-neutral-200 dark:border-neutral-800">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-2xl mx-auto mb-14">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 mb-3">
                <CreditCard className="h-3.5 w-3.5" />
                <span>Simple, Fair Pricing</span>
              </div>
              <h2 className="text-3xl sm:text-4xl font-black tracking-tight text-neutral-900 dark:text-white">
                Choose the right plan for your workflow
              </h2>
              <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-2">
                Start with 1 free guest conversion or 3 free conversions on sign up. Upgrade anytime for higher volume with zero hidden fees.
              </p>
            </div>

            {/* Pricing Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
              {PRICING_PLANS.map((plan) => {
                const isLifetime = plan.id === 'lifetime';
                const isOnetime = plan.id === 'onetime';

                return (
                  <div
                    key={plan.id}
                    className={`relative rounded-3xl p-7 flex flex-col justify-between transition-all ${
                      isLifetime
                        ? 'border-2 border-emerald-600 dark:border-emerald-500 bg-emerald-50/20 dark:bg-neutral-900 shadow-xl shadow-emerald-600/10 scale-[1.02]'
                        : 'border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-sm'
                    }`}
                  >
                    {/* Popular Badge */}
                    {isLifetime && (
                      <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-3.5 py-1 rounded-full text-[11px] font-bold bg-emerald-600 text-white shadow-md uppercase tracking-wider flex items-center gap-1">
                        <Crown className="h-3.5 w-3.5" />
                        Most Popular Deal
                      </div>
                    )}

                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="text-lg font-bold text-neutral-900 dark:text-white">
                          {plan.name}
                        </h3>
                        {isLifetime ? (
                          <Crown className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                        ) : isOnetime ? (
                          <Zap className="h-5 w-5 text-neutral-400" />
                        ) : (
                          <Sparkles className="h-5 w-5 text-blue-500" />
                        )}
                      </div>

                      <p className="text-xs text-neutral-500 dark:text-neutral-400 min-h-[32px]">
                        {plan.description}
                      </p>

                      <div className="mt-5 mb-6 flex items-baseline gap-1">
                        <span className="text-4xl font-black tracking-tight text-neutral-900 dark:text-white">
                          {plan.price}
                        </span>
                        {plan.interval && (
                          <span className="text-xs text-neutral-400 font-medium">
                            {plan.interval}
                          </span>
                        )}
                        <span className="ml-auto text-xs font-semibold px-2.5 py-1 rounded-lg bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300">
                          {plan.credits}
                        </span>
                      </div>

                      <div className="border-t border-neutral-100 dark:border-neutral-800 pt-5 space-y-3">
                        {plan.features.map((f, i) => (
                          <div key={i} className="flex items-start gap-2.5 text-xs text-neutral-600 dark:text-neutral-300">
                            <Check className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                            <span>{f}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="mt-8">
                      <button
                        onClick={() => handleCheckout(plan.id)}
                        disabled={loadingPlan === plan.id}
                        className={`w-full py-3 px-4 rounded-xl text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-2 ${
                          isLifetime
                            ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/20'
                            : 'bg-neutral-900 hover:bg-neutral-800 dark:bg-white dark:text-neutral-900 text-white'
                        } disabled:opacity-50`}
                      >
                        {loadingPlan === plan.id ? (
                          <div className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <>Get {plan.name}</>
                        )}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Merchant Guarantee */}
            <div className="mt-12 text-center text-xs text-neutral-400 flex items-center justify-center gap-2">
              <ShieldCheck className="h-4 w-4 text-emerald-600" />
              <span>Payments securely processed by Paddle (Merchant of Record). All major credit cards accepted.</span>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-neutral-500 dark:text-neutral-400">
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
            <span className="font-semibold text-neutral-800 dark:text-neutral-200">StatementToExcel</span>
            <span>— The Specialized Bank Statement Parser</span>
          </div>

          <div className="flex items-center gap-6">
            <a href="#pricing" className="hover:underline">
              Pricing
            </a>
            <button onClick={() => handleRequireAuth()} className="hover:underline">
              Sign In
            </button>
            <span>© {new Date().getFullYear()} StatementToExcel. All rights reserved.</span>
          </div>
        </div>
      </footer>

      {/* Modals */}
      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        message={authMessage}
      />

      <PricingModal
        isOpen={isPricingOpen}
        onClose={() => setIsPricingOpen(false)}
        onRequireAuth={() => {
          setIsPricingOpen(false);
          handleRequireAuth('Sign in or create an account to complete your purchase.');
        }}
      />

      <PasswordModal
        isOpen={passwordModalData.isOpen}
        fileName={passwordModalData.fileName}
        errorMessage={passwordModalData.errorMessage}
        onClose={() => setPasswordModalData({ isOpen: false, fileName: '' })}
        onSubmit={handlePasswordSubmit}
      />
    </div>
  );
}
