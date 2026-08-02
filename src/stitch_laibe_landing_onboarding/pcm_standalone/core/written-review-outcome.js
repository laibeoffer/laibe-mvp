export const WRITTEN_REVIEW_STATES = Object.freeze([
  "NOT_SUBMITTED",
  "DOCUMENTS_INCOMPLETE",
  "SUPPLEMENT_REQUIRED",
  "UNDER_DOCUMENT_REVIEW",
  "DOCUMENT_CONFLICT",
  "UNABLE_TO_DETERMINE",
  "WRITTEN_CONDITIONS_MET",
  "WRITTEN_CONDITIONS_NOT_MET",
  "OBJECTION_PERIOD_ACTIVE",
  "OBJECTION_SUBMITTED",
  "PAYMENT_PROCEDURE_READY",
  "WRITTEN_GOVERNANCE_INVALID",
  "PCM_TERMINATED",
]);

const REVIEW_SCOPE_STATEMENT = "僅依已提交且可辨識的文件版本進行書面核對。";
const PCM_RESPONSIBILITY_STATEMENT =
  "PCM 對書面規則、文件核對、程序通知、期限與留痕負責。";

function outcome(state) {
  return Object.freeze({
    state,
    scopeStatement: REVIEW_SCOPE_STATEMENT,
    responsibilityStatement: PCM_RESPONSIBILITY_STATEMENT,
    qualityGuarantee: false,
    onSiteQuality: "NOT_DETERMINED",
    paymentAuthorization: false,
    contractorPaymentDue: "NOT_DETERMINED",
    historyReadable: true,
    canManageFurther: state !== "PCM_TERMINATED",
  });
}

export function evaluateWrittenReview(input = {}) {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new TypeError("書面審查資料格式不正確。");
  }

  if (input.pcmTerminated === true) {
    return outcome("PCM_TERMINATED");
  }

  if (
    input.governanceValid === false ||
    input.supplementRefused === true
  ) {
    return outcome("WRITTEN_GOVERNANCE_INVALID");
  }

  if (input.submitted !== true) {
    return outcome("NOT_SUBMITTED");
  }

  if (input.requiredDocumentsComplete !== true) {
    return outcome(
      input.reviewStarted === true
        ? "SUPPLEMENT_REQUIRED"
        : "DOCUMENTS_INCOMPLETE",
    );
  }

  if (input.documentConflict === true) {
    return outcome("DOCUMENT_CONFLICT");
  }

  if (input.objectionSubmitted === true) {
    return outcome(
      input.objectionEvidencePresent === true
        ? "OBJECTION_SUBMITTED"
        : "SUPPLEMENT_REQUIRED",
    );
  }

  if (input.objectionPeriodActive === true) {
    return outcome("OBJECTION_PERIOD_ACTIVE");
  }

  if (input.determination === "unable") {
    return outcome("UNABLE_TO_DETERMINE");
  }

  if (input.determination === "met") {
    if (input.paymentProcedureRequested === true) {
      return outcome(
        input.writtenAcceptanceDocumentPresent === true
          ? "PAYMENT_PROCEDURE_READY"
          : "SUPPLEMENT_REQUIRED",
      );
    }
    return outcome("WRITTEN_CONDITIONS_MET");
  }

  if (input.determination === "not_met") {
    return outcome("WRITTEN_CONDITIONS_NOT_MET");
  }

  return outcome("UNDER_DOCUMENT_REVIEW");
}
