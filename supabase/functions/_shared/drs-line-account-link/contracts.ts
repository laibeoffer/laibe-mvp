export const LINE_LINK_STATES = Object.freeze(
  [
    "not_linked",
    "awaiting_line_confirmation",
    "linked",
    "expired",
    "cancelled",
    "conflict_line_already_bound",
    "conflict_drs_already_bound",
    "permission_denied",
    "specialist_inactive",
    "temporarily_unavailable",
    "unlinking",
    "revoked",
  ] as const,
);

export type LineLinkState = (typeof LINE_LINK_STATES)[number];
export type LineLinkNextAction =
  | "continue_in_line"
  | "retry"
  | "unlink"
  | "relink";

export type LineLinkStatusDto = Readonly<{
  state: LineLinkState;
  expiresAt?: string;
  linkedAt?: string;
  revokedAt?: string;
  nextAction?: LineLinkNextAction;
  botLaunchUrl?: string;
}>;

export type LineBindingActionEvent = Readonly<{
  kind: "binding_action";
  webhookEventId: string;
  replyToken: string;
  lineUserId: string;
  timestamp: number;
  isRedelivery: boolean;
}>;

export type LineUnlinkActionEvent = Readonly<{
  kind: "unlink_action";
  webhookEventId: string;
  replyToken: string;
  lineUserId: string;
  timestamp: number;
  isRedelivery: boolean;
}>;

export type AccountLinkEvent = Readonly<{
  kind: "account_link";
  webhookEventId: string;
  replyToken: string;
  lineUserId: string;
  nonce: string;
  result: "ok" | "failed";
  timestamp: number;
  isRedelivery: boolean;
}>;

export type LineWebhookEvent =
  | LineBindingActionEvent
  | LineUnlinkActionEvent
  | AccountLinkEvent;

export type LineWebhookEnvelope = Readonly<{
  destination: string;
  events: readonly LineWebhookEvent[];
}>;
