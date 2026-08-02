const EXACT_BASE_HEAD_SHA = "2c4418301be57b86a87ba0d83e37cd3d237ea302";
const COMMIT_SHA_PATTERN = /^[0-9a-f]{40}$/;
const verifiedReadinessResults = new WeakSet();

const PRODUCT_COPY = Object.freeze({
  closed: "案件通知入口將於設定完成後開放。",
  ready: "案件通知入口已完成必要設定。",
  unsupported: "此項案件通知功能正在整理中。",
  personalNotification: "個人案件通知可透過 LINE 傳送。",
  deepLink: "可從 LINE 前往萊比查看授權案件。",
  groupRoomUnsupported: "首版僅提供個人通知入口，群組與聊天室尚未開放。",
  lineNotCanonical: "LINE 對話不會直接成為正式案件紀錄。",
});

export const A14_LINE_CANDIDATE = Object.freeze({
  headSha: EXACT_BASE_HEAD_SHA,
  baseHeadSha: EXACT_BASE_HEAD_SHA,
  worktreeState: "local_dirty",
  committed: false,
  migrationApplied: false,
  edgeDeployed: false,
  canonicalTruth: false,
  transportScope: "personal_notification_and_deep_link",
  groupOrRoomSupported: false,
});

export const A14_LINE_SUPPORTED_TRANSPORTS = Object.freeze([
  "personal_notification",
  "deep_link",
]);

function isImmutableApprovedCandidate(input) {
  const candidateCommitSha = input.candidateCommitSha ?? "";
  const approvedCandidateCommitSha = input.approvedCandidateCommitSha ?? "";

  return (
    input.immutableCandidateVerified === true &&
    COMMIT_SHA_PATTERN.test(candidateCommitSha) &&
    candidateCommitSha !== EXACT_BASE_HEAD_SHA &&
    candidateCommitSha === approvedCandidateCommitSha
  );
}

export function assessA14LineReadiness(input = {}) {
  const checks = Object.freeze({
    exact_candidate_base: input.candidateBaseHeadSha === EXACT_BASE_HEAD_SHA &&
      input.mergeBaseHeadSha === EXACT_BASE_HEAD_SHA,
    immutable_candidate: isImmutableApprovedCandidate(input),
    remote_migration_apply: input.remoteMigrationApplied === true,
    edge_deploy: input.edgeDeployed === true,
    typed_account_link_facts: input.typedAccountLinkFactsVerified === true,
    db_owned_settlement_clock: input.dbOwnedSettlementClockVerified === true,
    accepted_pending_cross_expiry_retry:
      input.acceptedPendingCrossExpiryRetryVerified === true,
    atomic_account_link_adopt: input.atomicAccountLinkAdoptVerified === true,
    public_safe_text_single_sink:
      input.publicSafeTextSingleSinkVerified === true,
    postgres_two_session_race: input.postgresTwoSessionRaceVerified === true,
    os_owned_process_containment:
      input.osOwnedProcessContainmentVerified === true,
    pcm_canonical_domain: input.pcmCanonicalDomainVerified === true,
    per_recipient_fanout_dedupe:
      input.perRecipientFanoutDedupeVerified === true,
    engagement_termination_reauthorization:
      input.engagementTerminationReauthorizationVerified === true,
    domain_state_separation: input.domainStateSeparationVerified === true,
    formal_ui_persistence: input.formalUiPersistenceVerified === true,
    continuation_route: input.continuationRouteMounted === true,
    active_session_consumer: input.activeSessionConsumerConfigured === true,
    worker_invoker: input.workerInvokerConfigured === true,
    provider_channel: input.providerChannelConfigured === true,
    private_storage_bucket: input.privateStorageBucketConfigured === true,
    secrets: input.secretsConfigured === true,
    scheduler: input.schedulerConfigured === true,
    monitoring: input.monitoringConfigured === true,
    pdf_deep_scan: input.pdfDeepScanConfigured === true,
  });
  const missing = Object.freeze(
    Object.entries(checks)
      .filter(([, verified]) => !verified)
      .map(([name]) => name),
  );
  const ready = missing.length === 0;

  const result = Object.freeze({
    ready,
    mode: ready ? "personal_transport" : "closed",
    missing,
    message: ready ? PRODUCT_COPY.ready : PRODUCT_COPY.closed,
  });
  verifiedReadinessResults.add(result);
  return result;
}

function decision(allowed, code, message) {
  return Object.freeze({ allowed, code, message });
}

export function classifyA14LineCapability(operation = {}, readiness = {}) {
  if (
    operation.action === "canonical_event" &&
    operation.source === "line_message"
  ) {
    return decision(
      false,
      "LINE_NOT_CANONICAL_TRUTH",
      PRODUCT_COPY.lineNotCanonical,
    );
  }

  if (["group", "room"].includes(operation.action)) {
    return decision(
      false,
      "A14_GROUP_ROOM_UNSUPPORTED",
      PRODUCT_COPY.groupRoomUnsupported,
    );
  }

  if (
    !verifiedReadinessResults.has(readiness) ||
    !readiness.ready ||
    readiness.mode !== "personal_transport"
  ) {
    return decision(false, "A14_LINE_NOT_READY", PRODUCT_COPY.closed);
  }

  if (operation.action === "personal_notification") {
    return decision(
      true,
      "A14_PERSONAL_NOTIFICATION_TRANSPORT",
      PRODUCT_COPY.personalNotification,
    );
  }

  if (operation.action === "deep_link") {
    return decision(
      true,
      "A14_DEEP_LINK_TRANSPORT",
      PRODUCT_COPY.deepLink,
    );
  }

  return decision(
    false,
    "A14_CAPABILITY_NOT_ALLOWLISTED",
    PRODUCT_COPY.unsupported,
  );
}

export function resolveA14LinePresentation({
  readiness = {},
  verifiedBinding = false,
} = {}) {
  if (
    !verifiedReadinessResults.has(readiness) ||
    !readiness.ready ||
    readiness.mode !== "personal_transport"
  ) {
    return Object.freeze({
      available: false,
      bindingLabel: "設定完成後開放",
      message: PRODUCT_COPY.closed,
    });
  }

  return Object.freeze({
    available: true,
    bindingLabel: verifiedBinding ? "已綁定 LINE" : "尚未綁定 LINE",
    message: PRODUCT_COPY.ready,
  });
}
