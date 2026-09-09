import '@/lib/engine/pdf-polyfill';
import { NextRequest, NextResponse } from 'next/server';
import { inspectPDF } from '@/lib/engine/pdf-detector';
import { parseDigitalStatement } from '@/lib/engine/digital-parser';
import { parseWithGeminiVision } from '@/lib/engine/vision-parser';
import { calculateSummary } from '@/lib/engine/normalizer';
import { createClient } from '@/lib/supabase/server';
import { Transaction } from '@/types/statement';
import { Profile } from '@/types/database';

export const dynamic = 'force-dynamic';
export const maxDuration = 60; // Allow sufficient time for OCR if needed

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const password = (formData.get('password') as string) || '';

    if (!file) {
      return NextResponse.json(
        { success: false, error: 'No PDF file uploaded.' },
        { status: 400 }
      );
    }

    if (!file.name.toLowerCase().endsWith('.pdf') && file.type !== 'application/pdf') {
      return NextResponse.json(
        { success: false, error: 'Only PDF documents are supported.' },
        { status: 400 }
      );
    }

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // 1. Inspect PDF structure, text density, and password protection
    const inspection = await inspectPDF(buffer, password);

    if (inspection.isPasswordProtected || inspection.errorCode === 'PASSWORD_REQUIRED' || inspection.errorCode === 'INVALID_PASSWORD') {
      return NextResponse.json(
        {
          success: false,
          errorCode: inspection.errorCode,
          error: inspection.error || 'Password required for encrypted PDF.',
        },
        { status: 401 }
      );
    }

    if (inspection.errorCode === 'CORRUPTED_PDF') {
      return NextResponse.json(
        {
          success: false,
          errorCode: 'CORRUPTED_PDF',
          error: inspection.error || 'PDF appears corrupted or unreadable.',
        },
        { status: 422 }
      );
    }

    // 2. Check Authentication & Credit Balances
    let supabase = null;
    let user = null;
    try {
      supabase = await createClient();
      if (supabase) {
        const { data } = await supabase.auth.getUser();
        user = data?.user || null;
      }
    } catch {
      user = null;
      supabase = null;
    }

    if (user && supabase) {
      // Authenticated User Flow: check credits in profiles
      const { data, error: profileErr } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      const profile = data as Profile | null;

      if (profileErr && profileErr.code !== 'PGRST116') {
        console.error('Error fetching profile:', profileErr);
      }

      const isPro = profile?.is_pro || false;
      const credits = profile?.credits_remaining ?? 3;

      if (!isPro && credits < inspection.pageCount) {
        return NextResponse.json(
          {
            success: false,
            errorCode: 'INSUFFICIENT_CREDITS',
            error: `You have ${credits} credits remaining, but this document requires ${inspection.pageCount} credits. Please upgrade your plan to continue.`,
          },
          { status: 403 }
        );
      }

      // Deduct credits if not Pro (1 credit per page, minimum 1)
      if (!isPro) {
        const cost = Math.max(1, inspection.pageCount);
        const newCredits = Math.max(0, credits - cost);

        await supabase
          .from('profiles')
          .update({ credits_remaining: newCredits, updated_at: new Date().toISOString() })
          .eq('id', user.id);
      }
    } else {
      // Unauthenticated / Freemium Guest Flow
      // If pageCount > 1, trigger Soft Paywall
      if (inspection.pageCount > 1) {
        return NextResponse.json(
          {
            success: false,
            errorCode: 'SOFT_PAYWALL',
            pageCount: inspection.pageCount,
            error: `This document has ${inspection.pageCount} pages. Free guest preview is limited to 1 page. Sign in to convert up to 3 pages for free!`,
          },
          { status: 402 }
        );
      }
    }

    // 3. Extraction Pipeline (Digital vs Scanned OCR)
    let transactions: Transaction[] = [];
    let usedVision = false;

    if (!inspection.isScanned && inspection.text.length > 50) {
      transactions = parseDigitalStatement(inspection.text);
    }

    // If digital parsing returned 0 transactions or it was flagged as scanned, fallback to Gemini Vision
    if (transactions.length === 0 || inspection.isScanned) {
      if (process.env.GEMINI_API_KEY) {
        try {
          transactions = await parseWithGeminiVision(buffer);
          usedVision = true;
        } catch (visionErr) {
          console.error('Gemini Vision processing error:', visionErr);
          // If digital had any lines, preserve them
          if (transactions.length === 0 && !inspection.isScanned) {
            transactions = parseDigitalStatement(inspection.text);
          }
        }
      }
    }

    const summary = calculateSummary(transactions);

    // 4. Record conversion in Supabase history if user is authenticated
    if (user && supabase) {
      try {
        await supabase.from('conversions').insert({
          user_id: user.id,
          file_name: file.name,
          page_count: inspection.pageCount,
          extracted_data: {
            transactions,
            summary,
          },
        });
      } catch (logErr) {
        console.warn('Could not save conversion history to database:', logErr);
      }
    }

    // 5. Zero-retention privacy: immediately return structured JSON
    return NextResponse.json({
      success: true,
      fileName: file.name,
      pageCount: inspection.pageCount,
      isScanned: usedVision || inspection.isScanned,
      transactions,
      summary,
    });
  } catch (err: unknown) {
    console.error('Unexpected conversion error:', err);
    const message = err instanceof Error ? err.message : 'Internal conversion failure.';
    return NextResponse.json(
      { success: false, errorCode: 'UNKNOWN', error: message },
      { status: 500 }
    );
  }
}
