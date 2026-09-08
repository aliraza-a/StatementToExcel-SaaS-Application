'use client';

import React, { useState } from 'react';
import { X, Mail, Sparkles, CheckCircle2, ArrowRight } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  message?: string;
  onSuccess?: () => void;
}

export function AuthModal({ isOpen, onClose, message, onSuccess }: AuthModalProps) {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleMagicLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setLoading(true);
    setError(null);

    try {
      const supabase = createClient();
      const origin = window.location.origin;
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${origin}/auth/callback?next=/dashboard`,
        },
      });

      if (error) throw error;
      setSubmitted(true);
      if (onSuccess) onSuccess();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to send magic link.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      const supabase = createClient();
      const origin = window.location.origin;
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${origin}/auth/callback?next=/dashboard`,
        },
      });
      if (error) throw error;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Google authentication failed.';
      setError(msg);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-md rounded-2xl bg-white dark:bg-neutral-900 p-6 shadow-2xl border border-neutral-200 dark:border-neutral-800">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 p-1.5 rounded-lg text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Modal Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center h-12 w-12 rounded-xl bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 mb-3 border border-emerald-100 dark:border-emerald-900">
            <Sparkles className="h-6 w-6" />
          </div>
          <h3 className="text-xl font-bold tracking-tight text-neutral-900 dark:text-white">
            Get 3 Free Conversions
          </h3>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1 max-w-xs mx-auto">
            {message || 'Sign in with your Google account or email to convert multi-page statements and save your history.'}
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-lg text-xs bg-red-50 dark:bg-red-950/50 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-900">
            {error}
          </div>
        )}

        {submitted ? (
          <div className="text-center py-6">
            <CheckCircle2 className="h-12 w-12 text-emerald-500 mx-auto mb-3 animate-in zoom-in-50 duration-300" />
            <h4 className="text-sm font-semibold text-neutral-900 dark:text-white">
              Check your inbox!
            </h4>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1 max-w-xs mx-auto">
              We just sent a secure Magic Link to <strong className="text-neutral-800 dark:text-neutral-200">{email}</strong>. Click it to log in instantly.
            </p>
            <button
              onClick={() => setSubmitted(false)}
              className="mt-4 text-xs font-medium text-emerald-600 hover:text-emerald-700 dark:text-emerald-400"
            >
              Use a different email
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Google OAuth Button */}
            <button
              onClick={handleGoogleSignIn}
              type="button"
              className="w-full flex items-center justify-center gap-3 px-4 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-sm font-medium text-neutral-700 dark:text-neutral-200 hover:bg-neutral-50 dark:hover:bg-neutral-700 transition-colors shadow-sm"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              Continue with Google
            </button>

            {/* Divider */}
            <div className="relative flex items-center justify-center">
              <div className="w-full border-t border-neutral-200 dark:border-neutral-800" />
              <span className="absolute bg-white dark:bg-neutral-900 px-3 text-[11px] font-medium text-neutral-400 uppercase tracking-wider">
                Or with Magic Link
              </span>
            </div>

            {/* Email Magic Link Form */}
            <form onSubmit={handleMagicLink} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-neutral-600 dark:text-neutral-400 mb-1">
                  Work or Personal Email
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
                  <input
                    type="email"
                    required
                    placeholder="alex@company.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-10 pr-3.5 py-2 text-sm rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-neutral-900 dark:text-white placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold shadow-sm transition-all disabled:opacity-50"
              >
                {loading ? (
                  <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    Send Magic Link
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </form>
          </div>
        )}

        {/* Footer Guarantee */}
        <p className="mt-5 text-center text-[11px] text-neutral-400">
          No password needed. By signing in, you agree to zero-retention statement processing.
        </p>
      </div>
    </div>
  );
}
