'use client';

import React, { useState, useRef, DragEvent, ChangeEvent } from 'react';
import { UploadCloud, FileText, AlertCircle, Shield, CheckCircle, Loader2 } from 'lucide-react';
import { ConversionResult } from '@/types/statement';

interface DropzoneProps {
  onConversionSuccess: (result: ConversionResult) => void;
  onRequireAuth: (message?: string) => void;
  onRequirePricing: () => void;
  onRequestPassword: (fileName: string, retryFn: (password: string) => void) => void;
  isLoggedIn: boolean;
}

export function Dropzone({
  onConversionSuccess,
  onRequireAuth,
  onRequirePricing,
  onRequestPassword,
  isLoggedIn,
}: DropzoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progressStatus, setProgressStatus] = useState<string>('');
  const [progressPercent, setProgressPercent] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [activeFile, setActiveFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processFile = async (file: File, password?: string) => {
    // 1. Validate file type and size (20MB)
    if (!file.name.toLowerCase().endsWith('.pdf') && file.type !== 'application/pdf') {
      setError('Please upload a valid PDF document.');
      return;
    }

    if (file.size > 20 * 1024 * 1024) {
      setError('File size exceeds the 20MB limit. Please upload a smaller file.');
      return;
    }

    // 2. Check Guest Conversion Limit
    if (!isLoggedIn && typeof window !== 'undefined') {
      const guestUsed = localStorage.getItem('guest_conversion_used');
      if (guestUsed) {
        onRequireAuth('You have used your 1 free guest conversion. Sign in to convert up to 3 pages for free!');
        return;
      }
    }

    setError(null);
    setIsProcessing(true);
    setActiveFile(file);

    // Progress animation milestones
    setProgressPercent(20);
    setProgressStatus('Reading PDF buffers and detecting layout...');

    const timer1 = setTimeout(() => {
      setProgressPercent(50);
      setProgressStatus('Scanning text streams and transaction tables...');
    }, 600);

    const timer2 = setTimeout(() => {
      setProgressPercent(80);
      setProgressStatus('Normalizing dates, descriptions & balances into 5 columns...');
    }, 1200);

    try {
      const formData = new FormData();
      formData.append('file', file);
      if (password) {
        formData.append('password', password);
      }

      const res = await fetch('/api/convert', {
        method: 'POST',
        body: formData,
      });

      clearTimeout(timer1);
      clearTimeout(timer2);

      const data = await res.json();

      if (!res.ok || !data.success) {
        setIsProcessing(false);

        // Handle specific error codes
        if (data.errorCode === 'PASSWORD_REQUIRED' || data.errorCode === 'INVALID_PASSWORD') {
          onRequestPassword(file.name, (pwd: string) => {
            processFile(file, pwd);
          });
          return;
        }

        if (data.errorCode === 'SOFT_PAYWALL') {
          onRequireAuth(data.error || 'Multi-page document. Sign in to convert up to 3 pages for free!');
          return;
        }

        if (data.errorCode === 'INSUFFICIENT_CREDITS') {
          onRequirePricing();
          return;
        }

        throw new Error(data.error || 'Failed to extract transactions from PDF.');
      }

      setProgressPercent(100);
      setProgressStatus('Extraction completed!');

      // If guest user, mark guest conversion as used in local storage
      if (!isLoggedIn && typeof window !== 'undefined') {
        localStorage.setItem('guest_conversion_used', 'true');
      }

      setTimeout(() => {
        setIsProcessing(false);
        onConversionSuccess(data);
      }, 400);
    } catch (err: unknown) {
      clearTimeout(timer1);
      clearTimeout(timer2);
      setIsProcessing(false);
      const msg = err instanceof Error ? err.message : 'An error occurred during conversion.';
      setError(msg);
    } finally {
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleDragOver = (e: DragEvent<HTMLElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: DragEvent<HTMLElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFile(e.target.files[0]);
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto">
      {/* Native clickable dropzone using label for 100% reliable file picker opening */}
      <label
        htmlFor="pdf-statement-upload"
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`relative block rounded-3xl border-2 border-dashed p-8 sm:p-12 text-center transition-all select-none ${
          isProcessing ? 'cursor-wait pointer-events-none opacity-90' : 'cursor-pointer'
        } ${
          isDragging
            ? 'border-emerald-500 bg-emerald-50/70 dark:bg-emerald-950/30 scale-[1.01]'
            : 'border-neutral-300 dark:border-neutral-800 bg-white dark:bg-neutral-900 hover:border-emerald-500/60 dark:hover:border-emerald-500/50 hover:bg-neutral-50/80 dark:hover:bg-neutral-800 shadow-sm'
        }`}
      >
        <input
          id="pdf-statement-upload"
          ref={fileInputRef}
          type="file"
          accept=".pdf,application/pdf"
          onChange={handleFileChange}
          disabled={isProcessing}
          className="sr-only"
        />

        {isProcessing ? (
          <div className="py-4 space-y-4">
            <div className="relative mx-auto w-14 h-14 flex items-center justify-center rounded-2xl bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
              <Loader2 className="h-7 w-7 animate-spin" />
            </div>

            <div className="space-y-1.5">
              <h4 className="text-base font-bold text-neutral-900 dark:text-white">
                Processing {activeFile?.name}
              </h4>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                {progressStatus}
              </p>
            </div>

            {/* Progress Bar */}
            <div className="w-full max-w-xs mx-auto bg-neutral-200 dark:bg-neutral-800 h-2 rounded-full overflow-hidden">
              <div
                className="bg-emerald-600 h-full rounded-full transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="mx-auto w-16 h-16 flex items-center justify-center rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/60 shadow-xs">
              <UploadCloud className="h-8 w-8 text-emerald-600 dark:text-emerald-400" />
            </div>

            <div>
              <h3 className="text-lg sm:text-xl font-bold text-neutral-900 dark:text-white">
                Click here to upload your Bank Statement
              </h3>
              <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 mt-1.5 max-w-md mx-auto">
                Click anywhere in this box to browse files, or drag and drop your <strong className="text-neutral-800 dark:text-neutral-200">.PDF</strong> document.
              </p>
            </div>

            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 text-white text-xs font-semibold shadow-xs hover:bg-emerald-700 transition-colors">
              <FileText className="h-4 w-4" />
              <span>Browse PDF from Computer</span>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-3 pt-2 text-[11px] text-neutral-400">
              <span className="flex items-center gap-1">
                <FileText className="h-3.5 w-3.5" /> Up to 20MB
              </span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <Shield className="h-3.5 w-3.5 text-emerald-600" /> Zero Data Retention
              </span>
              <span>•</span>
              <span>Digital & Scanned Statements</span>
            </div>
          </div>
        )}
      </label>

      {/* Error Alert */}
      {error && (
        <div className="mt-4 p-3.5 rounded-2xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 flex items-start gap-3 text-xs text-red-600 dark:text-red-400 animate-in fade-in duration-200">
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-semibold">Conversion Error</p>
            <p className="mt-0.5">{error}</p>
          </div>
        </div>
      )}
    </div>
  );
}
