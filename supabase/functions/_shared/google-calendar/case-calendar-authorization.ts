import {
  callSupabaseRpc,
  type CaseMemberRole,
  closedResult,
  createGrantRecord,
  createSupabaseCalendarRuntimeConfig,
  isMissing,
  isOwnNonEmptyString,
  readOwnData,
  resolveSupabaseAuthenticatedIdentity,
  successResult,
  type SupabaseCalendarRuntimeOptions,
} from "./contracts.ts";

type GrantDependencies = {
  resolveAuthenticatedIdentity(
    request: Request,
  ): Promise<{ userId: string } | null>;
  resolveCurrentCaseContext(
    request: Request,
    identity: { userId: string },
  ): Promise<{ caseId: string } | null>;
  resolveMembership(
    identity: { userId: string },
    caseContext: { caseId: string },
    role: CaseMemberRole,
  ): Promise<unknown>;
  resolveCalendarBinding(
    identity: { userId: string },
    caseContext: { caseId: string },
    role: CaseMemberRole,
  ): Promise<unknown>;
};

function readContextFacts(input: unknown) {
  const authenticatedUserId = readOwnData(input, "authenticatedUserId");
  const currentCaseId = readOwnData(input, "currentCaseId");
  const membership = readOwnData(input, "membership");
  if (
    typeof authenticatedUserId !== "string" ||
    authenticatedUserId.length === 0 ||
    typeof currentCaseId !== "string" || currentCaseId.length === 0 ||
    isMissing(membership)
  ) return null;
  return { authenticatedUserId, currentCaseId, membership };
}

function readGrantFacts(input: unknown) {
  const context = readContextFacts(input);
  if (context === null) return null;
  const calendarBinding = readOwnData(input, "calendarBinding");
  if (isMissing(calendarBinding)) return null;
  return { ...context, calendarBinding };
}

export function authorizeCaseMemberContext(
  expectedRole: CaseMemberRole,
  input: unknown,
) {
  try {
    if (expectedRole !== "owner" && expectedRole !== "pro") {
      return closedResult("CASE_NOT_AUTHORIZED");
    }
    const facts = readContextFacts(input);
    if (facts === null) return closedResult("CONTEXT_UNAVAILABLE");
    const membershipUserId = readOwnData(facts.membership, "userId");
    const membershipCaseId = readOwnData(facts.membership, "caseId");
    const membershipRole = readOwnData(facts.membership, "role");
    const membershipStatus = readOwnData(facts.membership, "status");
    if (
      membershipUserId !== facts.authenticatedUserId ||
      membershipCaseId !== facts.currentCaseId
    ) return closedResult("IDENTITY_MISMATCH");
    if (membershipRole !== expectedRole) {
      return closedResult("CASE_NOT_AUTHORIZED");
    }
    if (membershipStatus !== "active") {
      return closedResult("MEMBERSHIP_INACTIVE");
    }
    return {
      ok: true,
      state: "AUTHORIZED",
      context: {
        authenticatedUserId: facts.authenticatedUserId,
        currentCaseId: facts.currentCaseId,
        membership: facts.membership,
      },
    };
  } catch {
    return closedResult("CONTEXT_UNAVAILABLE");
  }
}

export function resolveCaseMemberCalendarGrant(
  expectedRole: CaseMemberRole,
  input: unknown,
) {
  try {
    const context = authorizeCaseMemberContext(expectedRole, input);
    if (!context.ok) return context;
    const facts = readGrantFacts(input);
    if (facts === null) return closedResult("CONTEXT_UNAVAILABLE");
    const bindingUserId = readOwnData(facts.calendarBinding, "userId");
    const bindingCaseId = readOwnData(facts.calendarBinding, "caseId");
    const bindingRole = readOwnData(facts.calendarBinding, "accountRole");
    const connectionStatus = readOwnData(
      facts.calendarBinding,
      "connectionStatus",
    );
    const bindingStatus = readOwnData(facts.calendarBinding, "bindingStatus");
    const timeZone = readOwnData(facts.calendarBinding, "timeZone");
    if (
      bindingUserId !== facts.authenticatedUserId ||
      bindingCaseId !== facts.currentCaseId
    ) return closedResult("IDENTITY_MISMATCH");
    if (bindingRole !== expectedRole) {
      return closedResult("CASE_NOT_AUTHORIZED");
    }
    if (bindingStatus === "revoked") {
      return closedResult("GOOGLE_CALENDAR_BINDING_REVOKED");
    }
    if (bindingStatus !== "active") {
      return closedResult("GOOGLE_CALENDAR_NOT_CONNECTED");
    }
    if (connectionStatus === "reconnect_required") {
      return closedResult("GOOGLE_CALENDAR_RECONNECT_REQUIRED");
    }
    if (connectionStatus !== "connected") {
      return closedResult("GOOGLE_CALENDAR_NOT_CONNECTED");
    }
    if (
      timeZone !== "Asia/Taipei" ||
      !isOwnNonEmptyString(facts.calendarBinding, "calendarId")
    ) {
      return closedResult("INVALID_CALENDAR_BINDING");
    }
    const calendarId = readOwnData(
      facts.calendarBinding,
      "calendarId",
    ) as string;
    return successResult(createGrantRecord(expectedRole, {
      authenticatedUserId: facts.authenticatedUserId,
      currentCaseId: facts.currentCaseId,
      calendarId,
    }));
  } catch {
    return closedResult("CONTEXT_UNAVAILABLE");
  }
}

export function createCaseMemberGrantResolver(dependencies: GrantDependencies) {
  return async function resolveGrant(
    request: Request,
    expectedRole: CaseMemberRole,
  ) {
    try {
      const identity = await dependencies.resolveAuthenticatedIdentity(request);
      if (!identity) return closedResult("AUTH_REQUIRED");
      const caseContext = await dependencies.resolveCurrentCaseContext(
        request,
        identity,
      );
      if (!caseContext) return closedResult("CONTEXT_UNAVAILABLE");
      const membership = await dependencies.resolveMembership(
        identity,
        caseContext,
        expectedRole,
      );
      if (!membership) return closedResult("CASE_NOT_AUTHORIZED");
      const calendarBinding = await dependencies.resolveCalendarBinding(
        identity,
        caseContext,
        expectedRole,
      );
      return resolveCaseMemberCalendarGrant(expectedRole, {
        authenticatedUserId: identity.userId,
        currentCaseId: caseContext.caseId,
        membership,
        calendarBinding: calendarBinding ?? {},
      });
    } catch {
      return closedResult("CONTEXT_UNAVAILABLE");
    }
  };
}

export function createSupabaseCaseMemberGrantDependencies(
  options: SupabaseCalendarRuntimeOptions = {},
): GrantDependencies {
  const config = createSupabaseCalendarRuntimeConfig(options);
  return {
    async resolveAuthenticatedIdentity(request) {
      return config
        ? await resolveSupabaseAuthenticatedIdentity(request, config)
        : null;
    },
    async resolveCurrentCaseContext(_request, identity) {
      if (!config || !config.currentCaseContextRpc) return null;
      const response = await callSupabaseRpc(
        config,
        config.currentCaseContextRpc,
        { p_user_id: identity.userId },
      );
      const caseId = readOwnData(response, "case_id") ??
        readOwnData(response, "caseId");
      return typeof caseId === "string" && caseId.length > 0
        ? { caseId }
        : null;
    },
    async resolveMembership(identity, caseContext, role) {
      if (!config) return null;
      const response = await callSupabaseRpc(
        config,
        "case_member_google_calendar_authorize_v1",
        {
          p_user_id: identity.userId,
          p_case_id: caseContext.caseId,
          p_account_role: role,
        },
      );
      if (readOwnData(response, "authorized") !== true) return null;
      const status = readOwnData(response, "membership_status");
      return {
        userId: identity.userId,
        caseId: caseContext.caseId,
        role,
        status: status === "active" ? "active" : "inactive",
      };
    },
    async resolveCalendarBinding(identity, caseContext, role) {
      if (!config) return null;
      const response = await callSupabaseRpc(
        config,
        "case_member_google_calendar_grant_v1",
        {
          p_user_id: identity.userId,
          p_case_id: caseContext.caseId,
          p_account_role: role,
        },
      );
      const grant = readOwnData(response, "grant");
      return isMissing(grant) ? null : readOwnData(grant, "calendarBinding");
    },
  };
}
