import {
  type AuthBoundSession,
  authFailure,
  exactObject,
  unavailable,
} from "./auth-bound-session.ts";
import {
  closedResponse,
  DrsIdentityError,
  readExactEmptyJsonBody,
  strictPreflight,
} from "./contracts.ts";

function cookieValue(request: Request, name: string): string {
  const header = request.headers.get("cookie") ?? "";
  if (header.length > 8192) authFailure();
  const values = header.split(";").map((v) => v.trim()).filter((v) =>
    v.startsWith(name + "=")
  );
  if (values.length !== 1) authFailure();
  return values[0].slice(name.length + 1);
}
function receipt(
  value: unknown,
): { revoked: true; completed: boolean; auth_session_active: boolean } {
  if (
    !exactObject(value, ["revoked", "completed", "auth_session_active"]) ||
    value.revoked !== true || typeof value.completed !== "boolean" ||
    typeof value.auth_session_active !== "boolean"
  ) unavailable();
  return value as {
    revoked: true;
    completed: boolean;
    auth_session_active: boolean;
  };
}

export function createDrsSessionLogoutHandler(session?: AuthBoundSession) {
  return async (request: Request): Promise<Response> => {
    if (!session) {
      return closedResponse(new DrsIdentityError("CONTEXT_UNAVAILABLE", 503));
    }
    const { options } = session;
    if (request.method === "OPTIONS") {
      return strictPreflight(request, options.allowedOrigin, "POST");
    }
    let response: Response;
    let trustedOrigin = false;
    try {
      const url = new URL(request.url);
      if (
        request.method !== "POST" ||
        url.pathname !== "/functions/v1/drs-session-logout" || url.search ||
        request.headers.get("origin") !== options.allowedOrigin ||
        (request.headers.has("sec-fetch-site") &&
          !["same-origin", "same-site"].includes(
            request.headers.get("sec-fetch-site")!,
          ))
      ) {
        throw new DrsIdentityError("CONTEXT_UNAVAILABLE", 403);
      }
      trustedOrigin = true;
      if (!await readExactEmptyJsonBody(request)) {
        throw new DrsIdentityError("INVALID_REQUEST", 400);
      }
      const envelope = await session.codec.openCookieEnvelope(
        cookieValue(request, options.sessionCookieName),
      );
      const proof = await session.proofBody(envelope);
      const current = receipt(
        await session.rpc("drs_auth_bound_session_logout_v1", {
          ...proof,
          p_complete: false,
        }),
      );
      if (!(current.completed && !current.auth_session_active)) {
        await session.verifyEnvelopeAuth(envelope);
        let provider: Response;
        try {
          provider = await options.fetch(
            `${options.supabaseUrl}/auth/v1/logout?scope=local`,
            {
              method: "POST",
              redirect: "error",
              signal: AbortSignal.timeout(10_000),
              headers: {
                apikey: options.serviceRoleKey,
                authorization: `Bearer ${envelope.supabaseAccessToken}`,
              },
            },
          );
        } catch {
          unavailable();
        }
        // A provider 401 can be project/key configuration failure; only success proceeds.
        await provider.body?.cancel();
        if (!provider.ok) unavailable();
        const completed = receipt(
          await session.rpc("drs_auth_bound_session_logout_v1", {
            ...proof,
            p_complete: true,
          }),
        );
        if (!completed.completed || completed.auth_session_active) {
          unavailable();
        }
      }
      response = new Response(null, {
        status: 204,
        headers: {
          "cache-control": "no-store",
          pragma: "no-cache",
          "access-control-allow-origin": options.allowedOrigin,
          "access-control-allow-credentials": "true",
          vary: "Origin, Cookie",
        },
      });
    } catch (error) {
      response = closedResponse(
        error,
        trustedOrigin ? options.allowedOrigin : undefined,
      );
    }
    if (trustedOrigin) {
      response.headers.set(
        "set-cookie",
        `${options.sessionCookieName}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`,
      );
    }
    return response;
  };
}
