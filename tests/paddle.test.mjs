import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'crypto';

function verifyPaddleSignature(rawBody, signatureHeader, secret) {
  if (!secret || !signatureHeader || !rawBody) {
    return false;
  }

  try {
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

    const signedPayload = `${ts}:${rawBody}`;
    const hmac = crypto.createHmac('sha256', secret);
    const calculatedDigest = hmac.update(signedPayload).digest('hex');

    const digestBuffer = Buffer.from(calculatedDigest, 'utf8');
    const signatureBuffer = Buffer.from(h1, 'utf8');

    if (digestBuffer.length !== signatureBuffer.length) {
      return false;
    }

    return crypto.timingSafeEqual(digestBuffer, signatureBuffer);
  } catch {
    return false;
  }
}

test('verifyPaddleSignature accepts valid ts;h1 signatures and rejects tampered bodies', () => {
  const secret = 'pdl_ntf_set_01hqtestsecretkey123456';
  const ts = '1725800000';
  const validPayload = JSON.stringify({
    event_type: 'transaction.completed',
    data: {
      id: 'txn_01j7890abcdef',
      status: 'completed',
      custom_data: { user_id: 'user_12345' },
      details: { totals: { total: '2900' } },
    },
  });

  // Calculate genuine Paddle HMAC signature: hmac-sha256(secret, `${ts}:${payload}`)
  const signedPayload = `${ts}:${validPayload}`;
  const h1 = crypto.createHmac('sha256', secret).update(signedPayload).digest('hex');
  const signatureHeader = `ts=${ts};h1=${h1}`;

  // 1. Valid signature passes
  assert.equal(verifyPaddleSignature(validPayload, signatureHeader, secret), true);

  // 2. Tampered payload fails
  const tamperedPayload = validPayload.replace('txn_01j7890abcdef', 'txn_HACKED');
  assert.equal(verifyPaddleSignature(tamperedPayload, signatureHeader, secret), false);

  // 3. Altered secret fails
  assert.equal(verifyPaddleSignature(validPayload, signatureHeader, 'wrong_secret'), false);

  // 4. Altered timestamp in header fails
  assert.equal(verifyPaddleSignature(validPayload, `ts=9999999999;h1=${h1}`, secret), false);

  // 5. Malformed header fails safely
  assert.equal(verifyPaddleSignature(validPayload, 'malformed-signature-without-h1', secret), false);
  assert.equal(verifyPaddleSignature(validPayload, '', secret), false);
  assert.equal(verifyPaddleSignature(validPayload, signatureHeader, null), false);
});
