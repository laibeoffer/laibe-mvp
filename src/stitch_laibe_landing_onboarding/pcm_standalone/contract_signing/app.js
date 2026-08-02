export const CONTRACT_SIGNING_STATES = Object.freeze([
  "CONTEXT_UNAVAILABLE",
  "PREREQUISITES_PENDING",
  "READY_TO_SIGN",
  "SIGNED_READ_ONLY",
  "LOAD_FAILED_RETRYABLE",
]);

export const INITIAL_CONTRACT_SIGNING_CONTEXT = Object.freeze({
  caseId: "",
  contractId: "",
  contractVersion: "",
  contractVersionHash: "",
  ownerIdentity: null,
  vendorPartySnapshot: null,
  ownerAcceptance: null,
  vendorAcceptance: null,
  writerReady: false,
  signedRecord: null,
});

function isRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function isText(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function isLowercaseSha(value) {
  return typeof value === "string" && /^[a-f0-9]{64}$/.test(value);
}

function acceptanceMatches(acceptance, expected) {
  return (
    isRecord(acceptance) &&
    acceptance.accepted === true &&
    acceptance.caseId === expected.caseId &&
    acceptance.contractId === expected.contractId &&
    acceptance.partyId === expected.partyId &&
    acceptance.actorId === expected.actorId &&
    acceptance.contractVersion === expected.contractVersion &&
    acceptance.contractVersionHash === expected.contractVersionHash
  );
}

export function evaluateContractSigningReadiness(context) {
  if (!isRecord(context)) {
    return {
      state: "CONTEXT_UNAVAILABLE",
      ready: false,
      reasonCodes: ["TRUSTED_CONTRACT_CONTEXT_REQUIRED"],
    };
  }
  if (context.loadStatus === "failed") {
    return {
      state: "LOAD_FAILED_RETRYABLE",
      ready: false,
      reasonCodes: ["CONTRACT_CONTEXT_LOAD_FAILED"],
    };
  }

  const reasons = [];
  if (!isText(context.caseId)) reasons.push("CASE_ID_REQUIRED");
  if (!isText(context.contractId)) reasons.push("CONTRACT_ID_REQUIRED");
  if (!isText(context.contractVersion)) reasons.push("CONTRACT_VERSION_REQUIRED");
  if (!isLowercaseSha(context.contractVersionHash)) reasons.push("CONTRACT_VERSION_HASH_INVALID");

  const owner = context.ownerIdentity;
  if (
    !isRecord(owner) ||
    !isText(owner.actorId) ||
    !isText(owner.partyId) ||
    owner.verified !== true
  ) reasons.push("OWNER_IDENTITY_UNVERIFIED");

  const vendor = context.vendorPartySnapshot;
  if (
    !isRecord(vendor) ||
    vendor.partyType !== "natural_person" ||
    !isText(vendor.partyId) ||
    !isText(vendor.signatoryActorId)
  ) reasons.push("VENDOR_NATURAL_PERSON_SNAPSHOT_REQUIRED");

  for (const [party, acceptance, partyId, actorId] of [
    ["OWNER", context.ownerAcceptance, owner?.partyId, owner?.actorId],
    [
      "VENDOR",
      context.vendorAcceptance,
      vendor?.partyId,
      vendor?.signatoryActorId,
    ],
  ]) {
    if (!acceptanceMatches(acceptance, {
      caseId: context.caseId,
      contractId: context.contractId,
      partyId,
      actorId,
      contractVersion: context.contractVersion,
      contractVersionHash: context.contractVersionHash,
    })) reasons.push(`${party}_EXACT_VERSION_ACCEPTANCE_REQUIRED`);
  }

  if (context.writerReady !== true) reasons.push("TRUSTED_WRITER_NOT_READY");

  if (isRecord(context.signedRecord)) {
    const signedExact =
      context.signedRecord.status === "signed" &&
      context.signedRecord.caseId === context.caseId &&
      context.signedRecord.contractId === context.contractId &&
      context.signedRecord.contractVersion === context.contractVersion &&
      context.signedRecord.contractVersionHash === context.contractVersionHash;
    if (!signedExact) reasons.push("SIGNED_RECORD_BINDING_MISMATCH");
    if (signedExact && reasons.length === 0) {
      return { state: "SIGNED_READ_ONLY", ready: false, reasonCodes: [] };
    }
  }

  if (reasons.length > 0) {
    return { state: "PREREQUISITES_PENDING", ready: false, reasonCodes: reasons };
  }
  return { state: "READY_TO_SIGN", ready: true, reasonCodes: [] };
}

export function buildContractSigningViewModel(result, context) {
  if (
    !isRecord(result) ||
    !isRecord(context) ||
    (result.state !== "READY_TO_SIGN" && result.state !== "SIGNED_READ_ONLY")
  ) return null;

  return Object.freeze({
    caseName: context.caseName,
    ownerName: context.ownerIdentity?.displayName,
    vendorName: context.vendorPartySnapshot?.displayName,
    contractVersion: context.contractVersion,
    contractId: context.contractId,
    contractHash: context.contractVersionHash,
    nextActor: context.nextActor,
  });
}

function setText(name, value) {
  const node = document.querySelector(`[data-slot="${name}"]`);
  if (node) node.textContent = isText(value) ? value : "尚待確認";
}

function render(result, context) {
  document.body.dataset.signingState = result.state;
  const signButton = document.querySelector("#signContractButton");
  if (signButton) {
    signButton.disabled = true;
    signButton.setAttribute("aria-disabled", "true");
  }
  const labels = {
    CONTEXT_UNAVAILABLE: "前提尚待確認",
    PREREQUISITES_PENDING: "仍有簽署前提待補",
    READY_TO_SIGN: "雙方可確認同一版本",
    SIGNED_READ_ONLY: "契約已成立並鎖定",
    LOAD_FAILED_RETRYABLE: "契約資料暫時無法載入",
  };
  setText("header-state", labels[result.state]);
  setText(
    "readiness-title",
    result.ready ? "簽署前提已齊，等待正式簽署入口" : "目前不能開始簽署",
  );
  const viewModel = buildContractSigningViewModel(result, context);
  if (!viewModel) return;
  setText("case-name", viewModel.caseName);
  setText("owner-name", viewModel.ownerName);
  setText("vendor-name", viewModel.vendorName);
  setText("contract-version", viewModel.contractVersion);
  setText("contract-id", viewModel.contractId);
  setText("contract-hash", viewModel.contractHash);
  setText("next-actor", viewModel.nextActor);
}

async function boot() {
  const provider = globalThis.__LAIBE_CONTRACT_SIGNING_ADAPTER__;
  if (typeof provider !== "function") {
    const result = evaluateContractSigningReadiness(INITIAL_CONTRACT_SIGNING_CONTEXT);
    render(result, INITIAL_CONTRACT_SIGNING_CONTEXT);
    return;
  }
  try {
    const context = await provider();
    render(evaluateContractSigningReadiness(context), context);
  } catch {
    render({ state: "LOAD_FAILED_RETRYABLE", ready: false, reasonCodes: ["CONTRACT_CONTEXT_LOAD_FAILED"] }, null);
  }
}

if (typeof document !== "undefined") void boot();
