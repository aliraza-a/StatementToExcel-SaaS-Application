'use client';

import React, { useState } from 'react';
import { X, Check, Sparkles, Crown, Zap, ShieldCheck } from 'lucide-react';
import { PRICING_PLANS } from '@/lib/paddle';
import { createClient } from '@/lib/supabase/client';

interface PricingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRequireAuth: () => void;
}

export function PricingModal({ isOpen, onClose, onRequireAuth }: PricingModalProps) {
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleCheckout = async (planId: string) => {
    setLoadingPlan(planId);
    setError(null);

    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        onRequireAuth();
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
        throw new Error(data.error || 'Unable to generate checkout session.');
      }

      if (data.url) {
        window.location.href = data.url;
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Checkout failed.';
      setError(msg);
    } finally {
      setLoadingPlan(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-900/70 backdrop-blur-sm overflow-y-auto animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl rounded-2xl bg-white dark:bg-neutral-900 p-6 sm:p-8 shadow-2xl border border-neutral-200 dark:border-neutral-800 my-8">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 p-2 rounded-xl text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Header */}
        <div className="text-center max-w-lg mx-auto mb-8">
          <div className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 mb-3">
            <Sparkles className="h-3.5 w-3.5" />
            <span>Simple, Transparent Pricing</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-neutral-900 dark:text-white tracking-tight">
            Convert statements without limits
          </h2>
          <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 mt-2">
            Choose the plan that fits your bookkeeping volume. High accuracy, zero data retention, and instant downloads.
          </p>
        </div>

        {error && (
          <div className="mb-6 p-3.5 rounded-xl text-xs bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-900 text-center">
            {error}
          </div>
        )}

        {/* Pricing Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {PRICING_PLANS.map((plan) => {
            const isLifetime = plan.id === 'lifetime';
            const isOnetime = plan.id === 'onetime';

            return (
              <div
                key={plan.id}
                className={`relative rounded-2xl p-6 flex flex-col justify-between transition-all ${
                  isLifetime
                    ? 'border-2 border-emerald-600 dark:border-emerald-500 bg-neutral-50/50 dark:bg-neutral-800 shadow-lg shadow-emerald-600/10'
                    : 'border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900'
                }`}
              >
                {/* Popular Badge */}
                {isLifetime && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full text-[11px] font-bold bg-emerald-600 text-white shadow-sm uppercase tracking-wider flex items-center gap-1">
                    <Crown className="h-3 w-3" />
                    Most Popular
                  </div>
                )}

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-base font-bold text-neutral-900 dark:text-white">
                      {plan.name}
                    </h3>
                    {isLifetime ? (
                      <Crown className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                    ) : isOnetime ? (
                      <Zap className="h-4 w-4 text-neutral-400" />
                    ) : (
                      <Sparkles className="h-4 w-4 text-blue-500" />
                    )}
                  </div>

                  <p className="text-xs text-neutral-500 dark:text-neutral-400 min-h-[32px]">
                    {plan.description}
                  </p>

                  <div className="mt-4 mb-5 flex items-baseline gap-1">
                    <span className="text-3xl font-black tracking-tight text-neutral-900 dark:text-white">
                      {plan.price}
                    </span>
                    {plan.interval && (
                      <span className="text-xs text-neutral-400 font-medium">
                        {plan.interval}
                      </span>
                    )}
                    <span className="ml-auto text-xs font-semibold px-2.5 py-1 rounded-md bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300">
                      {plan.credits}
                    </span>
                  </div>

                  <div className="border-t border-neutral-100 dark:border-neutral-800 pt-4 space-y-2.5">
                    {plan.features.map((f, i) => (
                      <div key={i} className="flex items-start gap-2 text-xs text-neutral-600 dark:text-neutral-300">
                        <Check className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                        <span>{f}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-6">
                  <button
                    onClick={() => handleCheckout(plan.id)}
                    disabled={loadingPlan === plan.id}
                    className={`w-full py-2.5 px-4 rounded-xl text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-2 ${
                      isLifetime
                        ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
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

        {/* Privacy Note */}
        <div className="mt-8 pt-4 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-center gap-2 text-xs text-neutral-400">
          <ShieldCheck className="h-4 w-4 text-emerald-600" />
          <span>Secured by Paddle (Merchant of Record). 30-day money-back guarantee.</span>
        </div>
      </div>
    </div>
  );
}
