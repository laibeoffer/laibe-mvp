import { createHmac, timingSafeEqual } from 'node:crypto';

const CANONICAL_BASE64 = /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/;

export function computeLineSignature(rawBody, channelSecret) {
  return createHmac('sha256', channelSecret).update(rawBody).digest();
}

export function verifyLineSignature(rawBody, providedSignature, channelSecret) {
  if (typeof providedSignature !== 'string' || providedSignature.length === 0) {
    return false;
  }
  if (providedSignature.length % 4 !== 0 || !CANONICAL_BASE64.test(providedSignature)) {
    return false;
  }

  const expected = computeLineSignature(rawBody, channelSecret);
  let provided;
  try {
    provided = Buffer.from(providedSignature, 'base64');
  } catch {
    return false;
  }

  if (provided.toString('base64') !== providedSignature) return false;
  if (provided.length !== expected.length) return false;
  return timingSafeEqual(provided, expected);
}
