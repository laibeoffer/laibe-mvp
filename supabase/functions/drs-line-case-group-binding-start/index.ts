import { createCaseGroupBindingStartHandler } from "../_shared/drs-line-case-group/binding-start.ts";

export { createCaseGroupBindingStartHandler };
export const VERIFY_JWT_REQUIRED = true;
export const handler = createCaseGroupBindingStartHandler();
if (import.meta.main) Deno.serve(handler);
