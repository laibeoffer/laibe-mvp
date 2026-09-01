import type { DrsBffAuthorizedContext } from "../drs-auth/drs-session-bootstrap-bff.ts";
import {
  base64UrlEncode,
  hmacIdentityDigest,
  randomProtocolValue,
} from "./crypto.ts";
import type { LineLinkStatusDto } from "./contracts.ts";
import type {
  LineAccountLinkAuthority,
  LineAccountLinkRepository,
} from "./ports.ts";
import { sanitizeLineLinkStatus } from "./validation.ts";

type ServiceOptions = Readonly<{
  repository: LineAccountLinkRepository;
  identityHmacKey: string;
  now?: () => Date;
  randomBytes?: () => Uint8Array;
}>;

function projectAuthority(
  context: DrsBffAuthorizedContext,
): LineAccountLinkAuthority {
  return Object.freeze({
    authenticatedUserId: context.authenticatedUserId,
    specialistId: context.specialistId,
    selectedCaseId: context.selectedCaseId,
    authorizationSubject: context.authorizationSubject,
  });
}

function validLinkToken(value: string): boolean {
  return typeof value === "string" && value.length >= 1 &&
    value.length <= 512 &&
    !hasUnsafeAscii(value, true);
}

function hasUnsafeAscii(value: string, rejectSpace: boolean): boolean {
  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index);
    if (code <= (rejectSpace ? 32 : 31) || code === 127) return true;
  }
  return false;
}

export function createLineAccountLinkService(options: ServiceOptions) {
  const now = options.now ?? (() => new Date());
  const randomBytes = options.randomBytes ?? (() => randomProtocolValue(32));
  async function statusOperation(
    operation: "startIntent" | "readStatus" | "cancelIntent" | "unlink",
    context: DrsBffAuthorizedContext,
  ): Promise<LineLinkStatusDto> {
    const result = await options.repository[operation](
      projectAuthority(context),
    );
    return sanitizeLineLinkStatus(result);
  }
  return Object.freeze({
    start: (context: DrsBffAuthorizedContext) =>
      statusOperation("startIntent", context),
    status: (context: DrsBffAuthorizedContext) =>
      statusOperation("readStatus", context),
    cancel: (context: DrsBffAuthorizedContext) =>
      statusOperation("cancelIntent", context),
    unlink: (context: DrsBffAuthorizedContext) =>
      statusOperation("unlink", context),
    async continueLink(
      context: DrsBffAuthorizedContext,
      linkToken: string,
    ): Promise<string> {
      if (!validLinkToken(linkToken)) throw new Error("invalid_link_token");
      const bytes = randomBytes();
      if (!(bytes instanceof Uint8Array) || bytes.byteLength !== 32) {
        throw new Error("protocol_random_unavailable");
      }
      const nonce = base64UrlEncode(bytes);
      const nonceDigest = await hmacIdentityDigest(
        options.identityHmacKey,
        `laibe.drs-line-account-link.nonce.v1:${nonce}`,
      );
      const current = now();
      if (!(current instanceof Date) || !Number.isFinite(current.getTime())) {
        throw new Error("clock_unavailable");
      }
      const prepared = await options.repository.prepareNonce({
        authority: projectAuthority(context),
        nonceDigest,
        nonceExpiresAt: new Date(current.getTime() + 9 * 60 * 1000)
          .toISOString(),
      });
      if (
        prepared === null || typeof prepared !== "object" ||
        Object.getOwnPropertyDescriptor(prepared, "accepted")?.value !== true ||
        Object.getOwnPropertyDescriptor(prepared, "state")?.value !==
          "awaiting_line_confirmation"
      ) throw new Error("nonce_not_admitted");
      const location = new URL("https://access.line.me/dialog/bot/accountLink");
      location.searchParams.set("linkToken", linkToken);
      location.searchParams.set("nonce", nonce);
      return location.toString();
    },
  });
}

export type LineAccountLinkService = ReturnType<
  typeof createLineAccountLinkService
>;
