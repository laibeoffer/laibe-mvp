const TEXT_ENCODER = new TextEncoder();

function ownedArrayBuffer(value: Uint8Array): ArrayBuffer {
  const copy = new Uint8Array(value.byteLength);
  copy.set(value);
  return copy.buffer;
}

function decodeCanonicalSignature(value: string): Uint8Array | null {
  if (
    value.length !== 44 ||
    !/^(?:[A-Za-z0-9+/]{4}){10}[A-Za-z0-9+/]{3}=$/u.test(value)
  ) return null;
  try {
    const binary = atob(value);
    if (binary.length !== 32) return null;
    const bytes = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index += 1) {
      bytes[index] = binary.charCodeAt(index);
    }
    let canonical = "";
    for (const byte of bytes) canonical += String.fromCharCode(byte);
    return btoa(canonical) === value ? bytes : null;
  } catch {
    return null;
  }
}

function constantTimeEqual(left: Uint8Array, right: Uint8Array): boolean {
  if (left.byteLength !== right.byteLength) return false;
  let difference = 0;
  for (let index = 0; index < left.byteLength; index += 1) {
    difference |= left[index] ^ right[index];
  }
  return difference === 0;
}

export async function verifyLineSignature(
  rawBody: Uint8Array,
  signatureHeader: string | null,
  channelSecret: string,
): Promise<boolean> {
  try {
    if (
      !(rawBody instanceof Uint8Array) || rawBody.byteLength > 1_048_576 ||
      typeof signatureHeader !== "string" ||
      typeof channelSecret !== "string" || channelSecret.length < 16 ||
      channelSecret.length > 4096
    ) return false;
    const supplied = decodeCanonicalSignature(signatureHeader);
    if (!supplied) return false;
    const key = await globalThis.crypto.subtle.importKey(
      "raw",
      TEXT_ENCODER.encode(channelSecret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"],
    );
    const expected = new Uint8Array(
      await globalThis.crypto.subtle.sign(
        "HMAC",
        key,
        ownedArrayBuffer(rawBody),
      ),
    );
    return constantTimeEqual(expected, supplied);
  } catch {
    return false;
  }
}
