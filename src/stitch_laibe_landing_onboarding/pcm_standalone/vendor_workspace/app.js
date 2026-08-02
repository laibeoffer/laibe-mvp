export const VENDOR_WORKSPACE_STATES = Object.freeze([
  "ACCESS_CHECKING",
  "ACCESS_DENIED",
  "CONTRACT_PENDING",
  "AUTHORIZED_EMPTY",
  "AUTHORIZED_READY",
  "CASE_ARCHIVED_READ_ONLY",
  "LOAD_FAILED_RETRYABLE",
]);

function isRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function isText(value) {
  return typeof value === "string" && value.trim().length > 0;
}

export function resolveVendorWorkspaceState(context) {
  if (!isRecord(context)) {
    return {
      state: "ACCESS_DENIED",
      reasonCode: "TRUSTED_VENDOR_CONTEXT_REQUIRED",
    };
  }

  if (context.loadStatus === "checking") {
    return { state: "ACCESS_CHECKING", reasonCode: "VENDOR_CONTEXT_CHECKING" };
  }
  if (context.loadStatus === "failed") {
    return { state: "LOAD_FAILED_RETRYABLE", reasonCode: "VENDOR_CONTEXT_LOAD_FAILED" };
  }

  const actor = context.actor;
  const membership = context.membership;
  const binding = context.caseBinding;
  const agreement = context.agreement;
  const caseId = membership?.caseId;
  const identityValid =
    context.sessionStatus === "active" &&
    isRecord(actor) &&
    isText(actor.actorId) &&
    actor.role === "vendor" &&
    isRecord(membership) &&
    membership.actorId === actor.actorId &&
    membership.role === "vendor" &&
    membership.status === "active" &&
    membership.invitationStatus === "accepted" &&
    isText(caseId) &&
    isRecord(binding) &&
    binding.status === "bound" &&
    binding.caseId === caseId;

  if (!identityValid) {
    return { state: "ACCESS_DENIED", reasonCode: "VENDOR_CASE_ACCESS_DENIED" };
  }

  const agreementExact =
    isRecord(agreement) &&
    agreement.caseId === caseId &&
    isText(agreement.version) &&
    agreement.status === "active" &&
    agreement.vendorAccepted === true &&
    agreement.vendorActorId === actor.actorId;
  if (!agreementExact) {
    return { state: "CONTRACT_PENDING", reasonCode: "VENDOR_AGREEMENT_PENDING" };
  }

  if (context.caseStatus !== "active" && context.caseStatus !== "archived") {
    return { state: "ACCESS_DENIED", reasonCode: "VENDOR_CASE_STATE_INVALID" };
  }

  if (!isRecord(context.caseSummary)) {
    return { state: "AUTHORIZED_EMPTY", reasonCode: "VENDOR_CASE_SUMMARY_PENDING" };
  }
  if (context.caseSummary.caseId !== caseId) {
    return { state: "ACCESS_DENIED", reasonCode: "VENDOR_CASE_SUMMARY_MISMATCH" };
  }

  if (context.caseStatus === "archived") {
    return { state: "CASE_ARCHIVED_READ_ONLY", reasonCode: "VENDOR_CASE_ARCHIVED" };
  }

  return {
    state: "AUTHORIZED_READY",
    reasonCode: "VENDOR_CASE_CONTEXT_CONFIRMED",
  };
}

function setText(name, value) {
  const node = document.querySelector(`[data-slot="${name}"]`);
  if (node) node.textContent = isText(value) ? value : "尚待確認";
}

function render(result, context) {
  document.body.dataset.vendorState = result.state;
  const messages = {
    ACCESS_CHECKING: "正在確認你的乙方身分與案件資格。",
    ACCESS_DENIED: "尚未取得可供顯示的案件權限。",
    CONTRACT_PENDING: "請先確認並接受同一份合作版本。",
    AUTHORIZED_EMPTY: "案件資格已確認，內容仍待整理。",
    AUTHORIZED_READY: "案件資格與合作版本已確認。",
    CASE_ARCHIVED_READ_ONLY: "案件已結束，目前僅供查閱既有紀錄。",
    LOAD_FAILED_RETRYABLE: "案件內容暫時無法載入，請稍後再試。",
  };
  setText("access-message", messages[result.state]);

  if (result.state !== "AUTHORIZED_READY" && result.state !== "CASE_ARCHIVED_READ_ONLY") return;
  const summary = context.caseSummary;
  setText("vendor-name", context.actor.displayName);
  setText("case-name", summary.caseName);
  setText("case-address", summary.caseAddress);
  setText("case-state", result.state === "CASE_ARCHIVED_READ_ONLY" ? "只讀封存" : summary.caseState);
  setText("document-version", summary.documentVersion);
  setText("open-items", summary.openItems);
  setText("next-milestone", summary.nextMilestone);
  setText("agreement-state", "合作版本已確認");
  setText("next-actor", summary.nextActor);
  setText("next-action", summary.nextAction);
}

async function boot() {
  const provider = globalThis.__LAIBE_VENDOR_WORKSPACE_ADAPTER__;
  if (typeof provider !== "function") {
    render(resolveVendorWorkspaceState(), null);
    return;
  }
  try {
    const context = await provider();
    render(resolveVendorWorkspaceState(context), context);
  } catch {
    render({ state: "LOAD_FAILED_RETRYABLE", reasonCode: "VENDOR_CONTEXT_LOAD_FAILED" }, null);
  }
}

if (typeof document !== "undefined") void boot();
