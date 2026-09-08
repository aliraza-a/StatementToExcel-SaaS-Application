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
    priceIdEnvKey: 'PADDLE_PRICE_ID_ONETIME',
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
    priceIdEnvKey: 'PADDLE_PRICE_ID_LIFETIME',
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
    priceIdEnvKey: 'PADDLE_PRICE_ID_PRO_MONTHLY',
  },
];

/**
 * Verifies Paddle Billing HMAC SHA-256 webhook signature.
 * Header format: ts=1671552777;h1=0123456789abcdef...
 * Signed payload: {ts}:{rawBody}
 */
export function verifyPaddleSignature(rawBody: string, signatureHeader: string | null | undefined): boolean {
  const secret = process.env.PADDLE_WEBHOOK_SECRET;
  if (!secret || !signatureHeader || !rawBody) {
    return false;
  }

  try {
    // Parse ts and h1 from header: "ts=1671552777;h1=0123456789abcdef..."
    const parts = signatureHeader.split(';');
    let ts = '';
    let h1 = '';

    for (const part of parts) {
      const [key, value] = part.trim().split('=');
      if (key === 'ts') ts = value;
      if (key === 'h1') h1 = value;
    }

    if (!ts || !h1) {
      return false;
    }

    // Construct the signed payload string
    const signedPayload = `${ts}:${rawBody}`;

    // Compute expected HMAC SHA-256 digest
    const hmac = crypto.createHmac('sha256', secret);
    const calculatedDigest = hmac.update(signedPayload).digest('hex');

    const digestBuffer = Buffer.from(calculatedDigest, 'utf8');
    const signatureBuffer = Buffer.from(h1, 'utf8');

    if (digestBuffer.length !== signatureBuffer.length) {
      return false;
    }

    return crypto.timingSafeEqual(digestBuffer, signatureBuffer);
  } catch (err) {
    console.error('Paddle signature verification error:', err);
    return false;
  }
}

/**
 * Creates a Paddle Billing transaction and returns the checkout URL.
 */
export async function createPaddleCheckoutSession({
  priceId,
  userId,
  userEmail,
  redirectUrl,
}: {
  priceId: string;
  userId: string;
  userEmail?: string;
  redirectUrl?: string;
}): Promise<string> {
  const apiKey = process.env.PADDLE_API_KEY;
  const isSandbox = (process.env.PADDLE_ENVIRONMENT || '').toLowerCase() === 'sandbox';
  const baseUrl = isSandbox ? 'https://sandbox-api.paddle.com' : 'https://api.paddle.com';
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

  if (!apiKey) {
    throw new Error('PADDLE_API_KEY is not configured in environment variables.');
  }

  const payload: any = {
    items: [
      {
        price_id: priceId,
        quantity: 1,
      },
    ],
    custom_data: {
      user_id: userId,
    },
    checkout: {
      success_url: redirectUrl || `${appUrl}/dashboard?payment=success`,
    },
  };

  const response = await fetch(`${baseUrl}/transactions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  const resText = await response.text();
  let json: any;
  try {
    json = JSON.parse(resText);
  } catch {
    throw new Error(`Paddle API returned non-JSON response (${response.status}): ${resText.slice(0, 150)}`);
  }

  if (!response.ok) {
    const errorMsg = json?.error?.detail || json?.error?.message || response.statusText;
    throw new Error(`Paddle Transaction Error: ${errorMsg}`);
  }

  const checkoutUrl = json?.data?.checkout?.url;
  if (!checkoutUrl) {
    // If no direct URL, Paddle transactions can be opened via transaction ID in Paddle.js
    const txnId = json?.data?.id;
    if (txnId) {
      // Fallback redirect URL format or return txnId
      return `${baseUrl}/checkout/${txnId}`;
    }
    throw new Error('Paddle transaction did not return a checkout URL or ID.');
  }

  return checkoutUrl;
}
