const EXACT_HEAD_SHA = "2c4418301be57b86a87ba0d83e37cd3d237ea302";
const verifiedReadinessResults = new WeakSet();

const PRODUCT_COPY = Object.freeze({
  readAllowed: "這項案件資料可在完成上線驗證後提供查詢。",
  unavailableRead: "此項案件資料功能正在整理中。",
  unavailableWrite: "此項案件留痕功能正在整理中。",
  controlledAccess: "案件資料必須經過受控入口處理。",
  imageNotCanonical: "圖片目前只供檢視，不會標示為正式案件文件。",
  documentWritePending: "正式案件文件留痕功能正在整理中。",
  integrationPending:
    "案件知識與留痕功能正在整理中，正式開放後會提供完整操作入口。",
  integrationReady: "案件知識查詢與留痕功能已完成必要驗證。",
});

export const A5_CORE_CANDIDATE = Object.freeze({
  pullRequestNumber: 112,
  pullRequestState: "draft",
  exactHeadSha: EXACT_HEAD_SHA,
  migrationApplied: false,
  edgeDeployed: false,
});

export const A5_PCM_READ_RPCS = Object.freeze([
  "gateway_search_knowledge",
  "gateway_get_knowledge_entry",
  "gateway_get_case_evidence",
]);

function decision(allowed, code, message) {
  return Object.freeze({ allowed, code, message });
}

export function classifyA5CoreAccess(operation = {}, readiness) {
  if (
    operation.kind === "rpc" &&
    operation.mode === "read" &&
    A5_PCM_READ_RPCS.includes(operation.name)
  ) {
    if (
      !verifiedReadinessResults.has(readiness) ||
      readiness.readReady !== true
    ) {
      return decision(
        false,
        "A5_CORE_NOT_READY",
        PRODUCT_COPY.integrationPending,
      );
    }

    return decision(true, "A5_PUBLIC_READ_RPC", PRODUCT_COPY.readAllowed);
  }

  if (
    operation.kind === "rpc" &&
    operation.name === "gateway_record_finding"
  ) {
    return decision(
      false,
      "A12_WRITER_FORBIDDEN",
      PRODUCT_COPY.unavailableWrite,
    );
  }

  if (operation.kind === "rpc" && operation.mode === "write") {
    return decision(
      false,
      "A0_WRITE_CONTRACT_REQUIRED",
      PRODUCT_COPY.unavailableWrite,
    );
  }

  if (operation.kind === "rpc") {
    return decision(
      false,
      "A5_RPC_NOT_ALLOWLISTED",
      PRODUCT_COPY.unavailableRead,
    );
  }

  if (operation.kind === "table") {
    return decision(
      false,
      "PRIVATE_TABLE_ACCESS_FORBIDDEN",
      PRODUCT_COPY.controlledAccess,
    );
  }

  if (
    operation.kind === "canonical_document" &&
    ["image/jpeg", "image/png"].includes(operation.mimeType)
  ) {
    return decision(
      false,
      "CANONICAL_IMAGE_PARENT_UNAPPROVED",
      PRODUCT_COPY.imageNotCanonical,
    );
  }

  if (operation.kind === "canonical_document") {
    return decision(
      false,
      "A0_WRITE_CONTRACT_REQUIRED",
      PRODUCT_COPY.documentWritePending,
    );
  }

  return decision(
    false,
    "A5_CAPABILITY_NOT_ALLOWLISTED",
    PRODUCT_COPY.unavailableRead,
  );
}

export function assessA5CoreReadiness(input = {}) {
  const checks = Object.freeze({
    exact_candidate_head: input.candidateHeadSha === EXACT_HEAD_SHA,
    exact_bundle: input.exactBundleVerified === true,
    migration_apply: input.migrationApplied === true,
    edge_deploy: input.edgeDeployed === true,
    active_session_claims: input.activeSessionClaimsVerified === true,
    a0_write_contract: input.a0WriteContractVerified === true,
  });
  const missing = Object.freeze(
    Object.entries(checks)
      .filter(([, verified]) => !verified)
      .map(([name]) => name),
  );
  const readReady = Object.values(checks).slice(0, 5).every(Boolean);
  const writeReady = readReady && checks.a0_write_contract;

  const result = Object.freeze({
    readReady,
    writeReady,
    mode: writeReady ? "read_and_write" : readReady ? "read_only" : "closed",
    missing,
    message: writeReady
      ? PRODUCT_COPY.integrationReady
      : PRODUCT_COPY.integrationPending,
  });
  verifiedReadinessResults.add(result);
  return result;
}
