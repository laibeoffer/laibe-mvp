import type { FetchLike, RuntimeEnvironment } from "../drs-auth/contracts.ts";
import { createDrsSecureSessionRuntime } from "../drs-auth/drs-secure-session-runtime.ts";
import { createDrsBffGuard } from "../drs-auth/drs-session-bootstrap-bff.ts";
import { createSupabaseDrsVersionedWorkspaceGrantResolver } from "../drs-auth/versioned-workspace-grant.ts";
import { createDocumentAuthorityResolver } from "./authority.ts";
import { createDrsDocumentScannerRuntime } from "./drs-document-scanner-runtime.ts";
import {
  createDocumentStorageService,
  type DocumentEdgeDependencies,
} from "./service.ts";
import { createSupabaseDocumentRepository } from "./supabase-document-adapter.ts";
import { createSupabaseDocumentStoragePort } from "./supabase-storage-adapter.ts";
import type {
  DocumentRepositoryPort,
  DocumentScannerPort,
  DocumentStoragePort,
} from "./ports.ts";
import type { DocumentRoute } from "./request-guard.ts";

const MAX_JSON_RESPONSE_BYTES = 64 * 1024;
const MAX_REQUEST_BYTES = 64 * 1024;
const FETCH_TIMEOUT_MS = 15_000;
const ROUTE_PATHS = Object.freeze(
  {
    uploadIntent: "/functions/v1/drs-document-upload-intent",
    finalize: "/functions/v1/drs-document-upload-finalize",
    download: "/functions/v1/drs-document-version-download",
    snapshot: "/functions/v1/drs-document-snapshot",
  } satisfies Readonly<Record<DocumentRoute, string>>,
);
const RPC_PATH =
  /^\/rest\/v1\/rpc\/(?:drs_workspace_grant_v1|drs_server_session_issue_v1|drs_server_session_verify_v1|drs_server_session_revoke_v1|drs_workspace_grant_v2|server_document_operation_v1)$/u;
const STORAGE_SIGN_PATH =
  /^\/storage\/v1\/object\/upload\/sign\/drs-case-intake-private\/[A-Za-z0-9%/_-]+\.(?:pdf|jpg|jpeg|png)$/u;
const STORAGE_OBJECT_PATH =
  /^\/storage\/v1\/object\/authenticated\/(?:drs-case-intake-private|drs-case-records-private)\/[A-Za-z0-9%/_-]+\.(?:pdf|jpg|jpeg|png)$/u;

export type DrsDocumentEdgeRuntimeOptions = Readonly<{
  env?: RuntimeEnvironment;
  fetch?: FetchLike;
  crypto?: Crypto;
  now?: () => Date;
}>;

function readEnvironment(
  explicit: RuntimeEnvironment | undefined,
  name: string,
): string | undefined {
  try {
    if (explicit) return explicit.get(name);
    const runtime = globalThis as typeof globalThis & {
      Deno?: { env?: RuntimeEnvironment };
    };
    return runtime.Deno?.env?.get(name);
  } catch {
    return undefined;
  }
}

function exactOrigin(value: unknown, httpsOnly: boolean): string | null {
  if (typeof value !== "string") return null;
  try {
    const url = new URL(value);
    const loopback = url.protocol === "http:" &&
      (url.hostname === "127.0.0.1" || url.hostname === "[::1]");
    if (
      url.origin !== value || url.username || url.password || url.search ||
      url.hash || (httpsOnly
        ? url.protocol !== "https:"
        : url.protocol !== "https:" && !loopback)
    ) {
      return null;
    }
    return value;
  } catch {
    return null;
  }
}

function requestBodyBytes(body: BodyInit | null | undefined): number | null {
  if (body === undefined || body === null) return 0;
  if (typeof body === "string") {
    return new TextEncoder().encode(body).byteLength;
  }
  if (body instanceof Uint8Array) return body.byteLength;
  if (body instanceof ArrayBuffer) return body.byteLength;
  if (ArrayBuffer.isView(body)) return body.byteLength;
  return null;
}

async function readBoundedResponse(
  response: Response,
  maximumBytes: number,
): Promise<Uint8Array | null> {
  const declared = response.headers.get("content-length");
  if (declared !== null) {
    if (
      !/^(?:0|[1-9]\d*)$/u.test(declared) || Number(declared) > maximumBytes
    ) {
      await response.body?.cancel().catch(() => undefined);
      return null;
    }
  }
  if (!response.body) return new Uint8Array();
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (
        !(value instanceof Uint8Array) ||
        total + value.byteLength > maximumBytes
      ) {
        await reader.cancel().catch(() => undefined);
        return null;
      }
      total += value.byteLength;
      chunks.push(value);
    }
  } catch {
    await reader.cancel().catch(() => undefined);
    return null;
  } finally {
    reader.releaseLock();
  }
  if (declared !== null && Number(declared) !== total) return null;
  const output = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    output.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return output;
}

function wrapTimedBody(
  response: Response,
  release: () => void,
): Response | null {
  if (!response.body) {
    release();
    return null;
  }
  const reader = response.body.getReader();
  const body = new ReadableStream<Uint8Array>({
    async pull(controller) {
      try {
        const { done, value } = await reader.read();
        if (done) {
          release();
          reader.releaseLock();
          controller.close();
          return;
        }
        if (!(value instanceof Uint8Array)) {
          throw new TypeError("INVALID_CHUNK");
        }
        controller.enqueue(value);
      } catch (failure) {
        release();
        await reader.cancel().catch(() => undefined);
        reader.releaseLock();
        controller.error(failure);
      }
    },
    async cancel(reason) {
      release();
      await reader.cancel(reason).catch(() => undefined);
      reader.releaseLock();
    },
  });
  return new Response(body, {
    status: response.status,
    statusText: response.statusText,
    headers: response.headers,
  });
}

function createBoundedSupabaseFetch(
  supabaseOrigin: string,
  implementation: FetchLike,
): FetchLike {
  return async (input, init = {}) => {
    const request = input instanceof Request ? input : null;
    const url = new URL(
      typeof input === "string" || input instanceof URL ? input : input.url,
    );
    const method = (init.method ?? request?.method ?? "GET").toUpperCase();
    const rpc = RPC_PATH.test(url.pathname) && method === "POST";
    const signed = STORAGE_SIGN_PATH.test(url.pathname) && method === "POST";
    const object = STORAGE_OBJECT_PATH.test(url.pathname) && method === "GET";
    const requestBytes = requestBodyBytes(init.body ?? request?.body);
    if (
      url.origin !== supabaseOrigin || url.search || url.hash || url.username ||
      url.password || (!rpc && !signed && !object) || requestBytes === null ||
      requestBytes > MAX_REQUEST_BYTES
    ) throw new TypeError("CONTEXT_UNAVAILABLE");

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    const external = init.signal ?? request?.signal;
    const abort = () => controller.abort();
    const release = () => {
      clearTimeout(timer);
      external?.removeEventListener("abort", abort);
    };
    external?.addEventListener("abort", abort, { once: true });
    try {
      const response = await implementation(input, {
        ...init,
        redirect: "error",
        signal: controller.signal,
      });
      if (response.redirected) throw new TypeError("CONTEXT_UNAVAILABLE");
      if (object) {
        const wrapped = wrapTimedBody(response, release);
        if (!wrapped) throw new TypeError("CONTEXT_UNAVAILABLE");
        return wrapped;
      }
      const bytes = await readBoundedResponse(
        response,
        MAX_JSON_RESPONSE_BYTES,
      );
      release();
      if (!bytes) throw new TypeError("CONTEXT_UNAVAILABLE");
      const responseBody = bytes.buffer.slice(
        bytes.byteOffset,
        bytes.byteOffset + bytes.byteLength,
      ) as ArrayBuffer;
      return new Response(responseBody, {
        status: response.status,
        statusText: response.statusText,
        headers: response.headers,
      });
    } catch {
      release();
      throw new TypeError("CONTEXT_UNAVAILABLE");
    }
  };
}

function unavailableDependencies(): DocumentEdgeDependencies {
  const repository: DocumentRepositoryPort = Object.freeze({
    runtimeAvailable: false,
    execute: () => Promise.resolve(null),
    queueOrphanCleanup: () => Promise.resolve(null),
  });
  const storage: DocumentStoragePort = Object.freeze({
    runtimeAvailable: false,
    createSignedUpload: () => Promise.resolve(null),
    inspect: () => Promise.resolve(null),
    promote: () => Promise.resolve(false),
    download: () => Promise.resolve(null),
  });
  const scanner: DocumentScannerPort = Object.freeze({
    runtimeAvailable: false,
    scan: () => Promise.resolve(null),
  });
  return Object.freeze({
    allowedOrigins: Object.freeze([]),
    authority: createDocumentAuthorityResolver(),
    service: createDocumentStorageService({ repository, storage, scanner }),
  });
}

export function createDrsDocumentEdgeRuntime(
  route: DocumentRoute,
  functionPath: string,
  options: DrsDocumentEdgeRuntimeOptions = {},
): DocumentEdgeDependencies {
  try {
    if (ROUTE_PATHS[route] !== functionPath) return unavailableDependencies();
    const appOrigin = exactOrigin(
      readEnvironment(options.env, "LAIBE_DRS_APP_ORIGIN"),
      true,
    );
    const supabaseOrigin = exactOrigin(
      readEnvironment(options.env, "SUPABASE_URL"),
      false,
    );
    const fetchImplementation = options.fetch ?? globalThis.fetch;
    if (
      !appOrigin || !supabaseOrigin || typeof fetchImplementation !== "function"
    ) {
      return unavailableDependencies();
    }
    const boundedSupabaseFetch = createBoundedSupabaseFetch(
      supabaseOrigin,
      fetchImplementation,
    );
    const secureRuntime = createDrsSecureSessionRuntime({
      env: options.env,
      fetch: boundedSupabaseFetch,
      crypto: options.crypto,
      now: options.now,
    });
    const bffGuard = createDrsBffGuard(
      secureRuntime.bootstrapDependencies,
      Object.freeze({
        method: route === "download" ? "GET" : "POST",
        pathname: functionPath,
        queryFields: Object.freeze([]),
        jsonBodyFields: route === "download" ? null : Object.freeze([]),
      }),
    );
    const versionedGrantResolver =
      createSupabaseDrsVersionedWorkspaceGrantResolver({
        env: options.env,
        fetch: boundedSupabaseFetch,
      });
    const authority = createDocumentAuthorityResolver({
      bffGuard,
      versionedGrantResolver,
    });
    const repository = createSupabaseDocumentRepository({
      env: options.env,
      fetch: boundedSupabaseFetch,
    });
    const storage = createSupabaseDocumentStoragePort({
      env: options.env,
      fetch: boundedSupabaseFetch,
      now: options.now,
    });
    const scanner = createDrsDocumentScannerRuntime({
      env: options.env,
      fetch: fetchImplementation,
      crypto: options.crypto,
    });
    if (
      secureRuntime.runtimeAvailable !== true ||
      authority.runtimeAvailable !== true ||
      repository.runtimeAvailable !== true ||
      storage.runtimeAvailable !== true ||
      scanner.runtimeAvailable !== true
    ) return unavailableDependencies();
    return Object.freeze({
      allowedOrigins: Object.freeze([appOrigin]),
      authority,
      service: createDocumentStorageService({ repository, storage, scanner }),
    });
  } catch {
    return unavailableDependencies();
  }
}
