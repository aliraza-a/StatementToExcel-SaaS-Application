'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { FileSpreadsheet, Sparkles, LogIn, LogOut, Crown, LayoutDashboard } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { Profile } from '@/types/database';

interface NavbarProps {
  onOpenAuth: () => void;
  onOpenPricing: () => void;
}

export function Navbar({ onOpenAuth, onOpenPricing }: NavbarProps) {
  const [user, setUser] = useState<{ id: string; email?: string } | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();

    async function loadUser() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        setUser(user);
        if (user) {
          const { data } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single();
          if (data) {
            setProfile(data as Profile);
          }
        }
      } catch (err) {
        console.error('Navbar user fetch error:', err);
      } finally {
        setLoading(false);
      }
    }

    loadUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event: any, session: any) => {
      setUser(session?.user || null);
      if (session?.user) {
        loadUser();
      } else {
        setProfile(null);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.href = '/';
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-neutral-200 bg-white/80 backdrop-blur-md dark:border-neutral-800 dark:bg-neutral-950/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand Logo */}
        <Link href="/" className="flex items-center gap-2.5 transition-opacity hover:opacity-90">
          <div className="h-9 w-9 rounded-lg bg-emerald-600 flex items-center justify-center text-white shadow-sm shadow-emerald-600/20">
            <FileSpreadsheet className="h-5 w-5" />
          </div>
          <div className="flex flex-col">
            <span className="text-base font-bold tracking-tight text-neutral-900 dark:text-white">
              Statement<span className="text-emerald-600 dark:text-emerald-400">ToExcel</span>
            </span>
            <span className="text-[10px] uppercase font-semibold tracking-wider text-neutral-400">
              AI Bank Statement Parser
            </span>
          </div>
        </Link>

        {/* Navigation Links */}
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-neutral-600 dark:text-neutral-400">
          <Link href="/#how-it-works" className="hover:text-neutral-900 dark:hover:text-white transition-colors">
            How It Works
          </Link>
          <Link href="/#features" className="hover:text-neutral-900 dark:hover:text-white transition-colors">
            Features
          </Link>
          <button
            onClick={onOpenPricing}
            className="hover:text-neutral-900 dark:hover:text-white transition-colors"
          >
            Pricing
          </button>
          {user && (
            <Link
              href="/dashboard"
              className="flex items-center gap-1.5 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors"
            >
              <LayoutDashboard className="h-4 w-4" />
              Dashboard
            </Link>
          )}
        </nav>

        {/* Right CTAs / User profile */}
        <div className="flex items-center gap-3">
          {user ? (
            <div className="flex items-center gap-3">
              {/* Credits indicator */}
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 border border-neutral-200 dark:border-neutral-700">
                {profile?.is_pro ? (
                  <>
                    <Crown className="h-3.5 w-3.5 text-amber-500 fill-amber-500" />
                    <span>PRO Unlimited</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="h-3.5 w-3.5 text-emerald-500" />
                    <span>{profile?.credits_remaining ?? 3} Credits</span>
                  </>
                )}
              </div>

              {/* Upgrade Button */}
              {!profile?.is_pro && (
                <button
                  onClick={onOpenPricing}
                  className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white transition-all shadow-sm"
                >
                  <Crown className="h-3.5 w-3.5" />
                  Upgrade
                </button>
              )}

              {/* User avatar / Sign out */}
              <button
                onClick={handleSignOut}
                title="Sign Out"
                className="p-2 rounded-lg text-neutral-500 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2.5">
              <button
                onClick={onOpenAuth}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
              >
                <LogIn className="h-3.5 w-3.5" />
                Sign In
              </button>
              <button
                onClick={onOpenPricing}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 hover:bg-neutral-800 dark:hover:bg-neutral-100 transition-all shadow-sm"
              >
                <Sparkles className="h-3.5 w-3.5 text-amber-400 dark:text-amber-600" />
                Pricing
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
