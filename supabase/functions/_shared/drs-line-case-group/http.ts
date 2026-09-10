export type RuntimeEnvironment = Readonly<{
  get(name: string): string | undefined;
}>;

export function runtimeEnvironment(): RuntimeEnvironment | null {
  const candidate = (globalThis as unknown as {
    Deno?: { env?: { get?: (name: string) => string | undefined } };
  }).Deno?.env;
  return typeof candidate?.get === "function"
    ? Object.freeze({ get: candidate.get.bind(candidate) })
    : null;
}

export function requiredEnvironment(
  env: RuntimeEnvironment,
  name: string,
): string {
  const value = env.get(name);
  if (!value || value.length > 16_384) throw new Error("runtime_unavailable");
  return value;
}

function allowedOrigins(env: RuntimeEnvironment): ReadonlySet<string> {
  const configured = (env.get("DRS_ALLOWED_ORIGINS") ?? "").split(",")
    .map((value) => value.trim()).filter(Boolean);
  const approved = new Set<string>();
  for (const value of configured) {
    try {
      const url = new URL(value);
      const local = url.protocol === "http:" &&
        ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
      if ((url.protocol === "https:" || local) && url.origin === value) {
        approved.add(value);
      }
    } catch {
      // Invalid configured origins are excluded rather than widened.
    }
  }
  return approved;
}

export function corsHeaders(
  request: Request,
  env: RuntimeEnvironment,
): Headers | null {
  const origin = request.headers.get("origin");
  if (!origin || !allowedOrigins(env).has(origin)) return null;
  return new Headers({
    "access-control-allow-origin": origin,
    "access-control-allow-methods": "POST, OPTIONS",
    "access-control-allow-headers": "authorization, content-type, apikey",
    "access-control-max-age": "600",
    vary: "Origin",
  });
}

export async function exactJsonBody(
  request: Request,
  maximumBytes = 4096,
): Promise<unknown | null> {
  const contentType = request.headers.get("content-type")?.split(";", 1)[0]
    .trim().toLowerCase();
  if (contentType !== "application/json") return null;
  try {
    const bytes = new Uint8Array(await request.arrayBuffer());
    if (bytes.byteLength === 0 || bytes.byteLength > maximumBytes) return null;
    return JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
  } catch {
    return null;
  }
}

export function json(
  body: Readonly<Record<string, unknown>>,
  status: number,
  cors?: Headers | null,
): Response {
  const headers = new Headers(cors ?? undefined);
  headers.set("content-type", "application/json; charset=utf-8");
  headers.set("cache-control", "no-store");
  headers.set("x-content-type-options", "nosniff");
  return new Response(JSON.stringify(body), { status, headers });
}

export function gatewayVerifiedServiceRole(request: Request): boolean {
  const token = request.headers.get("authorization")?.match(
    /^Bearer\s+([A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+)$/u,
  )?.[1];
  if (!token) return false;
  try {
    const encoded = token.split(".")[1].replaceAll("-", "+").replaceAll(
      "_",
      "/",
    );
    const parsed = JSON.parse(
      atob(encoded.padEnd(Math.ceil(encoded.length / 4) * 4, "=")),
    );
    return parsed !== null && typeof parsed === "object" &&
      !Array.isArray(parsed) &&
      Object.getOwnPropertyDescriptor(parsed, "role")?.value === "service_role";
  } catch {
    return false;
  }
}
