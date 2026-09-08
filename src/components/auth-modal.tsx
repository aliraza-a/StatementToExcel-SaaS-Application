'use client';

import React, { useState } from 'react';
import {
  X,
  Mail,
  Lock,
  Eye,
  EyeOff,
  Sparkles,
  CheckCircle2,
  ArrowRight,
  KeyRound,
  UserPlus,
  LogIn,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  message?: string;
  onSuccess?: () => void;
  defaultMode?: 'signup' | 'signin';
}

export function AuthModal({
  isOpen,
  onClose,
  message,
  onSuccess,
  defaultMode = 'signup',
}: AuthModalProps) {
  const [mode, setMode] = useState<'signup' | 'signin' | 'magic-link'>(defaultMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [submittedMessage, setSubmittedMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const resetState = () => {
    setError(null);
    setSubmittedMessage(null);
    setLoading(false);
  };

  const handleModeChange = (newMode: 'signup' | 'signin' | 'magic-link') => {
    resetState();
    setMode(newMode);
  };

  // 1. Handle Email + Password Sign Up
  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;

    if (password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const supabase = createClient();
      const origin = typeof window !== 'undefined' ? window.location.origin : '';
      const { data, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${origin}/auth/callback?next=/dashboard`,
          data: { email },
        },
      });

      if (authError) throw authError;

      // Check if session was created immediately (email confirmation disabled in Supabase)
      if (data?.session) {
        if (onSuccess) onSuccess();
        onClose();
        window.location.reload();
      } else if (data?.user && !data?.session) {
        // Email confirmation is required by Supabase project settings
        setSubmittedMessage(
          `We sent a confirmation link to ${email}. Please check your inbox (and spam folder) to activate your account, or sign in if already confirmed.`
        );
      } else {
        if (onSuccess) onSuccess();
        onClose();
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Sign up failed.';
      if (msg.includes('already registered')) {
        setError('This email is already registered. Please switch to "Sign In" below.');
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  // 2. Handle Email + Password Sign In
  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;

    setLoading(true);
    setError(null);

    try {
      const supabase = createClient();
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) throw authError;

      if (data?.session) {
        if (onSuccess) onSuccess();
        onClose();
        window.location.reload();
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Sign in failed.';
      if (msg.includes('Invalid login credentials')) {
        setError('Incorrect email or password. If you do not have an account yet, click "Create Account" above.');
      } else if (msg.includes('Email not confirmed')) {
        setError('Please check your email inbox to confirm your account, or use Magic Link below.');
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  // 3. Handle Passwordless Magic Link
  const handleMagicLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setLoading(true);
    setError(null);

    try {
      const supabase = createClient();
      const origin = typeof window !== 'undefined' ? window.location.origin : '';
      const { error: authError } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${origin}/auth/callback?next=/dashboard`,
        },
      });

      if (authError) throw authError;
      setSubmittedMessage(
        `We just sent a secure one-click Magic Link to ${email}. Check your inbox to log in instantly.`
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to send magic link.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  // 4. Handle Google OAuth
  const handleGoogleSignIn = async () => {
    setError(null);
    try {
      const supabase = createClient();
      const origin = typeof window !== 'undefined' ? window.location.origin : '';
      const { error: authError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${origin}/auth/callback?next=/dashboard`,
        },
      });

      if (authError) {
        if (authError.message.includes('not enabled') || authError.message.includes('validation_failed')) {
          setError(
            'Google Sign-In is not enabled in your Supabase project yet. You can sign up with your Email & Password right below in 5 seconds!'
          );
          return;
        }
        throw authError;
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Google authentication failed.';
      if (msg.includes('not enabled') || msg.includes('validation_failed')) {
        setError(
          'Google Sign-In is not enabled in your Supabase project yet. You can sign up with your Email & Password right below in 5 seconds!'
        );
      } else {
        setError(msg);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-md rounded-3xl bg-white dark:bg-neutral-900 p-6 sm:p-7 shadow-2xl border border-neutral-200 dark:border-neutral-800">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 p-1.5 rounded-xl text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Modal Header */}
        <div className="text-center mb-5">
          <div className="inline-flex items-center justify-center h-12 w-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 mb-3 border border-emerald-100 dark:border-emerald-900 shadow-xs">
            <Sparkles className="h-6 w-6" />
          </div>
          <h3 className="text-xl font-black tracking-tight text-neutral-900 dark:text-white">
            {mode === 'signup'
              ? 'Get 3 Free Conversions'
              : mode === 'signin'
              ? 'Welcome Back'
              : 'Passwordless Sign In'}
          </h3>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1 max-w-xs mx-auto">
            {message ||
              (mode === 'signup'
                ? 'Create a free account in 5 seconds to unlock multi-page statement parsing and save your history.'
                : 'Sign in to access your statement conversion history and credits.')}
          </p>
        </div>

        {/* Auth Mode Tabs */}
        <div className="grid grid-cols-2 p-1 mb-5 rounded-xl bg-neutral-100 dark:bg-neutral-800/80 text-xs font-semibold text-neutral-600 dark:text-neutral-400">
          <button
            type="button"
            onClick={() => handleModeChange('signup')}
            className={`py-1.5 px-3 rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              mode === 'signup'
                ? 'bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white shadow-xs'
                : 'hover:text-neutral-900 dark:hover:text-white'
            }`}
          >
            <UserPlus className="h-3.5 w-3.5" />
            Create Account
          </button>
          <button
            type="button"
            onClick={() => handleModeChange('signin')}
            className={`py-1.5 px-3 rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              mode === 'signin' || mode === 'magic-link'
                ? 'bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white shadow-xs'
                : 'hover:text-neutral-900 dark:hover:text-white'
            }`}
          >
            <LogIn className="h-3.5 w-3.5" />
            Sign In
          </button>
        </div>

        {/* Alert / Error Notice */}
        {error && (
          <div className="mb-4 p-3 rounded-xl text-xs bg-red-50 dark:bg-red-950/50 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-900 animate-in fade-in duration-200">
            {error}
          </div>
        )}

        {/* Submitted Confirmation View */}
        {submittedMessage ? (
          <div className="text-center py-5 space-y-3">
            <CheckCircle2 className="h-12 w-12 text-emerald-500 mx-auto animate-in zoom-in-50 duration-300" />
            <h4 className="text-sm font-bold text-neutral-900 dark:text-white">
              Check your inbox!
            </h4>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 max-w-xs mx-auto leading-relaxed">
              {submittedMessage}
            </p>
            <button
              onClick={() => resetState()}
              className="inline-block mt-2 text-xs font-semibold text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 cursor-pointer"
            >
              Back to Sign In
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Google OAuth Button */}
            <button
              onClick={handleGoogleSignIn}
              type="button"
              className="w-full flex items-center justify-center gap-3 px-4 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-xs font-bold text-neutral-700 dark:text-neutral-200 hover:bg-neutral-50 dark:hover:bg-neutral-700/80 transition-colors shadow-xs cursor-pointer"
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
                Or with Email
              </span>
            </div>

            {/* Mode: Magic Link */}
            {mode === 'magic-link' ? (
              <form onSubmit={handleMagicLink} className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-neutral-600 dark:text-neutral-400 mb-1">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
                    <input
                      type="email"
                      required
                      placeholder="alex@company.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full pl-10 pr-3.5 py-2 text-xs rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-neutral-900 dark:text-white placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition-all disabled:opacity-50 cursor-pointer"
                >
                  {loading ? (
                    <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      Send Magic Link
                      <ArrowRight className="h-3.5 w-3.5" />
                    </>
                  )}
                </button>

                <div className="text-center pt-1">
                  <button
                    type="button"
                    onClick={() => handleModeChange('signin')}
                    className="text-xs text-neutral-500 hover:text-neutral-900 dark:hover:text-white transition-colors cursor-pointer"
                  >
                    Use Password instead
                  </button>
                </div>
              </form>
            ) : (
              /* Mode: Sign Up or Sign In (Email + Password) */
              <form onSubmit={mode === 'signup' ? handleSignUp : handleSignIn} className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-neutral-600 dark:text-neutral-400 mb-1">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
                    <input
                      type="email"
                      required
                      placeholder="alex@company.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full pl-10 pr-3.5 py-2 text-xs rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-neutral-900 dark:text-white placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-medium text-neutral-600 dark:text-neutral-400">
                      Password
                    </label>
                    {mode === 'signin' && (
                      <button
                        type="button"
                        onClick={() => handleModeChange('magic-link')}
                        className="text-[11px] text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer"
                      >
                        Forgot / Magic Link?
                      </button>
                    )}
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      placeholder={mode === 'signup' ? 'Min. 6 characters' : 'Enter password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full pl-10 pr-10 py-2 text-xs rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-neutral-900 dark:text-white placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200"
                    >
                      {showPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition-all disabled:opacity-50 cursor-pointer"
                >
                  {loading ? (
                    <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : mode === 'signup' ? (
                    <>
                      Create Free Account & Get 3 Credits
                      <ArrowRight className="h-3.5 w-3.5" />
                    </>
                  ) : (
                    <>
                      Sign In to Account
                      <ArrowRight className="h-3.5 w-3.5" />
                    </>
                  )}
                </button>

                <div className="flex items-center justify-between pt-1 text-xs text-neutral-500">
                  <button
                    type="button"
                    onClick={() => handleModeChange(mode === 'signup' ? 'signin' : 'signup')}
                    className="hover:text-neutral-900 dark:hover:text-white transition-colors cursor-pointer"
                  >
                    {mode === 'signup' ? 'Already have an account? Sign In' : "Don't have an account? Sign Up"}
                  </button>

                  <button
                    type="button"
                    onClick={() => handleModeChange('magic-link')}
                    className="text-neutral-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors flex items-center gap-1 cursor-pointer"
                  >
                    <KeyRound className="h-3 w-3" />
                    Magic Link
                  </button>
                </div>
              </form>
            )}
          </div>
        )}

        {/* Footer Guarantee */}
        <p className="mt-5 text-center text-[11px] text-neutral-400 dark:text-neutral-500">
          By continuing, you agree to zero-retention private bank statement processing.
        </p>
      </div>
    </div>
  );
}
