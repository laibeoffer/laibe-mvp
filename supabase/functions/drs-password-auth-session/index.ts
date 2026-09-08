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

export const handler = createDrsPasswordAuthSessionHandler(dependencies);

if (import.meta.main) Deno.serve(handler);
