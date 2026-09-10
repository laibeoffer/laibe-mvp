import {
  base64UrlDecode,
  base64UrlEncode,
  hmacIdentityDigest,
  randomProtocolValue,
} from "../drs-line-account-link/crypto.ts";

export { base64UrlEncode, hmacIdentityDigest, randomProtocolValue };

const ENCODER = new TextEncoder();
const DECODER = new TextDecoder("utf-8", { fatal: true });
const GROUP_ID_AAD = ENCODER.encode("laibe.drs-line-case-group-id.v1");
const GROUP_ID = /^C[0-9a-f]{32}$/u;

function owned(value: Uint8Array): ArrayBuffer {
  const copy = new Uint8Array(value.byteLength);
  copy.set(value);
  return copy.buffer;
}

function runtimeCrypto(): Crypto {
  if (
    !globalThis.crypto?.subtle ||
    typeof globalThis.crypto.getRandomValues !== "function"
  ) {
    throw new Error("crypto_unavailable");
  }
  return globalThis.crypto;
}

export async function importLineGroupEncryptionKey(
  encodedKey: string,
): Promise<CryptoKey> {
  const bytes = base64UrlDecode(encodedKey);
  if (bytes.byteLength !== 32) throw new Error("invalid_encryption_key");
  return await runtimeCrypto().subtle.importKey(
    "raw",
    owned(bytes),
    "AES-GCM",
    false,
    ["encrypt", "decrypt"],
  );
}

export async function encryptLineGroupId(
  key: CryptoKey,
  lineGroupId: string,
): Promise<Readonly<{ ciphertext: string; iv: string }>> {
  if (!GROUP_ID.test(lineGroupId)) throw new Error("invalid_line_group_id");
  const crypto = runtimeCrypto();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt(
    {
      name: "AES-GCM",
      iv: owned(iv),
      additionalData: owned(GROUP_ID_AAD),
      tagLength: 128,
    },
    key,
    ENCODER.encode(lineGroupId),
  );
  return Object.freeze({
    ciphertext: base64UrlEncode(new Uint8Array(encrypted)),
    iv: base64UrlEncode(iv),
  });
}

export async function decryptLineGroupId(
  key: CryptoKey,
  envelope: Readonly<{ ciphertext: string; iv: string }>,
): Promise<string> {
  if (
    envelope === null || typeof envelope !== "object" ||
    Object.keys(envelope).sort().join(",") !== "ciphertext,iv" ||
    typeof envelope.ciphertext !== "string" || typeof envelope.iv !== "string"
  ) throw new Error("invalid_encryption_envelope");
  const ciphertext = base64UrlDecode(envelope.ciphertext);
  const iv = base64UrlDecode(envelope.iv);
  if (iv.byteLength !== 12 || ciphertext.byteLength < 17) {
    throw new Error("invalid_encryption_envelope");
  }
  const plaintext = await runtimeCrypto().subtle.decrypt(
    {
      name: "AES-GCM",
      iv: owned(iv),
      additionalData: owned(GROUP_ID_AAD),
      tagLength: 128,
    },
    key,
    owned(ciphertext),
  );
  const lineGroupId = DECODER.decode(plaintext);
  if (!GROUP_ID.test(lineGroupId)) throw new Error("invalid_line_group_id");
  return lineGroupId;
}
