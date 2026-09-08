import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createPaddleCheckoutSession, PRICING_PLANS } from '@/lib/paddle';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    if (!supabase) {
      return NextResponse.json(
        { error: 'Supabase authentication is not configured on this deployment yet.' },
        { status: 500 }
      );
    }
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required. Please sign in to purchase credits.' },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { planId, priceId: customPriceId } = body;

    let priceId = customPriceId;

    if (!priceId && planId) {
      const plan = PRICING_PLANS.find(p => p.id === planId);
      if (plan) {
        priceId = process.env[plan.priceIdEnvKey];
      }
    }

    if (!priceId) {
      return NextResponse.json(
        {
          error:
            'Paddle Price ID not configured. Please check your environment variables (PADDLE_PRICE_ID_ONETIME, PADDLE_PRICE_ID_LIFETIME, PADDLE_PRICE_ID_PRO_MONTHLY).',
        },
        { status: 400 }
      );
    }

    const checkoutUrl = await createPaddleCheckoutSession({
      priceId: String(priceId),
      userId: user.id,
      userEmail: user.email,
    });

    return NextResponse.json({ url: checkoutUrl });
  } catch (err: unknown) {
    console.error('Checkout creation error:', err);
    const message = err instanceof Error ? err.message : 'Failed to create checkout session.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
