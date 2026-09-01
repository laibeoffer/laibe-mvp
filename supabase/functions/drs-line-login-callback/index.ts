import {
  closedResponse,
  DrsIdentityError,
  failClosedRuntimeResponse,
  type IdentityOAuthAdapter,
  strictPreflight,
} from "../_shared/drs-auth/contracts.ts";

export interface DrsLineLoginCallbackDependencies {
  allowedOrigin: string;
  adapter: IdentityOAuthAdapter;
}

export function createDrsLineLoginCallbackHandler(
  dependencies?: DrsLineLoginCallbackDependencies,
): (request: Request) => Promise<Response> {
  return async (request) => {
    if (request.method === "OPTIONS") {
      return dependencies
        ? strictPreflight(request, dependencies.allowedOrigin, "GET")
        : failClosedRuntimeResponse();
    }
    if (request.method !== "GET") {
      return closedResponse(new DrsIdentityError("CONTEXT_UNAVAILABLE", 405));
    }
    if (!dependencies) return failClosedRuntimeResponse();
    return await dependencies.adapter.callback(request);
  };
}

export const handler = createDrsLineLoginCallbackHandler();

if (import.meta.main) Deno.serve(handler);
