import type { BudgetSheetTotals } from "../output/types.ts";
import type { FormalRendererToken } from "./formal-renderer-token.ts";
import type {
  FormalLayoutContract,
  FormalColumnSpec,
  FormalSectionSpec,
} from "./formal-layout-contract.ts";
import type { RenderedBudgetRow } from "./types.ts";

export type FormalArtifactAudience = "customer" | "internal_trace";

export type FormalArtifactFormat = "excel" | "pdf";

export type FormalArtifactStorageTarget =
  | "local_artifact_staging"
  | "review_packet_attachment";

export interface FormalArtifactNamingRule {
  pattern: string;
  example: string;
  snapshot_id_required: true;
}

export interface FormalArtifactStorageTargetRule {
  target: FormalArtifactStorageTarget;
  description: string;
  allows_file_write: boolean;
}

export interface FormalArtifactSecurityRule {
  rule_code: string;
  description: string;
  required: true;
}

export interface FormalArtifactPolicy {
  policy_id: string;
  audiences: FormalArtifactAudience[];
  formats: FormalArtifactFormat[];
  naming_rule: FormalArtifactNamingRule;
  storage_targets: FormalArtifactStorageTargetRule[];
  security_rules: FormalArtifactSecurityRule[];
}

export interface FormalRenderedSkeletonOutput {
  renderer_contract: "formal_renderer_entry_gated";
  renderer_entry_token: FormalRendererToken;
  renderer: "formal_excel_skeleton" | "formal_pdf_skeleton";
  audience: FormalArtifactAudience;
  format: "excel_skeleton" | "pdf_skeleton";
  render_id: string;
  snapshot_id: string;
  project_id: string;
  estimate_id: string;
  estimate_stage: string;
  generated_at: string;
  title: string;
  layout_contract: FormalLayoutContract & {
    columns: FormalColumnSpec[];
    sections: FormalSectionSpec[];
  };
  rows: RenderedBudgetRow[];
  totals: BudgetSheetTotals;
  warnings: string[];
}

export const FORMAL_ARTIFACT_FILENAME_PREFIX = "laibe-budget";

export const defaultFormalArtifactPolicy: FormalArtifactPolicy = {
  policy_id: "formal-artifact-policy-v1",
  audiences: ["customer", "internal_trace"],
  formats: ["excel", "pdf"],
  naming_rule: {
    pattern:
      "laibe-budget-{project_id}-{estimate_id}-{audience}-{snapshot_id}.{xlsx|pdf}",
    example:
      "laibe-budget-project_fixture_budget_output-estimate_fixture_001-customer-snapshot_fixture_output_001.xlsx",
    snapshot_id_required: true,
  },
  storage_targets: [
    {
      target: "local_artifact_staging",
      description:
        "Local staging metadata path for reviewable placeholder artifacts.",
      allows_file_write: true,
    },
    {
      target: "review_packet_attachment",
      description:
        "Review packet metadata attachment target. No local file write is implied.",
      allows_file_write: false,
    },
  ],
  security_rules: [
    {
      rule_code: "snapshot_only",
      description: "Writer input must come from a snapshot-gated document.",
      required: true,
    },
    {
      rule_code: "preflight_first",
      description: "Writer entry must run preflight before artifact output.",
      required: true,
    },
    {
      rule_code: "no_engine_lookup",
      description:
        "Writer must not rebuild estimates or query calculation sources.",
      required: true,
    },
    {
      rule_code: "no_internal_to_customer",
      description:
        "Customer artifacts must not contain internal trace fields.",
      required: true,
    },
    {
      rule_code: "snapshot_id_recorded",
      description: "Every artifact manifest must record snapshot_id.",
      required: true,
    },
  ],
};

export const isFormalArtifactAudience = (
  value: unknown,
): value is FormalArtifactAudience =>
  value === "customer" || value === "internal_trace";

export const isFormalArtifactFormat = (
  value: unknown,
): value is FormalArtifactFormat => value === "excel" || value === "pdf";

export const isFormalArtifactStorageTarget = (
  value: unknown,
): value is FormalArtifactStorageTarget =>
  value === "local_artifact_staging" ||
  value === "review_packet_attachment";

export const getFormalArtifactExtension = (
  format: FormalArtifactFormat,
): "xlsx" | "pdf" => (format === "excel" ? "xlsx" : "pdf");

const sanitizeFilenamePart = (value: string): string =>
  value
    .trim()
    .replace(/[^a-zA-Z0-9_-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

export const buildFormalArtifactFilename = (
  output: Pick<
    FormalRenderedSkeletonOutput,
    "project_id" | "estimate_id" | "audience" | "snapshot_id"
  >,
  format: FormalArtifactFormat,
): string => {
  const parts = [
    FORMAL_ARTIFACT_FILENAME_PREFIX,
    sanitizeFilenamePart(output.project_id),
    sanitizeFilenamePart(output.estimate_id),
    sanitizeFilenamePart(output.audience),
    sanitizeFilenamePart(output.snapshot_id),
  ];

  return `${parts.join("-")}.${getFormalArtifactExtension(format)}`;
};

const formatFromRenderer = (
  renderer: FormalRenderedSkeletonOutput["renderer"],
): FormalArtifactFormat | null => {
  if (renderer === "formal_excel_skeleton") {
    return "excel";
  }

  if (renderer === "formal_pdf_skeleton") {
    return "pdf";
  }

  return null;
};

const formatFromSkeletonFormat = (
  format: FormalRenderedSkeletonOutput["format"],
): FormalArtifactFormat | null => {
  if (format === "excel_skeleton") {
    return "excel";
  }

  if (format === "pdf_skeleton") {
    return "pdf";
  }

  return null;
};

export const inferFormalArtifactFormat = (
  output: Pick<FormalRenderedSkeletonOutput, "renderer" | "format">,
): FormalArtifactFormat => {
  const rendererFormat = formatFromRenderer(output.renderer);
  const skeletonFormat = formatFromSkeletonFormat(output.format);

  if (!rendererFormat || !skeletonFormat) {
    throw new Error("Unknown formal renderer output format.");
  }

  if (rendererFormat !== skeletonFormat) {
    throw new Error(
      `Formal renderer / format mismatch: ${output.renderer} cannot produce ${output.format}.`,
    );
  }

  return rendererFormat;
};

export const storageTargetIsAllowed = (
  policy: FormalArtifactPolicy,
  target: FormalArtifactStorageTarget,
): boolean =>
  policy.storage_targets.some((storageTarget) => storageTarget.target === target);

export const storageTargetAllowsFileWrite = (
  policy: FormalArtifactPolicy,
  target: FormalArtifactStorageTarget,
): boolean =>
  policy.storage_targets.some(
    (storageTarget) =>
      storageTarget.target === target && storageTarget.allows_file_write,
  );
