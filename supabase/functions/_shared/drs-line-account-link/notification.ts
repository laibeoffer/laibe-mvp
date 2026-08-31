import type { FetchLike, RuntimeEnvironment } from "../drs-auth/contracts.ts";
import {
  base64UrlDecode,
  decryptLineUserId,
  importLineUserIdEncryptionKey,
} from "./crypto.ts";
import {
  createLineClient,
  type LineCaseNotification,
  type LineClient,
  LineProviderError,
} from "./line-client.ts";

type NotificationClaim =
  | Readonly<{
    admitted: true;
    outboxId: string;
    claimToken: string;
    bindingVersion: string;
    lineUserCiphertext: string;
    lineUserIv: string;
    encryptionKeyVersion: string;
    caseLabel: string;
    caseStatus: string;
    nextAction: string;
    casePath: string;
  }>
  | Readonly<{
    admitted: false;
    state:
      | "empty"
      | "suppressed_authority"
      | "permanent_failure"
      | "temporarily_unavailable"
      | "permission_denied";
  }>;

type NotificationCompletion = Readonly<{
  outboxId: string;
  claimToken: string;
  outcome: "accepted" | "retryable_failure" | "permanent_failure";
  httpStatusClass: "2xx" | "4xx" | "5xx" | "none";
  providerRequestId: string;
  reasonCode: string;
  durationMs: number;
  retryAfterSeconds: number;
}>;

export interface NotificationRepository {
  claimNext(): Promise<unknown>;
  assertCurrent(
    input: Readonly<{ outboxId: string; claimToken: string }>,
  ): Promise<unknown>;
  complete(input: NotificationCompletion): Promise<unknown>;
}

export type DispatchResult = Readonly<{
  state: "empty" | "suppressed" | "accepted" | "retry" | "permanent_failure";
}>;

export type PrivateNotificationDependencies = Readonly<{
  repository: NotificationRepository;
  lineClient: LineClient;
  identityEncryptionKey: CryptoKey;
  identityEncryptionKeyVersion: string;
  publicOrigin: string;
  clock?: () => number;
}>;

type HandlerDependencies = Readonly<{
  authorizeService(request: Request): boolean;
  dispatcher: () => Promise<DispatchResult>;
}>;

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;
const MAX_RPC_RESPONSE_BYTES = 8192;
const CLAIM_KEYS = Object.freeze([
  "admitted",
  "outboxId",
  "claimToken",
  "bindingVersion",
  "lineUserCiphertext",
  "lineUserIv",
  "encryptionKeyVersion",
  "caseLabel",
  "caseStatus",
  "nextAction",
  "casePath",
]);

function exactOwnKeys(
  input: unknown,
  keys: readonly string[],
): input is Record<string, unknown> {
  if (input === null || typeof input !== "object" || Array.isArray(input)) {
    return false;
  }
  const actual = Object.keys(input);
  return actual.length === keys.length &&
    keys.every((key) => Object.prototype.hasOwnProperty.call(input, key));
}

function own(input: Record<string, unknown>, key: string): unknown {
  return Object.getOwnPropertyDescriptor(input, key)?.value;
}

function safeText(
  value: unknown,
  minimum: number,
  maximum: number,
): value is string {
  return typeof value === "string" && value.length >= minimum &&
    value.length <= maximum && !hasAsciiControl(value);
}

function hasAsciiControl(value: string): boolean {
  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index);
    if (code <= 31 || code === 127) return true;
  }
  return false;
}

function safeCasePath(value: unknown): value is string {
  if (!safeText(value, 1, 512) || !value.startsWith("/")) return false;
  try {
    const base = new URL("https://laibe.invalid");
    const url = new URL(value, base);
    return url.origin === base.origin && url.pathname.startsWith("/") &&
      url.username === "" && url.password === "" && url.hash === "";
  } catch {
    return false;
  }
}

function readClaim(input: unknown): NotificationClaim {
  if (
    exactOwnKeys(input, ["admitted", "state"]) &&
    own(input, "admitted") === false
  ) {
    const state = own(input, "state");
    if (
      [
        "empty",
        "suppressed_authority",
        "permanent_failure",
        "temporarily_unavailable",
        "permission_denied",
      ].includes(String(state))
    ) {
      return Object.freeze({ admitted: false, state } as NotificationClaim);
    }
  }
  if (!exactOwnKeys(input, CLAIM_KEYS) || own(input, "admitted") !== true) {
    throw new Error("invalid_notification_claim");
  }
  const outboxId = own(input, "outboxId");
  const claimToken = own(input, "claimToken");
  const bindingVersion = own(input, "bindingVersion");
  const lineUserCiphertext = own(input, "lineUserCiphertext");
  const lineUserIv = own(input, "lineUserIv");
  const encryptionKeyVersion = own(input, "encryptionKeyVersion");
  const caseLabel = own(input, "caseLabel");
  const caseStatus = own(input, "caseStatus");
  const nextAction = own(input, "nextAction");
  const casePath = own(input, "casePath");
  if (
    typeof outboxId !== "string" || !UUID_PATTERN.test(outboxId) ||
    typeof claimToken !== "string" || !UUID_PATTERN.test(claimToken) ||
    typeof bindingVersion !== "string" || !/^\d{1,20}$/u.test(bindingVersion) ||
    typeof lineUserCiphertext !== "string" ||
    !/^[A-Za-z0-9_-]{24,1024}$/u.test(lineUserCiphertext) ||
    typeof lineUserIv !== "string" ||
    !/^[A-Za-z0-9_-]{16}$/u.test(lineUserIv) ||
    typeof encryptionKeyVersion !== "string" ||
    !/^[A-Za-z0-9._-]{1,64}$/u.test(encryptionKeyVersion) ||
    !safeText(caseLabel, 1, 80) || !safeText(caseStatus, 1, 120) ||
    !safeText(nextAction, 1, 160) || !safeCasePath(casePath)
  ) throw new Error("invalid_notification_claim");
  return Object.freeze({
    admitted: true,
    outboxId,
    claimToken,
    bindingVersion,
    lineUserCiphertext,
    lineUserIv,
    encryptionKeyVersion,
    caseLabel,
    caseStatus,
    nextAction,
    casePath,
  });
}

function completionAccepted(input: unknown, state: string): boolean {
  if (input === null || typeof input !== "object" || Array.isArray(input)) {
    return false;
  }
  return Object.getOwnPropertyDescriptor(input, "completed")?.value === true &&
    (Object.getOwnPropertyDescriptor(input, "state")?.value === state);
}

function boundedDuration(start: number, end: number): number {
  if (!Number.isFinite(start) || !Number.isFinite(end)) return 0;
  return Math.max(0, Math.min(2_147_483_647, Math.round(end - start)));
}

export function createPrivateNotificationDispatcher(
  dependencies: PrivateNotificationDependencies,
): () => Promise<DispatchResult> {
  const clock = dependencies.clock ?? (() => performance.now());
  const publicOrigin = new URL(dependencies.publicOrigin);
  if (
    publicOrigin.protocol !== "https:" || publicOrigin.pathname !== "/" ||
    publicOrigin.search !== "" || publicOrigin.hash !== "" ||
    publicOrigin.username !== "" || publicOrigin.password !== ""
  ) throw new Error("notification_runtime_unavailable");
  return async (): Promise<DispatchResult> => {
    const claim = readClaim(await dependencies.repository.claimNext());
    if (!claim.admitted) {
      if (claim.state === "empty") return Object.freeze({ state: "empty" });
      if (claim.state === "suppressed_authority") {
        return Object.freeze({ state: "suppressed" });
      }
      if (claim.state === "permanent_failure") {
        return Object.freeze({ state: "permanent_failure" });
      }
      throw new Error("notification_claim_unavailable");
    }
    const start = clock();
    let completion: NotificationCompletion;
    let expectedState: DispatchResult["state"];
    if (
      claim.encryptionKeyVersion !== dependencies.identityEncryptionKeyVersion
    ) {
      completion = Object.freeze({
        outboxId: claim.outboxId,
        claimToken: claim.claimToken,
        outcome: "permanent_failure",
        httpStatusClass: "none",
        providerRequestId: "",
        reasonCode: "encryption_key_unavailable",
        durationMs: boundedDuration(start, clock()),
        retryAfterSeconds: 0,
      });
      expectedState = "permanent_failure";
    } else {
      let lineUserId: string;
      try {
        lineUserId = await decryptLineUserId(
          dependencies.identityEncryptionKey,
          {
            ciphertext: claim.lineUserCiphertext,
            iv: claim.lineUserIv,
          },
        );
      } catch {
        completion = Object.freeze({
          outboxId: claim.outboxId,
          claimToken: claim.claimToken,
          outcome: "permanent_failure",
          httpStatusClass: "none",
          providerRequestId: "",
          reasonCode: "binding_decryption_failed",
          durationMs: boundedDuration(start, clock()),
          retryAfterSeconds: 0,
        });
        expectedState = "permanent_failure";
        const result = await dependencies.repository.complete(completion);
        if (!completionAccepted(result, expectedState)) {
          throw new Error("notification_completion_failed");
        }
        return Object.freeze({ state: expectedState });
      }
      const message: LineCaseNotification = Object.freeze({
        caseLabel: claim.caseLabel,
        caseStatus: claim.caseStatus,
        nextAction: claim.nextAction,
        caseUrl: new URL(claim.casePath, publicOrigin).toString(),
      });
      const current = await dependencies.repository.assertCurrent({
        outboxId: claim.outboxId,
        claimToken: claim.claimToken,
      });
      if (
        current === null || typeof current !== "object" ||
        Object.getOwnPropertyDescriptor(current, "current")?.value !== true
      ) throw new Error("notification_claim_not_current");
      try {
        const result = await dependencies.lineClient.pushCaseNotification(
          lineUserId,
          message,
          claim.outboxId,
        );
        completion = Object.freeze({
          outboxId: claim.outboxId,
          claimToken: claim.claimToken,
          outcome: "accepted",
          httpStatusClass: "2xx",
          providerRequestId: result.requestId ?? "",
          reasonCode: "provider_accepted",
          durationMs: boundedDuration(start, clock()),
          retryAfterSeconds: 0,
        });
        expectedState = "accepted";
      } catch (error) {
        const retryable = error instanceof LineProviderError &&
          ["provider_rate_limited", "provider_unavailable"].includes(
            error.code,
          );
        completion = Object.freeze({
          outboxId: claim.outboxId,
          claimToken: claim.claimToken,
          outcome: retryable ? "retryable_failure" : "permanent_failure",
          httpStatusClass: error instanceof LineProviderError
            ? error.statusClass
            : "none",
          providerRequestId: "",
          reasonCode: error instanceof LineProviderError
            ? error.code
            : "provider_unavailable",
          durationMs: boundedDuration(start, clock()),
          retryAfterSeconds: retryable ? 60 : 0,
        });
        expectedState = retryable ? "retry" : "permanent_failure";
      }
    }
    const persisted = await dependencies.repository.complete(completion);
    if (!completionAccepted(persisted, expectedState)) {
      throw new Error("notification_completion_failed");
    }
    return Object.freeze({ state: expectedState });
  };
}

function runtimeEnvironment(): RuntimeEnvironment | undefined {
  const candidate = (globalThis as unknown as {
    Deno?: { env?: { get?: (name: string) => string | undefined } };
  }).Deno?.env;
  return typeof candidate?.get === "function"
    ? Object.freeze({ get: candidate.get.bind(candidate) })
    : undefined;
}

function createSupabaseNotificationRepository(
  env: RuntimeEnvironment,
  fetchImplementation: FetchLike = globalThis.fetch,
): NotificationRepository {
  const supabaseUrl = env.get("SUPABASE_URL") ?? "";
  const serviceRoleKey = env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  if (!/^https:\/\/[^/]+$/u.test(supabaseUrl) || serviceRoleKey.length < 32) {
    throw new Error("notification_runtime_unavailable");
  }
  async function invoke(name: string, pInput: Record<string, unknown>) {
    const response = await fetchImplementation(
      `${supabaseUrl}/rest/v1/rpc/${name}`,
      {
        method: "POST",
        headers: {
          apikey: serviceRoleKey,
          authorization: `Bearer ${serviceRoleKey}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({ p_input: pInput }),
      },
    );
    const raw = await response.text();
    if (
      !response.ok ||
      new TextEncoder().encode(raw).byteLength > MAX_RPC_RESPONSE_BYTES
    ) {
      throw new Error("notification_runtime_unavailable");
    }
    const parsed = JSON.parse(raw);
    if (
      parsed === null || typeof parsed !== "object" || Array.isArray(parsed)
    ) {
      throw new Error("notification_runtime_unavailable");
    }
    return parsed as Record<string, unknown>;
  }
  return Object.freeze({
    async claimNext() {
      const result = await invoke("drs_line_claim_notification_v1", {});
      if (result.admitted !== true) {
        return Object.freeze({ admitted: false, state: result.state });
      }
      return Object.freeze({
        admitted: true,
        outboxId: result.outbox_id,
        claimToken: result.claim_token,
        bindingVersion: result.binding_version,
        lineUserCiphertext: result.line_user_ciphertext,
        lineUserIv: result.line_user_iv,
        encryptionKeyVersion: result.encryption_key_version,
        caseLabel: result.case_label,
        caseStatus: result.case_status,
        nextAction: result.next_action,
        casePath: result.case_path,
      });
    },
    async assertCurrent(
      input: Readonly<{ outboxId: string; claimToken: string }>,
    ) {
      return await invoke("drs_line_assert_notification_claim_v1", {
        outbox_id: input.outboxId,
        claim_token: input.claimToken,
      });
    },
    async complete(input: NotificationCompletion) {
      return await invoke("drs_line_complete_notification_v1", {
        outbox_id: input.outboxId,
        claim_token: input.claimToken,
        outcome: input.outcome,
        http_status_class: input.httpStatusClass,
        provider_request_id: input.providerRequestId,
        reason_code: input.reasonCode,
        duration_ms: input.durationMs,
        retry_after_seconds: input.retryAfterSeconds,
      });
    },
  });
}

function decodeJwtPayload(token: string): Record<string, unknown> | null {
  const parts = token.split(".");
  if (
    parts.length !== 3 || parts.some((part) => !/^[A-Za-z0-9_-]+$/u.test(part))
  ) return null;
  try {
    const bytes = base64UrlDecode(parts[1]);
    const parsed = JSON.parse(
      new TextDecoder("utf-8", { fatal: true }).decode(bytes),
    );
    return parsed !== null && typeof parsed === "object" &&
        !Array.isArray(parsed)
      ? parsed as Record<string, unknown>
      : null;
  } catch {
    return null;
  }
}

function gatewayVerifiedServiceRole(request: Request): boolean {
  const authorization = request.headers.get("authorization") ?? "";
  const match = /^Bearer ([A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+)$/u
    .exec(authorization);
  if (!match) return false;
  const claims = decodeJwtPayload(match[1]);
  return claims !== null &&
    Object.getOwnPropertyDescriptor(claims, "role")?.value === "service_role";
}

async function runtimeHandlerDependencies(): Promise<HandlerDependencies> {
  const env = runtimeEnvironment();
  if (!env) throw new Error("notification_runtime_unavailable");
  const version = env.get("DRS_LINE_IDENTITY_ENCRYPTION_KEY_VERSION") ?? "";
  const publicOrigin = env.get("DRS_PUBLIC_ORIGIN") ?? "";
  const accessToken = env.get("LINE_CHANNEL_ACCESS_TOKEN") ?? "";
  const key = await importLineUserIdEncryptionKey(
    env.get("DRS_LINE_IDENTITY_ENCRYPTION_KEY") ?? "",
  );
  const dispatcher = createPrivateNotificationDispatcher({
    repository: createSupabaseNotificationRepository(env),
    lineClient: createLineClient({ accessToken }),
    identityEncryptionKey: key,
    identityEncryptionKeyVersion: version,
    publicOrigin,
  });
  return Object.freeze({
    authorizeService: gatewayVerifiedServiceRole,
    dispatcher,
  });
}

async function exactDispatchRequest(request: Request): Promise<boolean> {
  const url = new URL(request.url);
  if (
    request.method !== "POST" ||
    url.pathname !== "/functions/v1/drs-line-private-notification-dispatch" ||
    url.search !== "" ||
    request.headers.get("content-type")?.split(";", 1)[0].trim()
        .toLowerCase() !==
      "application/json"
  ) return false;
  const raw = await request.text();
  if (new TextEncoder().encode(raw).byteLength > 32) return false;
  try {
    const parsed = JSON.parse(raw);
    return exactOwnKeys(parsed, []);
  } catch {
    return false;
  }
}

export function createPrivateNotificationDispatchHandler(
  injected?: HandlerDependencies,
): (request: Request) => Promise<Response> {
  return async (request: Request): Promise<Response> => {
    if (!await exactDispatchRequest(request.clone())) {
      return Response.json({ state: "temporarily_unavailable" }, {
        status: 400,
      });
    }
    let dependencies: HandlerDependencies;
    try {
      dependencies = injected ?? await runtimeHandlerDependencies();
    } catch {
      return Response.json({ state: "temporarily_unavailable" }, {
        status: 503,
      });
    }
    if (!dependencies.authorizeService(request)) {
      return Response.json({ state: "permission_denied" }, { status: 401 });
    }
    try {
      return Response.json(await dependencies.dispatcher(), {
        status: 200,
        headers: { "cache-control": "no-store" },
      });
    } catch {
      return Response.json({ state: "temporarily_unavailable" }, {
        status: 503,
      });
    }
  };
}
