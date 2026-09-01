const TEXT_ENCODER = new TextEncoder();
const TEXT_DECODER = new TextDecoder("utf-8", { fatal: true });
const LINE_ID_AAD = TEXT_ENCODER.encode("laibe.drs-line-user-id.v1");

function ownedArrayBuffer(value: Uint8Array): ArrayBuffer {
  const copy = new Uint8Array(value.byteLength);
  copy.set(value);
  return copy.buffer;
}

function runtimeCrypto(): Crypto {
  const value = globalThis.crypto;
  if (!value?.subtle || typeof value.getRandomValues !== "function") {
    throw new Error("crypto_unavailable");
  }
  return value;
}

function bytesToBinary(value: Uint8Array): string {
  let result = "";
  for (let offset = 0; offset < value.length; offset += 0x8000) {
    result += String.fromCharCode(...value.subarray(offset, offset + 0x8000));
  }
  return result;
}

function binaryToBytes(value: string): Uint8Array {
  const result = new Uint8Array(value.length);
  for (let index = 0; index < value.length; index += 1) {
    result[index] = value.charCodeAt(index);
  }
  return result;
}

export function base64UrlEncode(value: Uint8Array): string {
  return btoa(bytesToBinary(value))
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replace(/=+$/u, "");
}

export function base64UrlDecode(value: string): Uint8Array {
  if (
    typeof value !== "string" || value.length === 0 || value.length > 16_384 ||
    !/^[A-Za-z0-9_-]+$/u.test(value) || value.length % 4 === 1
  ) throw new Error("invalid_base64url");
  try {
    const standard = value.replaceAll("-", "+").replaceAll("_", "/");
    const padded = standard.padEnd(Math.ceil(standard.length / 4) * 4, "=");
    const decoded = binaryToBytes(atob(padded));
    if (base64UrlEncode(decoded) !== value) {
      throw new Error("invalid_base64url");
    }
    return decoded;
  } catch {
    throw new Error("invalid_base64url");
  }
}

export function randomProtocolValue(bytes = 32): Uint8Array {
  if (!Number.isInteger(bytes) || bytes < 16 || bytes > 64) {
    throw new Error("invalid_protocol_size");
  }
  return runtimeCrypto().getRandomValues(new Uint8Array(bytes));
}

export async function hmacIdentityDigest(
  secret: string,
  value: string,
): Promise<string> {
  if (
    typeof secret !== "string" || secret.length < 16 || secret.length > 4096 ||
    typeof value !== "string" || value.length === 0 || value.length > 256
  ) throw new Error("invalid_identity_digest_input");
  const crypto = runtimeCrypto();
  const key = await crypto.subtle.importKey(
    "raw",
    TEXT_ENCODER.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const digest = await crypto.subtle.sign(
    "HMAC",
    key,
    TEXT_ENCODER.encode(value),
  );
  return base64UrlEncode(new Uint8Array(digest));
}

export async function importLineUserIdEncryptionKey(
  encodedKey: string,
): Promise<CryptoKey> {
  const bytes = base64UrlDecode(encodedKey);
  if (bytes.byteLength !== 32) throw new Error("invalid_encryption_key");
  return await runtimeCrypto().subtle.importKey(
    "raw",
    ownedArrayBuffer(bytes),
    "AES-GCM",
    false,
    ["encrypt", "decrypt"],
  );
}

export async function encryptLineUserId(
  key: CryptoKey,
  value: string,
): Promise<Readonly<{ ciphertext: string; iv: string }>> {
  if (!/^U[0-9a-f]{32}$/u.test(value)) throw new Error("invalid_line_user_id");
  const crypto = runtimeCrypto();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = await crypto.subtle.encrypt(
    {
      name: "AES-GCM",
      iv: ownedArrayBuffer(iv),
      additionalData: ownedArrayBuffer(LINE_ID_AAD),
      tagLength: 128,
    },
    key,
    TEXT_ENCODER.encode(value),
  );
  return Object.freeze({
    ciphertext: base64UrlEncode(new Uint8Array(ciphertext)),
    iv: base64UrlEncode(iv),
  });
}

export async function decryptLineUserId(
  key: CryptoKey,
  envelope: Readonly<{ ciphertext: string; iv: string }>,
): Promise<string> {
  if (
    envelope === null || typeof envelope !== "object" ||
    Object.keys(envelope).length !== 2 ||
    !Object.prototype.hasOwnProperty.call(envelope, "ciphertext") ||
    !Object.prototype.hasOwnProperty.call(envelope, "iv")
  ) throw new Error("invalid_encryption_envelope");
  const ciphertext = base64UrlDecode(envelope.ciphertext);
  const iv = base64UrlDecode(envelope.iv);
  if (iv.byteLength !== 12 || ciphertext.byteLength < 17) {
    throw new Error("invalid_encryption_envelope");
  }
  const plaintext = await runtimeCrypto().subtle.decrypt(
    {
      name: "AES-GCM",
      iv: ownedArrayBuffer(iv),
      additionalData: ownedArrayBuffer(LINE_ID_AAD),
      tagLength: 128,
    },
    key,
    ownedArrayBuffer(ciphertext),
  );
  const value = TEXT_DECODER.decode(plaintext);
  if (!/^U[0-9a-f]{32}$/u.test(value)) throw new Error("invalid_line_user_id");
  return value;
}
