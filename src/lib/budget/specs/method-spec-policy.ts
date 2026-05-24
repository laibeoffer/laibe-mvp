export const BLOCKED_PRICING_SOURCE_TYPES = new Set([
  "raw",
  "candidate",
  "rag",
  "ai",
  "llm",
  "ai_generated",
  "rag_suggested",
  "candidate_import",
]);

export const BLOCKED_LABOR_PRICING_SOURCE_TYPES = new Set([
  "labor_rule",
  "labor_derived",
  "labor_formula",
  "labor_rate",
  "labor_rate_derived",
]);

export const ALLOWED_UNBOUND_MATERIAL_ITEM_CODES = new Set([
  "ELECTRIC_SOCKET_EXTENSION",
  "ELECTRIC_LIGHTING_INSTALL",
  "OTHER_PROTECTION_WORK",
  "OTHER_CLEANING_WORK",
  "OTHER_MANAGEMENT_FEE",
]);

export const ALLOWED_MISSING_SCOPE_RULE_ITEM_CODES = new Set([
  "OTHER_MANAGEMENT_FEE",
  "OTHER_PROTECTION_WORK",
  "OTHER_CLEANING_WORK",
]);

export const REQUIRED_UNIT_CONVERSION_PAIRS = [
  { from_unit: "cm", to_unit: "尺" },
  { from_unit: "mm", to_unit: "cm" },
  { from_unit: "m2", to_unit: "坪" },
  { from_unit: "cm", to_unit: "m" },
  { from_unit: "m", to_unit: "cm" },
] as const;
