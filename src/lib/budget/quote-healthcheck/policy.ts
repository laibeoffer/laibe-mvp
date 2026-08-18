import type {
  EvaluationSection,
  QuoteHealthcheckMode,
  QuoteHealthSections,
  QuoteReviewDependencies,
  SectionReasonCode,
  ValidationIssue,
} from "./types.ts";
import {
  KNOWLEDGE_RELEASE_SCHEMA,
  PLAN_PUZZLE_SNAPSHOT_SCHEMA,
  SPEC_REFERENCE_TYPE,
} from "./types.ts";
import {
  addIssue,
  hasIdentity,
  isRecord,
  isSha256,
  requireClosedKeys,
  requireIdentity,
} from "./validation.ts";

const DEPENDENCY_KEYS = [
  "a0Case",
  "spec",
  "planSnapshot",
  "knowledgeRelease",
  "rawA11Present",
  "rawA12Present",
] as const;

const acceptedStatus = (value: unknown): boolean =>
  value === "TEST_ONLY_CONFORMING_REFERENCE" || value === "A0_ACCEPTED";

const validateStatus = (
  value: unknown,
  path: string,
  issues: ValidationIssue[],
): void => {
  if (!acceptedStatus(value)) {
    addIssue(
      issues,
      path,
      "REFERENCE_STATUS_INVALID",
      "Reference status is unsupported.",
    );
  }
};

const isPositiveInteger = (value: unknown): value is number =>
  Number.isInteger(value) && Number(value) > 0;

export const parseQuoteReviewDependencies = (
  value: unknown,
  caseId: string,
  issues: ValidationIssue[],
): QuoteReviewDependencies => {
  if (!isRecord(value)) {
    addIssue(
      issues,
      "dependencies",
      "DEPENDENCIES_REQUIRED",
      "Dependencies must be a closed object.",
    );
    return {};
  }
  requireClosedKeys(value, DEPENDENCY_KEYS, "dependencies", issues);
  const parsed: QuoteReviewDependencies = {};

  if (value.a0Case !== undefined) {
    if (!isRecord(value.a0Case)) {
      addIssue(
        issues,
        "dependencies.a0Case",
        "A0_CASE_REFERENCE_INVALID",
        "A0 case reference must be an object.",
      );
    } else {
      requireClosedKeys(
        value.a0Case,
        ["caseId", "status"],
        "dependencies.a0Case",
        issues,
      );
      requireIdentity(
        value.a0Case.caseId,
        "dependencies.a0Case.caseId",
        issues,
      );
      validateStatus(value.a0Case.status, "dependencies.a0Case.status", issues);
      if (value.a0Case.caseId !== caseId) {
        addIssue(
          issues,
          "dependencies.a0Case.caseId",
          "CASE_MISMATCH",
          "A0 case reference must match the document case.",
        );
      }
      if (
        hasIdentity(value.a0Case.caseId) && acceptedStatus(value.a0Case.status)
      ) {
        parsed.a0Case = value
          .a0Case as unknown as QuoteReviewDependencies["a0Case"];
      }
    }
  }

  if (value.spec !== undefined) {
    if (!isRecord(value.spec)) {
      addIssue(
        issues,
        "dependencies.spec",
        "SPEC_REFERENCE_INVALID",
        "SPEC reference must be an object.",
      );
    } else {
      const start = issues.length;
      requireClosedKeys(
        value.spec,
        ["referenceType", "caseId", "referenceId", "status"],
        "dependencies.spec",
        issues,
      );
      if (value.spec.referenceType !== SPEC_REFERENCE_TYPE) {
        addIssue(
          issues,
          "dependencies.spec.referenceType",
          "SPEC_REFERENCE_INVALID",
          "The A0 pinned SPEC reference type is required.",
        );
      }
      requireIdentity(value.spec.caseId, "dependencies.spec.caseId", issues);
      requireIdentity(
        value.spec.referenceId,
        "dependencies.spec.referenceId",
        issues,
      );
      if (value.spec.caseId !== caseId) {
        addIssue(
          issues,
          "dependencies.spec.caseId",
          "CASE_MISMATCH",
          "SPEC must match the document case.",
        );
      }
      if (value.spec.status !== "pinned") {
        addIssue(
          issues,
          "dependencies.spec.status",
          "SPEC_NOT_PINNED",
          "SPEC must be pinned by A0 authority.",
        );
      }
      if (issues.length === start) {
        parsed.spec = value.spec as unknown as QuoteReviewDependencies["spec"];
      }
    }
  }

  if (value.planSnapshot !== undefined) {
    if (!isRecord(value.planSnapshot)) {
      addIssue(
        issues,
        "dependencies.planSnapshot",
        "PLAN_SNAPSHOT_INVALID",
        "Plan snapshot must be an object.",
      );
    } else {
      const start = issues.length;
      requireClosedKeys(
        value.planSnapshot,
        [
          "schemaName",
          "schemaVersion",
          "packetId",
          "packetVersion",
          "packetSha256",
          "caseId",
          "status",
          "current",
        ],
        "dependencies.planSnapshot",
        issues,
      );
      if (value.planSnapshot.schemaName !== PLAN_PUZZLE_SNAPSHOT_SCHEMA) {
        addIssue(
          issues,
          "dependencies.planSnapshot.schemaName",
          "UNKNOWN_MAJOR",
          "Only laibe.plan-puzzle-snapshot.v1 is accepted.",
        );
      }
      if (value.planSnapshot.schemaVersion !== 1) {
        addIssue(
          issues,
          "dependencies.planSnapshot.schemaVersion",
          "UNKNOWN_MAJOR",
          "Plan snapshot schemaVersion must be 1.",
        );
      }
      requireIdentity(
        value.planSnapshot.packetId,
        "dependencies.planSnapshot.packetId",
        issues,
      );
      if (!isPositiveInteger(value.planSnapshot.packetVersion)) {
        addIssue(
          issues,
          "dependencies.planSnapshot.packetVersion",
          "PLAN_SNAPSHOT_VERSION_INVALID",
          "Plan snapshot packetVersion must be a positive integer.",
        );
      }
      if (!isSha256(value.planSnapshot.packetSha256)) {
        addIssue(
          issues,
          "dependencies.planSnapshot.packetSha256",
          "PLAN_SNAPSHOT_HASH_INVALID",
          "Plan snapshot packetSha256 must be a lowercase SHA-256.",
        );
      }
      requireIdentity(
        value.planSnapshot.caseId,
        "dependencies.planSnapshot.caseId",
        issues,
      );
      if (value.planSnapshot.caseId !== caseId) {
        addIssue(
          issues,
          "dependencies.planSnapshot.caseId",
          "CASE_MISMATCH",
          "Plan snapshot must match the document case.",
        );
      }
      if (value.planSnapshot.status !== "active") {
        addIssue(
          issues,
          "dependencies.planSnapshot.status",
          "DEPENDENCY_INACTIVE",
          "Plan snapshot must be active.",
        );
      }
      if (value.planSnapshot.current !== true) {
        addIssue(
          issues,
          "dependencies.planSnapshot.current",
          "DEPENDENCY_STALE",
          "Plan snapshot must be current.",
        );
      }
      if (issues.length === start) {
        parsed.planSnapshot = value
          .planSnapshot as unknown as QuoteReviewDependencies["planSnapshot"];
      }
    }
  }

  if (value.knowledgeRelease !== undefined) {
    if (!isRecord(value.knowledgeRelease)) {
      addIssue(
        issues,
        "dependencies.knowledgeRelease",
        "KNOWLEDGE_RELEASE_INVALID",
        "Knowledge release must be an object.",
      );
    } else {
      const start = issues.length;
      requireClosedKeys(
        value.knowledgeRelease,
        [
          "schemaVersion",
          "releaseId",
          "releaseVersion",
          "contentSha256",
          "lifecycleState",
          "current",
        ],
        "dependencies.knowledgeRelease",
        issues,
      );
      if (
        value.knowledgeRelease.schemaVersion !== KNOWLEDGE_RELEASE_SCHEMA
      ) {
        addIssue(
          issues,
          "dependencies.knowledgeRelease.schemaVersion",
          "UNKNOWN_MAJOR",
          "Only laibe.knowledge-release.v1 is accepted.",
        );
      }
      requireIdentity(
        value.knowledgeRelease.releaseId,
        "dependencies.knowledgeRelease.releaseId",
        issues,
      );
      if (!isPositiveInteger(value.knowledgeRelease.releaseVersion)) {
        addIssue(
          issues,
          "dependencies.knowledgeRelease.releaseVersion",
          "KNOWLEDGE_RELEASE_VERSION_INVALID",
          "Knowledge releaseVersion must be a positive integer.",
        );
      }
      if (!isSha256(value.knowledgeRelease.contentSha256)) {
        addIssue(
          issues,
          "dependencies.knowledgeRelease.contentSha256",
          "KNOWLEDGE_RELEASE_HASH_INVALID",
          "Knowledge release contentSha256 must be a lowercase SHA-256.",
        );
      }
      if (value.knowledgeRelease.lifecycleState !== "active") {
        addIssue(
          issues,
          "dependencies.knowledgeRelease.lifecycleState",
          "DEPENDENCY_INACTIVE",
          "Knowledge release must be active.",
        );
      }
      if (value.knowledgeRelease.current !== true) {
        addIssue(
          issues,
          "dependencies.knowledgeRelease.current",
          "DEPENDENCY_STALE",
          "Knowledge release must be current.",
        );
      }
      if (issues.length === start) {
        parsed.knowledgeRelease = value
          .knowledgeRelease as unknown as QuoteReviewDependencies[
            "knowledgeRelease"
          ];
      }
    }
  }

  for (const key of ["rawA11Present", "rawA12Present"] as const) {
    if (value[key] !== undefined && typeof value[key] !== "boolean") {
      addIssue(
        issues,
        `dependencies.${key}`,
        "BOOLEAN_REQUIRED",
        "Raw-source presence must be boolean.",
      );
    }
    if (typeof value[key] === "boolean") parsed[key] = value[key];
  }
  return parsed;
};

const notEvaluated = (
  ...reasonCodes: SectionReasonCode[]
): EvaluationSection => ({
  status: "NOT_EVALUATED",
  reasonCodes,
});

export const evaluateQuoteHealthSections = (
  mode: QuoteHealthcheckMode,
  dependencies: QuoteReviewDependencies,
): QuoteHealthSections => {
  const internalDocumentChecks: EvaluationSection = {
    status: "EVALUATED",
    reasonCodes: [],
  };
  if (mode === "PRE_CONTRACT_QUOTE_HEALTHCHECK") {
    return {
      internalDocumentChecks,
      scopeComparison: notEvaluated("MODE_NOT_REQUIRED"),
      planComparison: notEvaluated("MODE_NOT_REQUIRED"),
      priceEvidenceComparison: notEvaluated("MODE_NOT_REQUIRED"),
    };
  }

  const allBindingsPresent = Boolean(
    dependencies.a0Case && dependencies.spec && dependencies.planSnapshot &&
      dependencies.knowledgeRelease,
  );
  const baseReason: SectionReasonCode = allBindingsPresent
    ? "COMPARISON_ENGINE_NOT_IMPLEMENTED"
    : "DEPENDENCY_MISSING";
  const rawReasons: SectionReasonCode[] =
    dependencies.rawA11Present || dependencies.rawA12Present
      ? [baseReason, "RAW_A11_A12_NOT_ACCEPTED"]
      : [baseReason];
  return {
    internalDocumentChecks,
    scopeComparison: notEvaluated(baseReason),
    planComparison: notEvaluated(...rawReasons),
    priceEvidenceComparison: notEvaluated(baseReason),
  };
};
