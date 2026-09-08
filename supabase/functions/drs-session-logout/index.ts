import { withEdgeRequestBoundary } from "../_shared/http/edge-request-boundary.ts";
import { createDrsSecureSessionRuntime } from "../_shared/drs-auth/drs-secure-session-runtime.ts";
import { createDrsSessionLogoutHandler } from "../_shared/drs-auth/drs-session-logout.ts";

export const VERIFY_JWT_REQUIRED = false;
export const handler = withEdgeRequestBoundary(
  "drs-session-logout",
  createDrsSessionLogoutHandler(
    createDrsSecureSessionRuntime().authBoundSession,
  ),
);
if (import.meta.main) Deno.serve(handler);
