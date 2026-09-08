export type VerifiedAuthSession = Readonly<{
  userId: string;
  authSessionId: string;
  expiresAtEpochSeconds: number;
}>;

export type VerifiedAuthSessionResult =
  | Readonly<{ state: "verified"; session: VerifiedAuthSession }>
  | Readonly<{ state: "denied" }>
  | Readonly<{ state: "unavailable" }>;

type Options = Readonly<{
  supabaseUrl: string;
  serviceRoleKey: string;
  fetch?: typeof globalThis.fetch;
  now?: () => number;
}>;

const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;
const DENIED = Object.freeze({ state: "denied" } as const);
const UNAVAILABLE = Object.freeze({ state: "unavailable" } as const);

function object(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function claims(token: string): Record<string, unknown> | null {
  if (token.length > 16_384) return null;
  const parts = token.split(".");
  if (
    parts.length !== 3 || parts.some((part) => !/^[A-Za-z0-9_-]+$/u.test(part))
  ) return null;
  try {
    const base64 = parts[1].replaceAll("-", "+").replaceAll("_", "/");
    const bytes = Uint8Array.from(
      atob(base64),
      (character) => character.charCodeAt(0),
    );
    return object(
      JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes)),
    );
  } catch {
    return null;
  }
}

async function boundedJson(
  response: Response,
  limit: number,
): Promise<unknown> {
  if (!response.body) throw new Error("Missing response");
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let length = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      length += value.length;
      if (length > limit) throw new Error("Response exceeds limit");
      chunks.push(value);
    }
  } finally {
    await reader.cancel();
    reader.releaseLock();
  }
  const bytes = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.length;
  }
  return JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
}

export async function verifyAuthSession(
  request: Request,
  options: Options,
): Promise<VerifiedAuthSessionResult> {
  const token = request.headers.get("authorization")?.match(
    /^Bearer\s+([^\s]+)$/u,
  )?.[1];
  if (!token) return DENIED;
  const candidate = claims(token);
  if (!candidate) return DENIED;
  try {
    const url = new URL(options.supabaseUrl);
    const localHttp = url.protocol === "http:" &&
      ["127.0.0.1", "[::1]", "localhost"].includes(url.hostname);
    if (
      (!localHttp && url.protocol !== "https:") ||
      url.origin !== options.supabaseUrl || !options.serviceRoleKey
    ) return UNAVAILABLE;
    const now = options.now ?? Date.now;
    const expiration = candidate.exp;
    if (
      candidate.iss !== `${url.origin}/auth/v1` ||
      candidate.aud !== "authenticated" ||
      typeof candidate.sub !== "string" || !UUID.test(candidate.sub) ||
      typeof candidate.session_id !== "string" ||
      !UUID.test(candidate.session_id) ||
      !Number.isSafeInteger(expiration) ||
      (expiration as number) <= Math.floor(now() / 1000)
    ) return DENIED;

    const fetchImplementation = options.fetch ?? globalThis.fetch;
    // Decoded claims only reject input; Auth must verify the original token before any session lookup.
    const auth = await fetchImplementation(`${url.origin}/auth/v1/user`, {
      method: "GET",
      redirect: "error",
      signal: AbortSignal.timeout(5_000),
      headers: {
        authorization: `Bearer ${token}`,
        apikey: options.serviceRoleKey,
      },
    });
    if (!auth.ok) {
      await auth.body?.cancel();
      return auth.status === 401 || auth.status === 403 ? DENIED : UNAVAILABLE;
    }
    const user = object(await boundedJson(auth, 65_536));
    if (typeof user?.id !== "string" || !UUID.test(user.id)) return UNAVAILABLE;
    if (user.id !== candidate.sub) return DENIED;

    const response = await fetchImplementation(
      `${url.origin}/rest/v1/rpc/auth_session_validation_v1`,
      {
        method: "POST",
        redirect: "error",
        signal: AbortSignal.timeout(5_000),
        headers: {
          authorization: `Bearer ${options.serviceRoleKey}`,
          apikey: options.serviceRoleKey,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          p_authenticated_user_id: user.id,
          p_auth_session_id: candidate.session_id,
        }),
      },
    );
    if (!response.ok) {
      await response.body?.cancel();
      return UNAVAILABLE;
    }
    const result = object(await boundedJson(response, 1_024));
    if (
      !result ||
      Object.keys(result).sort().join(",") !== "active,schemaVersion" ||
      result.schemaVersion !== "laibe.auth-session-validation.v1" ||
      typeof result.active !== "boolean"
    ) return UNAVAILABLE;
    if (!result.active || (expiration as number) <= Math.floor(now() / 1000)) {
      return DENIED;
    }
    return Object.freeze({
      state: "verified",
      session: Object.freeze({
        userId: user.id,
        authSessionId: candidate.session_id,
        expiresAtEpochSeconds: expiration as number,
      }),
    });
  } catch {
    return UNAVAILABLE;
  }
}
