import {
  type VerifiedAuthSession,
  verifyAuthSession,
} from "../auth-session/verified-auth-session.ts";
import { validateWorkspaceGrant } from "../casework-authority/contracts.ts";

export type VendorCalendarContext = Readonly<
  VerifiedAuthSession & { caseId: string }
>;
export type VendorCalendarAuthorization =
  | Readonly<{ ok: true; context: VendorCalendarContext }>
  | Readonly<{ ok: false; state: string; status: number }>;

export function sameCalendarContext(
  left: VendorCalendarContext,
  right: VendorCalendarContext,
): boolean {
  return left.userId === right.userId &&
    left.authSessionId === right.authSessionId && left.caseId === right.caseId;
}

export function createVendorCalendarAuthorizer(options: {
  supabaseUrl: string;
  serviceRoleKey: string;
  fetch: typeof fetch;
  now: () => number;
  resolveGrant(userId: string): Promise<unknown>;
}) {
  return async (request: Request): Promise<VendorCalendarAuthorization> => {
    const verified = await verifyAuthSession(request, options);
    if (verified.state !== "verified") {
      return {
        ok: false,
        state: verified.state === "denied"
          ? "sign_in_required"
          : "setup_unavailable",
        status: verified.state === "denied" ? 401 : 503,
      };
    }
    const raw = await options.resolveGrant(verified.session.userId);
    const value = raw !== null && typeof raw === "object" && !Array.isArray(raw)
      ? raw as Record<string, unknown>
      : null;
    if (value?.state === "CASE_SELECTION_REQUIRED") {
      return { ok: false, state: "CASE_SELECTION_REQUIRED", status: 409 };
    }
    const grant = validateWorkspaceGrant(raw, "pro");
    if (
      !grant || typeof value?.grant_expires_at !== "string" ||
      !Number.isFinite(Date.parse(value.grant_expires_at)) ||
      Date.parse(value.grant_expires_at) <= options.now()
    ) {
      return {
        ok: false,
        state: value?.state === "CASE_NOT_AUTHORIZED"
          ? "case_not_authorized"
          : "setup_unavailable",
        status: value?.state === "CASE_NOT_AUTHORIZED" ? 403 : 503,
      };
    }
    if (verified.session.expiresAtEpochSeconds * 1000 <= options.now()) {
      return { ok: false, state: "sign_in_required", status: 401 };
    }
    return {
      ok: true,
      context: Object.freeze({ ...verified.session, caseId: grant.caseId }),
    };
  };
}
