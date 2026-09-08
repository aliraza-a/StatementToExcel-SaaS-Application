import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'crypto';

function verifyLemonSqueezySignature(rawBody, signature, secret) {
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
  } catch {
    return false;
  }
}

test('verifyLemonSqueezySignature accepts valid signatures and rejects tampered bodies', () => {
  const secret = 'test_webhook_secret_key_12345';
  const validPayload = JSON.stringify({
    meta: { event_name: 'order_created' },
    data: { id: 'order-101', attributes: { total: 2900 } },
  });

  // Generate genuine HMAC signature
  const hmac = crypto.createHmac('sha256', secret);
  const validSignature = hmac.update(validPayload).digest('hex');

  // 1. Valid signature passes
  assert.equal(verifyLemonSqueezySignature(validPayload, validSignature, secret), true);

  // 2. Tampered payload fails
  const tamperedPayload = validPayload.replace('order-101', 'order-999');
  assert.equal(verifyLemonSqueezySignature(tamperedPayload, validSignature, secret), false);

  // 3. Altered secret fails
  assert.equal(verifyLemonSqueezySignature(validPayload, validSignature, 'wrong_secret'), false);

  // 4. Missing secret or signature fails safely
  assert.equal(verifyLemonSqueezySignature(validPayload, '', secret), false);
  assert.equal(verifyLemonSqueezySignature(validPayload, validSignature, null), false);
  assert.equal(verifyLemonSqueezySignature(validPayload, validSignature, undefined), false);
});
