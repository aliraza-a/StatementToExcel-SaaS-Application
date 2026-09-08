import crypto from 'crypto';
import { PricingPlan } from '@/types/statement';

export const PRICING_PLANS: PricingPlan[] = [
  {
    id: 'onetime',
    name: 'One-Time Pass',
    price: '$4.99',
    description: 'Perfect for tax season or quick one-off audits.',
    credits: '20 Credits',
    popular: false,
    features: [
      '20 Statement Page conversions',
      'Digital & Scanned OCR extraction',
      'Strict 5-column Excel & CSV export',
      'No subscription or recurring charges',
      'Instant delivery',
    ],
    variantIdEnvKey: 'LEMONSQUEEZY_VARIANT_ONETIME',
  },
  {
    id: 'lifetime',
    name: 'Lifetime Deal',
    price: '$29',
    interval: 'one-time',
    description: 'The ultimate deal for accountants, bookkeepers, and SMBs.',
    credits: 'Unlimited Credits',
    popular: true,
    features: [
      'Unlimited Statement conversions',
      'Priority OCR & AI extraction',
      'Unlimited history retention',
      'Bulk conversion processing',
      'Pro Badge & VIP Support',
      'Pay once, own forever',
    ],
    variantIdEnvKey: 'LEMONSQUEEZY_VARIANT_LIFETIME',
  },
  {
    id: 'pro',
    name: 'Pro Monthly',
    price: '$15',
    interval: '/month',
    description: 'For growing businesses with continuous monthly statement volume.',
    credits: '300 Credits / mo',
    popular: false,
    features: [
      '300 Page conversions every month',
      'Digital & Scanned OCR extraction',
      'Interactive preview & cell editor',
      'API access included',
      'Cancel anytime with 1-click',
    ],
    variantIdEnvKey: 'LEMONSQUEEZY_VARIANT_PRO_MONTHLY',
  },
];

/**
 * Verifies Lemon Squeezy HMAC SHA-256 webhook signature.
 */
export function verifyLemonSqueezySignature(rawBody: string, signature: string): boolean {
  const secret = process.env.LEMONSQUEEZY_WEBHOOK_SECRET;
  if (!secret || !signature) {
    return false;
  }

  try {
    const hmac = crypto.createHmac('sha256', secret);
    const digest = Buffer.from(hmac.update(rawBody).digest('hex'), 'utf8');
    const signatureBuffer = Buffer.from(signature, 'utf8');

    if (digest.length !== signatureBuffer.length) {
      return false;
    }

    return crypto.timingSafeEqual(digest, signatureBuffer);
  } catch (err) {
    console.error('Signature verification error:', err);
    return false;
  }
}

/**
 * Creates a Lemon Squeezy hosted checkout URL for a selected variant and user.
 */
export async function createCheckoutSession({
  variantId,
  userId,
  userEmail,
  redirectUrl,
}: {
  variantId: string;
  userId: string;
  userEmail?: string;
  redirectUrl?: string;
}): Promise<string> {
  const apiKey = process.env.LEMONSQUEEZY_API_KEY;
  const storeId = process.env.LEMONSQUEEZY_STORE_ID;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

  if (!apiKey || !storeId) {
    throw new Error('Lemon Squeezy API Key or Store ID is not configured.');
  }

  const res = await fetch('https://api.lemonsqueezy.com/v1/checkouts', {
    method: 'POST',
    headers: {
      Accept: 'application/vnd.api+json',
      'Content-Type': 'application/vnd.api+json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      data: {
        type: 'checkouts',
        attributes: {
          product_options: {
            redirect_url: redirectUrl || `${appUrl}/dashboard?payment=success`,
          },
          checkout_data: {
            email: userEmail || undefined,
            custom: {
              user_id: userId,
            },
          },
        },
        relationships: {
          store: {
            data: {
              type: 'stores',
              id: String(storeId),
            },
          },
          variant: {
            data: {
              type: 'variants',
              id: String(variantId),
            },
          },
        },
      },
    }),
  });

  if (!res.ok) {
    const errorBody = await res.text();
    throw new Error(`Lemon Squeezy checkout error (${res.status}): ${errorBody}`);
  }

  const json = await res.json();
  return json?.data?.attributes?.url;
}
