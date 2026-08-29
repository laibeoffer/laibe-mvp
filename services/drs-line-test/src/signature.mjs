import { createHmac, timingSafeEqual } from 'node:crypto';

export function computeLineSignature(rawBody, channelSecret) {
  return createHmac('sha256', channelSecret).update(rawBody).digest();
}

export function verifyLineSignature(rawBody, providedSignature, channelSecret) {
  if (typeof providedSignature !== 'string' || providedSignature.length === 0) {
    return false;
  }

  const expected = computeLineSignature(rawBody, channelSecret);
  let provided;
  try {
    provided = Buffer.from(providedSignature, 'base64');
  } catch {
    return false;
  }

  if (provided.length !== expected.length) return false;
  return timingSafeEqual(provided, expected);
}
