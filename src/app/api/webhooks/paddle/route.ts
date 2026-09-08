import { NextRequest, NextResponse } from 'next/server';
import { verifyPaddleSignature } from '@/lib/paddle';
import { createAdminClient } from '@/lib/supabase/admin';
import { Profile } from '@/types/database';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get('paddle-signature') || '';

    // 1. Verify Paddle HMAC Signature
    const isValid = verifyPaddleSignature(rawBody, signature);
    if (!isValid) {
      console.warn('Unauthorized Paddle webhook signature mismatch.');
      return NextResponse.json({ error: 'Invalid Paddle signature' }, { status: 401 });
    }

    const payload = JSON.parse(rawBody);
    const eventType = payload.event_type;
    const data = payload.data || {};
    const customData = data.custom_data || {};
    const userId = customData.user_id;

    console.log(`Received Paddle webhook event: ${eventType}`, { userId, id: data.id });

    const adminClient = createAdminClient();

    // 2. Handle transaction.completed / transaction.paid
    if (eventType === 'transaction.completed' || eventType === 'transaction.paid') {
      const transactionId = String(data.id || Date.now());
      const totalAmount = String(
        data.details?.totals?.total ||
        data.payments?.[0]?.amount ||
        '0'
      );
      const status = data.status || 'completed';

      // Extract price_id from items
      const items = data.items || [];
      const priceId = String(items[0]?.price?.id || '');

      // Record transaction into public.payments ledger
      await adminClient.from('payments').insert({
        user_id: userId || null,
        order_id: transactionId,
        amount: totalAmount,
        status: status,
      });

      if (!userId) {
        console.warn('Paddle webhook received without user_id in custom_data. Payment logged to ledger.');
        return NextResponse.json({ received: true, note: 'No user_id found in custom_data' });
      }

      // Fetch user profile
      const { data: profileData, error: profileErr } = await adminClient
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      const profile = profileData as Profile | null;

      if (profileErr || !profile) {
        console.error('User profile not found for Paddle webhook:', profileErr);
        return NextResponse.json({ error: 'User profile not found' }, { status: 404 });
      }

      const currentCredits = profile.credits_remaining || 0;

      const oneTimePrice = process.env.PADDLE_PRICE_ID_ONETIME;
      const lifetimePrice = process.env.PADDLE_PRICE_ID_LIFETIME;
      const proPrice = process.env.PADDLE_PRICE_ID_PRO_MONTHLY;

      let newCredits = currentCredits;
      let newIsPro = profile.is_pro || false;

      if (priceId && priceId === lifetimePrice) {
        // Lifetime Deal ($29): Unlimited credits + Pro status
        newCredits = 999999;
        newIsPro = true;
      } else if (priceId && priceId === proPrice) {
        // Pro Monthly ($15/mo): 300 credits + Pro status
        newCredits = currentCredits + 300;
        newIsPro = true;
      } else if (priceId && priceId === oneTimePrice) {
        // One-time pass ($4.99): +20 credits
        newCredits = currentCredits + 20;
      } else {
        // Fallback amount matching if price IDs not configured
        const numAmount = parseFloat(totalAmount.replace(/[^0-9.]/g, ''));
        // If total is in cents (e.g. 2900 or 499)
        const normalized = numAmount > 100 ? numAmount / 100 : numAmount;
        if (normalized >= 25) {
          newCredits = 999999;
          newIsPro = true;
        } else if (normalized >= 12) {
          newCredits = currentCredits + 300;
          newIsPro = true;
        } else {
          newCredits = currentCredits + 20;
        }
      }

      await adminClient
        .from('profiles')
        .update({
          credits_remaining: newCredits,
          is_pro: newIsPro,
          updated_at: new Date().toISOString(),
        })
        .eq('id', userId);

      console.log(`Updated credits for user ${userId}: credits=${newCredits}, is_pro=${newIsPro}`);
      return NextResponse.json({ success: true, newCredits, newIsPro });
    }

    // 3. Handle subscription lifecycle events
    if (eventType === 'subscription.activated' || eventType === 'subscription.created') {
      if (userId) {
        await adminClient
          .from('profiles')
          .update({
            is_pro: true,
            updated_at: new Date().toISOString(),
          })
          .eq('id', userId);
        console.log(`Activated subscription for user ${userId}`);
      }
      return NextResponse.json({ success: true });
    }

    if (eventType === 'subscription.canceled' || eventType === 'subscription.past_due') {
      if (userId) {
        await adminClient
          .from('profiles')
          .update({
            is_pro: false,
            updated_at: new Date().toISOString(),
          })
          .eq('id', userId);
        console.log(`Canceled subscription for user ${userId}`);
      }
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ received: true, event: eventType });
  } catch (err) {
    console.error('Paddle webhook execution error:', err);
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 });
  }
}
