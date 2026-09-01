import { DrsIdentityError } from "../drs-auth/contracts.ts";
import type { DrsBffGuard } from "../drs-auth/drs-session-bootstrap-bff.ts";
import type { LineAccountLinkService } from "./service.ts";

type Dependencies = Readonly<{
  allowedOrigin: string;
  guard: DrsBffGuard;
  service: LineAccountLinkService;
}>;

const JSON_HEADERS = Object.freeze({
  "cache-control": "no-store",
  "content-type": "application/json; charset=utf-8",
  "x-content-type-options": "nosniff",
});

const LINE_LINK_STATUS_PATH = "/functions/v1/drs-line-account-link-status";

function hasUnsafeLinkTokenByte(value: string): boolean {
  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index);
    if (code <= 32 || code === 127) return true;
  }
  return false;
}

function json(state: unknown, status = 200): Response {
  return new Response(JSON.stringify(state), { status, headers: JSON_HEADERS });
}

async function exactRequest(
  request: Request,
  allowedOrigin: string,
  method: "GET" | "POST",
  pathname: string,
  queryName?: "linkToken",
): Promise<string | null> {
  const url = new URL(request.url);
  if (request.method !== method || url.pathname !== pathname) {
    throw new DrsIdentityError("INVALID_REQUEST", 400);
  }
  const origin = request.headers.get("origin");
  const isSameOriginStatusGet = method === "GET" &&
    pathname === LINE_LINK_STATUS_PATH &&
    request.headers.get("sec-fetch-site") === "same-origin";
  if (
    (origin === null && !isSameOriginStatusGet) ||
    (origin !== null && origin !== allowedOrigin) ||
    (method === "GET" && pathname === LINE_LINK_STATUS_PATH &&
      !isSameOriginStatusGet)
  ) {
    throw new DrsIdentityError("INVALID_REQUEST", 403);
  }
  if (queryName === undefined) {
    if ([...url.searchParams].length !== 0) {
      throw new DrsIdentityError("INVALID_REQUEST", 400);
    }
  } else {
    const entries = [...url.searchParams];
    if (entries.length !== 1 || entries[0][0] !== queryName) {
      throw new DrsIdentityError("INVALID_REQUEST", 400);
    }
    const value = entries[0][1];
    if (
      value.length < 1 || value.length > 512 || hasUnsafeLinkTokenByte(value)
    ) {
      throw new DrsIdentityError("INVALID_REQUEST", 400);
    }
  }
  if (method === "GET") {
    if (request.body !== null || request.headers.has("content-type")) {
      throw new DrsIdentityError("INVALID_REQUEST", 400);
    }
  } else {
    const contentType = request.headers.get("content-type")?.split(";", 1)[0]
      .trim().toLowerCase();
    if (contentType !== "application/json") {
      throw new DrsIdentityError("INVALID_REQUEST", 400);
    }
    const raw = await request.text();
    if (new TextEncoder().encode(raw).byteLength > 32) {
      throw new DrsIdentityError("INVALID_REQUEST", 400);
    }
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      throw new DrsIdentityError("INVALID_REQUEST", 400);
    }
    if (
      parsed === null || typeof parsed !== "object" || Array.isArray(parsed) ||
      Object.keys(parsed).length !== 0
    ) throw new DrsIdentityError("INVALID_REQUEST", 400);
  }
  return queryName === undefined ? null : url.searchParams.get(queryName);
}

function bindStatusGetOriginForGuard(
  request: Request,
  allowedOrigin: string,
  method: "GET" | "POST",
  pathname: string,
): Request {
  if (
    method !== "GET" || pathname !== LINE_LINK_STATUS_PATH ||
    request.headers.has("origin") ||
    request.headers.get("sec-fetch-site") !== "same-origin"
  ) return request;
  const headers = new Headers(request.headers);
  headers.set("origin", allowedOrigin);
  return new Request(request, { headers });
}

function failureResponse(error: unknown): Response {
  if (error instanceof DrsIdentityError) {
    const status = error.status === 401
      ? 401
      : error.status === 400
      ? 400
      : 403;
    return json(
      {
        state: status === 401 || status === 403
          ? "permission_denied"
          : "temporarily_unavailable",
      },
      status,
    );
  }
  return json({ state: "temporarily_unavailable", nextAction: "retry" }, 503);
}

function createStatusHandler(
  dependencies: Dependencies,
  operation: "start" | "status" | "cancel" | "unlink",
  method: "GET" | "POST",
  pathname: string,
) {
  return async (request: Request): Promise<Response> => {
    try {
      await exactRequest(
        request.clone(),
        dependencies.allowedOrigin,
        method,
        pathname,
      );
      const authority = await dependencies.guard.authorize(
        bindStatusGetOriginForGuard(
          request,
          dependencies.allowedOrigin,
          method,
          pathname,
        ),
      );
      return json(await dependencies.service[operation](authority));
    } catch (error) {
      return failureResponse(error);
    }
  };
}

export function createLineLinkStartHandler(dependencies: Dependencies) {
  return createStatusHandler(
    dependencies,
    "start",
    "POST",
    "/functions/v1/drs-line-account-link-start",
  );
}

export function createLineLinkStatusHandler(dependencies: Dependencies) {
  return createStatusHandler(
    dependencies,
    "status",
    "GET",
    LINE_LINK_STATUS_PATH,
  );
}

export function createLineLinkCancelHandler(dependencies: Dependencies) {
  return createStatusHandler(
    dependencies,
    "cancel",
    "POST",
    "/functions/v1/drs-line-account-link-cancel",
  );
}

export function createLineLinkUnlinkHandler(dependencies: Dependencies) {
  return createStatusHandler(
    dependencies,
    "unlink",
    "POST",
    "/functions/v1/drs-line-account-link-unlink",
  );
}

export function createLineLinkContinueHandler(dependencies: Dependencies) {
  return async (request: Request): Promise<Response> => {
    try {
      const linkToken = await exactRequest(
        request.clone(),
        dependencies.allowedOrigin,
        "POST",
        "/functions/v1/drs-line-account-link-continue",
        "linkToken",
      );
      if (linkToken === null) {
        throw new DrsIdentityError("INVALID_REQUEST", 400);
      }
      const authority = await dependencies.guard.authorize(request);
      const location = await dependencies.service.continueLink(
        authority,
        linkToken,
      );
      return new Response(null, {
        status: 303,
        headers: {
          location,
          "cache-control": "no-store",
          "referrer-policy": "no-referrer",
          "x-content-type-options": "nosniff",
        },
      });
    } catch (error) {
      return failureResponse(error);
    }
  };
}
