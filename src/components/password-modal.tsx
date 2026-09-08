'use client';

import React, { useState } from 'react';
import { Lock, Eye, EyeOff, X, KeyRound } from 'lucide-react';

interface PasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (password: string) => void;
  errorMessage?: string;
  fileName?: string;
}

export function PasswordModal({
  isOpen,
  onClose,
  onSubmit,
  errorMessage,
  fileName,
}: PasswordModalProps) {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) return;
    onSubmit(password);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-sm rounded-2xl bg-white dark:bg-neutral-900 p-6 shadow-2xl border border-neutral-200 dark:border-neutral-800">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 p-1.5 rounded-lg text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="text-center mb-5">
          <div className="inline-flex items-center justify-center h-11 w-11 rounded-xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 mb-3 border border-amber-200 dark:border-amber-900">
            <Lock className="h-5 w-5" />
          </div>
          <h3 className="text-lg font-bold tracking-tight text-neutral-900 dark:text-white">
            Password Protected PDF
          </h3>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
            {fileName ? (
              <span className="font-medium text-neutral-700 dark:text-neutral-300 truncate block max-w-[240px] mx-auto">
                {fileName}
              </span>
            ) : null}
            This bank statement requires a password to decrypt.
          </p>
        </div>

        {errorMessage && (
          <div className="mb-4 p-2.5 rounded-lg text-xs bg-red-50 dark:bg-red-950/50 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-900 text-center">
            {errorMessage}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-neutral-600 dark:text-neutral-400 mb-1">
              Document Password
            </label>
            <div className="relative">
              <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                autoFocus
                placeholder="Enter password..."
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-9 pr-10 py-2 text-sm rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-neutral-900 dark:text-white placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-sm transition-all"
          >
            Unlock & Convert
          </button>
        </form>

        <p className="mt-4 text-center text-[10px] text-neutral-400">
          Passwords are processed in transient memory and never saved.
        </p>
      </div>
    </div>
  );
}
