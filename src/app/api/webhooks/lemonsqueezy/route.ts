import { NextRequest, NextResponse } from 'next/server';
import { verifyLemonSqueezySignature } from '@/lib/lemonsqueezy';
import { createAdminClient } from '@/lib/supabase/admin';
import { Profile } from '@/types/database';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get('x-signature') || '';

    // 1. Verify HMAC Signature
    const isValid = verifyLemonSqueezySignature(rawBody, signature);
    if (!isValid) {
      console.warn('Unauthorized webhook signature mismatch.');
      return NextResponse.json({ error: 'Invalid HMAC signature' }, { status: 401 });
    }

    const payload = JSON.parse(rawBody);
    const eventName = payload.meta?.event_name;
    const customData = payload.meta?.custom_data || {};
    const userId = customData.user_id;

    console.log(`Received Lemon Squeezy webhook event: ${eventName}`, { userId });

    const adminClient = createAdminClient();

    // 2. Process order_created or subscription_created events
    if (eventName === 'order_created' || eventName === 'subscription_created') {
      const orderAttributes = payload.data?.attributes;
      const orderId = String(payload.data?.id || orderAttributes?.order_number || Date.now());
      const variantId = String(
        orderAttributes?.first_order_item?.variant_id ||
        orderAttributes?.variant_id ||
        ''
      );
      const totalAmount = String(orderAttributes?.total_formatted || orderAttributes?.total || '0');
      const status = orderAttributes?.status || 'paid';

      // Record transaction into public.payments ledger
      await adminClient.from('payments').insert({
        user_id: userId || null,
        order_id: orderId,
        amount: totalAmount,
        status: status,
      });

      if (!userId) {
        console.warn('Webhook received with no custom user_id attached. Payment logged to ledger.');
        return NextResponse.json({ received: true, note: 'No user_id found in custom_data' });
      }

      // Fetch current profile
      const { data, error: profileErr } = await adminClient
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      const profile = data as Profile | null;

      if (profileErr || !profile) {
        console.error('Could not find user profile for webhook credit top-up:', profileErr);
        return NextResponse.json({ error: 'User profile not found' }, { status: 404 });
      }

      const currentCredits = profile.credits_remaining || 0;

      // Determine product by variant ID or price
      const oneTimeVariant = process.env.LEMONSQUEEZY_VARIANT_ONETIME;
      const lifetimeVariant = process.env.LEMONSQUEEZY_VARIANT_LIFETIME;
      const proVariant = process.env.LEMONSQUEEZY_VARIANT_PRO_MONTHLY;

      let newCredits = currentCredits;
      let newIsPro = profile.is_pro || false;

      if (variantId && variantId === lifetimeVariant) {
        // Lifetime Deal ($29): Unlimited credits + Pro status
        newCredits = 999999;
        newIsPro = true;
      } else if (variantId && variantId === proVariant) {
        // Pro Monthly ($15/mo): 300 credits replenished + Pro status
        newCredits = currentCredits + 300;
        newIsPro = true;
      } else if (variantId && variantId === oneTimeVariant) {
        // One-time pass ($4.99): +20 credits
        newCredits = currentCredits + 20;
      } else {
        // Fallback matching if variant IDs aren't set in env: check total amount
        const numAmount = parseFloat(totalAmount.replace(/[^0-9.]/g, ''));
        if (numAmount >= 25) {
          newCredits = 999999;
          newIsPro = true;
        } else if (numAmount >= 12) {
          newCredits = currentCredits + 300;
          newIsPro = true;
        } else {
          newCredits = currentCredits + 20;
        }
      }

      // Update public.profiles
      await adminClient
        .from('profiles')
        .update({
          credits_remaining: newCredits,
          is_pro: newIsPro,
          updated_at: new Date().toISOString(),
        })
        .eq('id', userId);

      console.log(`Successfully credited user ${userId}: credits=${newCredits}, is_pro=${newIsPro}`);
    }

    return NextResponse.json({ received: true });
  } catch (err: unknown) {
    console.error('Lemon Squeezy Webhook processing error:', err);
    const message = err instanceof Error ? err.message : 'Unknown webhook error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
