import { withEdgeRequestBoundary } from "../_shared/http/edge-request-boundary.ts";
import {
  createDrsPasswordAuthSessionHandler,
  createDrsPasswordAuthSessionRuntimeDependencies,
  createSupabaseDrsPasswordSessionAuthorityResolver,
} from "../_shared/drs-auth/drs-password-auth-session.ts";
import {
  createDrsSecureSessionRuntime,
} from "../_shared/drs-auth/drs-secure-session-runtime.ts";

export const VERIFY_JWT_REQUIRED = true;

const secureRuntime = createDrsSecureSessionRuntime();
const dependencies = createDrsPasswordAuthSessionRuntimeDependencies({
  authorityResolver: createSupabaseDrsPasswordSessionAuthorityResolver(),
  sessionProducer: secureRuntime.passwordSessionProducer,
});

export const handler = withEdgeRequestBoundary(
  "drs-password-auth-session",
  createDrsPasswordAuthSessionHandler(dependencies),
);

if (import.meta.main) Deno.serve(handler);
