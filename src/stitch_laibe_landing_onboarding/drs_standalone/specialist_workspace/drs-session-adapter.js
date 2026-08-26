const ACCESS_TOKEN = /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/u;
const RFC3339 = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2})$/u;
const SESSION_BOOTSTRAP_ENDPOINT = "/functions/v1/drs-session-bootstrap";

function expirationTime(value) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value < 1_000_000_000_000 ? value * 1000 : value;
  }
  if (typeof value !== "string" || !RFC3339.test(value)) return null;
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? timestamp : null;
}

function hasExactSessionShape(value) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return false;
  const keys = Object.keys(value);
  return keys.length === 2 && keys.includes("accessToken") && keys.includes("expiresAt");
}

export function createDrsSessionHeadersResolver({ resolveVerifiedDrsSession, now = Date.now } = {}) {
  return async function resolveSessionHeaders() {
    if (typeof resolveVerifiedDrsSession !== "function" || typeof now !== "function") return null;
    let session;
    try {
      session = await resolveVerifiedDrsSession();
    } catch {
      return null;
    }
    if (!hasExactSessionShape(session) || typeof session.accessToken !== "string" || !ACCESS_TOKEN.test(session.accessToken)) return null;
    const expiresAt = expirationTime(session.expiresAt);
    let currentTime;
    try {
      currentTime = Number(now());
    } catch {
      return null;
    }
    if (!Number.isFinite(currentTime) || expiresAt === null || expiresAt <= currentTime) return null;
    return Object.freeze({ authorization: `Bearer ${session.accessToken}` });
  };
}

export function createDrsSessionBootstrapResolver({ fetchImplementation } = {}) {
  return async function resolveVerifiedDrsSession() {
    if (typeof fetchImplementation !== "function") return null;
    let response;
    try {
      response = await fetchImplementation(SESSION_BOOTSTRAP_ENDPOINT, {
        method: "POST",
        credentials: "same-origin",
        headers: Object.freeze({ "content-type": "application/json" }),
        body: "{}",
      });
    } catch {
      return null;
    }
    if (response?.status !== 204 || !response.headers || typeof response.headers.get !== "function") return null;
    const authorization = response.headers.get("authorization") ?? "";
    const expiresAt = response.headers.get("x-laibe-session-expires-at");
    if (!authorization.startsWith("Bearer ") || typeof expiresAt !== "string") return null;
    const accessToken = authorization.slice(7);
    if (!ACCESS_TOKEN.test(accessToken) || expirationTime(expiresAt) === null) return null;
    return Object.freeze({ accessToken, expiresAt });
  };
}
