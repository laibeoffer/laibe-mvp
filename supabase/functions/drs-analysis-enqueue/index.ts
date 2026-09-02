import type { SessionContext } from "../_shared/drs-auth/drs-session-bootstrap-bff.ts";
import {
  type AnalysisEnqueueRequest,
  canonicalRunKeySha256,
  parseAnalysisEnqueueRequest,
} from "../_shared/drs-analysis/contracts.ts";

export const VERIFY_JWT_REQUIRED = false;
const ENDPOINT_PATH = "/drs-analysis-enqueue";
const MAX_BODY_BYTES = 65_536;

export type AnalysisEnqueueRepositoryInput = Readonly<{
  principal: SessionContext;
  request: AnalysisEnqueueRequest;
  runKeySha256: string;
  enqueuePayloadSha256: string;
}>;

export interface AnalysisEnqueueRepository {
  enqueue(input: AnalysisEnqueueRepositoryInput): Promise<unknown>;
}

export type AnalysisEnqueueHandlerDependencies = Readonly<{
  resolveSessionContext(request: Request): Promise<SessionContext | null>;
  repository: AnalysisEnqueueRepository;
  logger?: Readonly<{
    info(code: string, fields: Readonly<Record<string, unknown>>): void;
  }>;
}>;

function jsonResponse(
  body: Readonly<Record<string, unknown>>,
  status: number,
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      "pragma": "no-cache",
      "x-content-type-options": "nosniff",
      "x-frame-options": "DENY",
      "referrer-policy": "no-referrer",
      "content-security-policy": "default-src 'none'; frame-ancestors 'none'",
    },
  });
}

function safeLog(
  dependencies: AnalysisEnqueueHandlerDependencies | undefined,
  code: string,
  status: number,
): void {
  dependencies?.logger?.info(code, Object.freeze({ status }));
}

async function readBody(request: Request): Promise<unknown> {
  if (
    request.headers.get("content-type")?.split(";", 1)[0].trim() !==
      "application/json"
  ) {
    throw new Error("INVALID_REQUEST");
  }
  const body = await request.text();
  if (
    body.length < 2 ||
    new TextEncoder().encode(body).byteLength > MAX_BODY_BYTES
  ) throw new Error("INVALID_REQUEST");
  try {
    return JSON.parse(body);
  } catch {
    throw new Error("INVALID_REQUEST");
  }
}

function validResult(
  value: unknown,
): value is Readonly<Record<string, unknown>> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }
  const result = value as Record<string, unknown>;
  return ["APPLIED", "REPLAYED", "IDEMPOTENCY_CONFLICT"].includes(
    String(result.state),
  ) && (result.newEffects === 0 || result.newEffects === 1) &&
    typeof result.runKeySha256 === "string";
}

export function createAnalysisEnqueueHandler(
  dependencies?: AnalysisEnqueueHandlerDependencies,
): (request: Request) => Promise<Response> {
  return async (request) => {
    try {
      const url = new URL(request.url);
      if (
        request.method !== "POST" || url.pathname !== ENDPOINT_PATH ||
        url.search.length !== 0 || url.hash.length !== 0
      ) throw new Error("INVALID_REQUEST");
      if (!dependencies) throw new Error("CONTEXT_UNAVAILABLE");
      const principal = await dependencies.resolveSessionContext(request);
      if (!principal || principal.role !== "drs") {
        throw new Error("AUTH_REQUIRED");
      }
      const parsed = parseAnalysisEnqueueRequest(
        await readBody(request),
        principal.caseId,
      );
      if (!parsed) throw new Error("INVALID_REQUEST");
      const runKeySha256 = await canonicalRunKeySha256(parsed);
      const result = await dependencies.repository.enqueue(Object.freeze({
        principal,
        request: parsed,
        runKeySha256,
        enqueuePayloadSha256: runKeySha256,
      }));
      if (!validResult(result) || result.runKeySha256 !== runKeySha256) {
        throw new Error("CONTEXT_UNAVAILABLE");
      }
      safeLog(dependencies, "DRS_ANALYSIS_ENQUEUED", 200);
      return jsonResponse({ result }, 200);
    } catch (error) {
      const code = error instanceof Error
        ? error.message
        : "CONTEXT_UNAVAILABLE";
      const status = code === "INVALID_REQUEST"
        ? 400
        : code === "AUTH_REQUIRED"
        ? 401
        : 503;
      safeLog(dependencies, `DRS_ANALYSIS_${code}`, status);
      return jsonResponse({ state: code }, status);
    }
  };
}

export const handler = createAnalysisEnqueueHandler();
if (import.meta.main) Deno.serve(handler);
