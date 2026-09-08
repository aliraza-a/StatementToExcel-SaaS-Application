import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createCheckoutSession, PRICING_PLANS } from '@/lib/lemonsqueezy';

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
    const { planId, variantId: customVariantId } = body;

    let variantId = customVariantId;

    if (!variantId && planId) {
      const plan = PRICING_PLANS.find(p => p.id === planId);
      if (plan) {
        variantId = process.env[plan.variantIdEnvKey];
      }
    }

    if (!variantId) {
      return NextResponse.json(
        {
          error:
            'Lemon Squeezy Variant ID not configured. Please check your environment variables (LEMONSQUEEZY_VARIANT_ONETIME, LEMONSQUEEZY_VARIANT_LIFETIME, LEMONSQUEEZY_VARIANT_PRO_MONTHLY).',
        },
        { status: 400 }
      );
    }

    const checkoutUrl = await createCheckoutSession({
      variantId: String(variantId),
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
