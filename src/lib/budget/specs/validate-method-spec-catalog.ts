import {
  getRecipeCode,
  getRecipeOutputItemCode,
  getTemplateItemCode,
} from "../storage/budget-catalog.ts";
import type {
  MethodSpecAllowedCondition,
  MethodSpecCatalog,
  MethodSpecGuardResult,
  MethodSpecValidationIssue,
  MethodSpecValidationReport,
} from "./types.ts";
import {
  ALLOWED_MISSING_SCOPE_RULE_ITEM_CODES,
  ALLOWED_UNBOUND_MATERIAL_ITEM_CODES,
  BLOCKED_LABOR_PRICING_SOURCE_TYPES,
  BLOCKED_PRICING_SOURCE_TYPES,
  REQUIRED_UNIT_CONVERSION_PAIRS,
} from "./method-spec-policy.ts";

const pricingRuleItemCode = (rule: {
  item_code?: string;
  quote_item_template_id: string;
}): string => rule.item_code ?? rule.quote_item_template_id;

const findDuplicates = (values: string[]): string[] => {
  const seen = new Set<string>();
  const duplicates = new Set<string>();

  for (const value of values) {
    if (seen.has(value)) {
      duplicates.add(value);
    }
    seen.add(value);
  }

  return [...duplicates];
};

type UnitConversionPair = {
  from_unit: string;
  to_unit: string;
};

const normalizeUnit = (unit: string): string => unit.trim().toLowerCase();

const unitConversionPairKey = (pair: UnitConversionPair): string =>
  `${normalizeUnit(pair.from_unit)}->${normalizeUnit(pair.to_unit)}`;

const pushUniqueConversionPair = (
  pairs: UnitConversionPair[],
  pair: UnitConversionPair,
): void => {
  const pairKey = unitConversionPairKey(pair);

  if (!pairs.some((existingPair) => unitConversionPairKey(existingPair) === pairKey)) {
    pairs.push(pair);
  }
};

const hasStandaloneM = (value: string): boolean =>
  /(^|[^a-z])m([^a-z]|$)/.test(value);

const inferFormulaUnitConversions = (
  recipeCode: string,
  output: {
    item_code?: string;
    quote_item_template_id: string;
    quantity_fact_type: string;
    unit: string;
    quantity_formula: string;
  },
): Array<UnitConversionPair & { ref: string }> => {
  const formula = output.quantity_formula.trim();
  const normalizedFormula = formula.toLowerCase();
  const normalizedQuantityFactType = output.quantity_fact_type.toLowerCase();
  const normalizedOutputUnit = normalizeUnit(output.unit);
  const pairs: UnitConversionPair[] = [];
  const itemCode = getRecipeOutputItemCode(output);
  const ref = `${recipeCode}:${itemCode}:${formula}`;

  if (
    (normalizedFormula.includes("30.3") || output.unit.trim() === "尺") &&
    (normalizedFormula.includes("cm") ||
      normalizedQuantityFactType.includes("_cm") ||
      output.unit.trim() === "尺")
  ) {
    pushUniqueConversionPair(pairs, { from_unit: "cm", to_unit: "尺" });
  }

  if (
    (normalizedFormula.includes("3.305785") ||
      normalizedFormula.includes("m2") ||
      normalizedQuantityFactType.includes("_m2") ||
      output.unit.trim() === "坪") &&
    (normalizedFormula.includes("m2") ||
      normalizedQuantityFactType.includes("_m2") ||
      output.unit.trim() === "坪")
  ) {
    pushUniqueConversionPair(pairs, { from_unit: "m2", to_unit: "坪" });
  }

  if (
    normalizedFormula.includes("mm") &&
    (normalizedFormula.includes("0.1") || normalizedOutputUnit === "cm")
  ) {
    pushUniqueConversionPair(pairs, { from_unit: "mm", to_unit: "cm" });
  }

  if (
    normalizedFormula.includes("cm_to_m") ||
    (normalizedFormula.includes("cm") && /\/\s*100/.test(normalizedFormula)) ||
    (normalizedOutputUnit === "m" &&
      (normalizedFormula.includes("cm") ||
        normalizedQuantityFactType.includes("_cm")))
  ) {
    pushUniqueConversionPair(pairs, { from_unit: "cm", to_unit: "m" });
  }

  if (
    normalizedFormula.includes("m_to_cm") ||
    (hasStandaloneM(normalizedFormula) && /\*\s*100/.test(normalizedFormula)) ||
    (normalizedOutputUnit === "cm" &&
      (normalizedQuantityFactType.endsWith("_m") ||
        normalizedFormula.includes("_m ")))
  ) {
    pushUniqueConversionPair(pairs, { from_unit: "m", to_unit: "cm" });
  }

  return pairs.map((pair) => ({ ...pair, ref }));
};

const pushIssue = (
  issues: MethodSpecValidationIssue[],
  issue: MethodSpecValidationIssue,
): void => {
  issues.push(issue);
};

const pushAllowedCondition = (
  allowedConditions: MethodSpecAllowedCondition[],
  allowedCondition: MethodSpecAllowedCondition,
): void => {
  allowedConditions.push(allowedCondition);
};

const pushGuardResult = (
  guardResults: MethodSpecGuardResult[],
  guardResult: MethodSpecGuardResult,
): void => {
  guardResults.push(guardResult);
};

export const validateMethodSpecCatalog = (
  catalog: MethodSpecCatalog,
): MethodSpecValidationReport => {
  const issues: MethodSpecValidationIssue[] = [];
  const allowedConditions: MethodSpecAllowedCondition[] = [];
  const guardResults: MethodSpecGuardResult[] = [];
  const templatesByItemCode = new Map(
    catalog.quote_item_templates.map((template) => [
      getTemplateItemCode(template),
      template,
    ]),
  );
  const pricingRulesByItemCode = new Map(
    catalog.pricing_rules.map((rule) => [pricingRuleItemCode(rule), rule]),
  );
  const materialSpecsByCode = new Map(
    catalog.material_specs.map((material) => [
      material.material_code,
      material,
    ]),
  );
  const customerVisibleNoteItemCodes = new Set(
    catalog.note_templates
      .filter((note) => note.is_active && note.is_customer_visible)
      .flatMap((note) => note.applies_to_item_codes),
  );
  const blockedPricingSourceRefs: string[] = [];
  const laborPricingSourceRefs: string[] = [];
  const availableUnitConversionPairKeys = new Set(
    catalog.unit_conversions.map(unitConversionPairKey),
  );
  const missingRequiredUnitConversionRefs: string[] = [];
  const missingFormulaUnitConversionRefs: string[] = [];
  const missingUnitConversionPairKeys = new Set<string>();

  for (const itemCode of findDuplicates(
    catalog.quote_item_templates.map(getTemplateItemCode),
  )) {
    pushIssue(issues, {
      severity: "error",
      code: "duplicate_item_code",
      message: `QuoteItemTemplate item_code is duplicated: ${itemCode}`,
      ref: itemCode,
    });
  }

  for (const recipeCode of findDuplicates(
    catalog.method_recipes.map(getRecipeCode),
  )) {
    pushIssue(issues, {
      severity: "error",
      code: "duplicate_recipe_code",
      message: `MethodRecipe recipe_code is duplicated: ${recipeCode}`,
      ref: recipeCode,
    });
  }

  for (const materialCode of findDuplicates(
    catalog.material_specs.map((material) => material.material_code),
  )) {
    pushIssue(issues, {
      severity: "error",
      code: "duplicate_material_code",
      message: `MaterialSpec material_code is duplicated: ${materialCode}`,
      ref: materialCode,
    });
  }

  for (const noteCode of findDuplicates(
    catalog.note_templates.map((note) => note.note_code),
  )) {
    pushIssue(issues, {
      severity: "error",
      code: "duplicate_note_code",
      message: `NoteTemplate note_code is duplicated: ${noteCode}`,
      ref: noteCode,
    });
  }

  for (const laborCode of findDuplicates(
    catalog.labor_rules.map((labor) => labor.labor_code),
  )) {
    pushIssue(issues, {
      severity: "error",
      code: "duplicate_labor_code",
      message: `LaborRule labor_code is duplicated: ${laborCode}`,
      ref: laborCode,
    });
  }

  for (const bindingCode of findDuplicates(
    catalog.item_material_bindings.map((binding) => binding.binding_code),
  )) {
    pushIssue(issues, {
      severity: "error",
      code: "duplicate_item_material_binding_code",
      message: `ItemMaterialBinding binding_code is duplicated: ${bindingCode}`,
      ref: bindingCode,
    });
  }

  for (const recipe of catalog.method_recipes) {
    for (const output of recipe.outputs) {
      const itemCode = getRecipeOutputItemCode(output);
      const template = templatesByItemCode.get(itemCode);

      if (!template) {
        pushIssue(issues, {
          severity: "error",
          code: "recipe_output_missing_template",
          message: `MethodRecipe ${getRecipeCode(recipe)} output references missing item_code: ${itemCode}`,
          ref: `${getRecipeCode(recipe)}:${itemCode}`,
        });
        continue;
      }

      if (output.unit !== template.unit) {
        pushIssue(issues, {
          severity: "error",
          code: "recipe_output_unit_mismatch",
          message: `MethodRecipe ${getRecipeCode(recipe)} output unit ${output.unit} does not match template ${itemCode} unit ${template.unit}`,
          ref: `${getRecipeCode(recipe)}:${itemCode}`,
        });
      }

      for (const impliedConversion of inferFormulaUnitConversions(
        getRecipeCode(recipe),
        output,
      )) {
        const pairKey = unitConversionPairKey(impliedConversion);

        if (!availableUnitConversionPairKeys.has(pairKey)) {
          missingFormulaUnitConversionRefs.push(
            `${impliedConversion.ref}:${pairKey}`,
          );
          missingUnitConversionPairKeys.add(pairKey);
          pushIssue(issues, {
            severity: "warning",
            code: "missing_formula_unit_conversion",
            message: `MethodRecipe ${getRecipeCode(recipe)} formula implies unit conversion ${impliedConversion.from_unit} -> ${impliedConversion.to_unit}, but MethodSpecCatalog.unit_conversions does not define it.`,
            ref: `${impliedConversion.ref}:${pairKey}`,
          });
        }
      }
    }
  }

  for (const requiredPair of REQUIRED_UNIT_CONVERSION_PAIRS) {
    const pairKey = unitConversionPairKey(requiredPair);

    if (!availableUnitConversionPairKeys.has(pairKey)) {
      missingRequiredUnitConversionRefs.push(pairKey);
      missingUnitConversionPairKeys.add(pairKey);
      pushIssue(issues, {
        severity: "warning",
        code: "missing_required_unit_conversion",
        message: `Required UnitConversion pair is missing from MethodSpecCatalog.unit_conversions: ${requiredPair.from_unit} -> ${requiredPair.to_unit}`,
        ref: pairKey,
      });
    }
  }

  pushGuardResult(guardResults, {
    guard: "unit_conversion_coverage_guard",
    passed: missingUnitConversionPairKeys.size === 0,
    severity: missingUnitConversionPairKeys.size === 0 ? "info" : "warning",
    message:
      `required_unit_conversion_count=${REQUIRED_UNIT_CONVERSION_PAIRS.length}; ` +
      `available_unit_conversion_count=${availableUnitConversionPairKeys.size}; ` +
      `missing_unit_conversion_count=${missingUnitConversionPairKeys.size}; ` +
      `formula_conversion_warning_count=${missingFormulaUnitConversionRefs.length}. ` +
      (missingUnitConversionPairKeys.size === 0
        ? "All required and formula-implied UnitConversion pairs are covered."
        : `Missing UnitConversion pair(s): ${[...missingUnitConversionPairKeys].join(", ")}`),
    refs: [
      ...missingRequiredUnitConversionRefs.map((ref) => `required:${ref}`),
      ...missingFormulaUnitConversionRefs.map((ref) => `formula:${ref}`),
    ],
  });

  for (const template of catalog.quote_item_templates) {
    const itemCode = getTemplateItemCode(template);
    const pricingRule = pricingRulesByItemCode.get(itemCode);

    if (!pricingRule) {
      pushIssue(issues, {
        severity: "error",
        code: "template_missing_pricing_rule",
        message: `QuoteItemTemplate ${itemCode} has no PricingRule`,
        ref: itemCode,
      });
      continue;
    }

    if (pricingRule.unit !== template.unit) {
      pushIssue(issues, {
        severity: "error",
        code: "pricing_rule_unit_mismatch",
        message: `PricingRule ${pricingRule.price_rule_id} unit ${pricingRule.unit} does not match template ${itemCode} unit ${template.unit}`,
        ref: `${pricingRule.price_rule_id}:${itemCode}`,
      });
    }
  }

  for (const pricingRule of catalog.pricing_rules) {
    const sourceType = pricingRule.price_source.type.trim().toLowerCase();
    const itemCode = pricingRuleItemCode(pricingRule);

    if (BLOCKED_PRICING_SOURCE_TYPES.has(sourceType)) {
      const ref = `${pricingRule.price_rule_id}:${itemCode}:${sourceType}`;
      blockedPricingSourceRefs.push(ref);
      pushIssue(issues, {
        severity: "error",
        code: "blocked_pricing_source_type",
        message: `PricingRule ${pricingRule.price_rule_id} uses blocked price_source.type: ${pricingRule.price_source.type}`,
        ref,
      });
    }

    if (BLOCKED_LABOR_PRICING_SOURCE_TYPES.has(sourceType)) {
      const ref = `${pricingRule.price_rule_id}:${itemCode}:${sourceType}`;
      laborPricingSourceRefs.push(ref);
      pushIssue(issues, {
        severity: "error",
        code: "labor_rule_used_as_price_source",
        message: `PricingRule ${pricingRule.price_rule_id} uses labor-derived price_source.type: ${pricingRule.price_source.type}. LaborRule must remain reference-only and cannot be a formal pricing source.`,
        ref,
      });
    }
  }

  pushGuardResult(guardResults, {
    guard: "pricing_source_type_guard",
    passed: blockedPricingSourceRefs.length === 0,
    severity: blockedPricingSourceRefs.length === 0 ? "info" : "error",
    message:
      blockedPricingSourceRefs.length === 0
        ? "All PricingRule.price_source.type values passed the blocked-source runtime guard."
        : `Blocked PricingRule.price_source.type values found: ${blockedPricingSourceRefs.join(", ")}`,
    refs: blockedPricingSourceRefs,
  });

  const activeLaborRuleRefs = catalog.labor_rules
    .filter((laborRule) => laborRule.is_active)
    .map((laborRule) => laborRule.labor_code);

  pushGuardResult(guardResults, {
    guard: "labor_rule_reference_only_guard",
    passed: laborPricingSourceRefs.length === 0,
    severity: laborPricingSourceRefs.length === 0 ? "info" : "error",
    message:
      laborPricingSourceRefs.length === 0
        ? `LaborRule exists as reference-only data; active LaborRule count: ${activeLaborRuleRefs.length}. No PricingRule uses labor-derived source type.`
        : `LaborRule was used as a formal pricing source by PricingRule record(s): ${laborPricingSourceRefs.join(", ")}`,
    refs:
      laborPricingSourceRefs.length === 0
        ? activeLaborRuleRefs
        : laborPricingSourceRefs,
  });

  for (const note of catalog.note_templates) {
    for (const itemCode of note.applies_to_item_codes) {
      if (!templatesByItemCode.has(itemCode)) {
        pushIssue(issues, {
          severity: "error",
          code: "note_template_missing_item_code",
          message: `NoteTemplate ${note.note_code} references missing item_code: ${itemCode}`,
          ref: `${note.note_code}:${itemCode}`,
        });
      }
    }
  }

  for (const rule of catalog.inclusion_exclusion_rules) {
    if (!templatesByItemCode.has(rule.item_code)) {
      pushIssue(issues, {
        severity: "error",
        code: "inclusion_exclusion_missing_item_code",
        message: `InclusionExclusionRule ${rule.rule_code} references missing item_code: ${rule.item_code}`,
        ref: `${rule.rule_code}:${rule.item_code}`,
      });
    }
  }

  const invalidReviewPolicyRefs: string[] = [];
  const scopeReviewRefs: string[] = [];

  for (const rule of catalog.inclusion_exclusion_rules) {
    if (typeof rule.requires_review !== "boolean") {
      const ref = `${rule.rule_code}:${rule.item_code}`;
      invalidReviewPolicyRefs.push(ref);
      pushIssue(issues, {
        severity: "warning",
        code: "inclusion_exclusion_requires_review_policy_missing",
        message: `InclusionExclusionRule ${rule.rule_code} does not expose a boolean requires_review field for scope_review policy.`,
        ref,
      });
      continue;
    }

    if (rule.requires_review) {
      scopeReviewRefs.push(`${rule.rule_code}:${rule.item_code}`);
    }
  }

  pushGuardResult(guardResults, {
    guard: "inclusion_exclusion_review_policy_guard",
    passed: invalidReviewPolicyRefs.length === 0,
    severity: invalidReviewPolicyRefs.length === 0 ? "info" : "warning",
    message:
      invalidReviewPolicyRefs.length === 0
        ? `InclusionExclusionRule.requires_review is available for scope_review policy; ${scopeReviewRefs.length} rule(s) currently require scope review.`
        : `Some InclusionExclusionRule records cannot be mapped to scope_review: ${invalidReviewPolicyRefs.join(", ")}`,
    refs:
      invalidReviewPolicyRefs.length === 0
        ? scopeReviewRefs
        : invalidReviewPolicyRefs,
  });

  const activeQuoteItemTemplates = catalog.quote_item_templates.filter(
    (template) => (template as { is_active?: boolean }).is_active !== false,
  );
  const scopeRuleItemCodes = new Set(
    catalog.inclusion_exclusion_rules.map((rule) => rule.item_code),
  );
  const missingScopeRuleRefs: string[] = [];
  const allowedMissingScopeRuleRefs: string[] = [];

  for (const template of activeQuoteItemTemplates) {
    const itemCode = getTemplateItemCode(template);

    if (scopeRuleItemCodes.has(itemCode)) {
      continue;
    }

    if (ALLOWED_MISSING_SCOPE_RULE_ITEM_CODES.has(itemCode)) {
      allowedMissingScopeRuleRefs.push(itemCode);
      pushAllowedCondition(allowedConditions, {
        code: "allowed_missing_scope_rule",
        message: `Inclusion / exclusion scope rule may be deferred for allowlisted item ${itemCode}; reviewer should still confirm scope before formal quote.`,
        ref: itemCode,
      });
      continue;
    }

    missingScopeRuleRefs.push(itemCode);
    pushIssue(issues, {
      severity: "warning",
      code: "missing_inclusion_exclusion_rule",
      message: `Active QuoteItemTemplate ${itemCode} has no matching InclusionExclusionRule scope coverage.`,
      ref: itemCode,
    });
  }

  const missingScopeRuleCount =
    missingScopeRuleRefs.length + allowedMissingScopeRuleRefs.length;

  pushGuardResult(guardResults, {
    guard: "inclusion_exclusion_scope_coverage_guard",
    passed: missingScopeRuleRefs.length === 0,
    severity: missingScopeRuleRefs.length === 0 ? "info" : "warning",
    message:
      `active_quote_item_count=${activeQuoteItemTemplates.length}; ` +
      `scope_rule_count=${scopeRuleItemCodes.size}; ` +
      `missing_scope_rule_count=${missingScopeRuleCount}; ` +
      `allowed_missing_scope_rule_count=${allowedMissingScopeRuleRefs.length}; ` +
      `missing_scope_rule_item_codes=${missingScopeRuleRefs.join(", ") || "none"}. ` +
      (missingScopeRuleRefs.length === 0
        ? allowedMissingScopeRuleRefs.length === 0
          ? "All active QuoteItemTemplate records have InclusionExclusionRule scope coverage."
          : `Only allowlisted scope rule gaps found: ${allowedMissingScopeRuleRefs.join(", ")}`
        : `Missing non-allowlisted scope rule item(s): ${missingScopeRuleRefs.join(", ")}`),
    refs: [
      ...missingScopeRuleRefs.map((ref) => `missing:${ref}`),
      ...allowedMissingScopeRuleRefs.map((ref) => `allowed:${ref}`),
    ],
  });

  const defaultPrimaryBindingsByItemCode = new Map<string, string[]>();

  for (const binding of catalog.item_material_bindings) {
    if (!templatesByItemCode.has(binding.item_code)) {
      pushIssue(issues, {
        severity: "error",
        code: "item_material_binding_missing_item_code",
        message: `ItemMaterialBinding ${binding.binding_code} references missing item_code: ${binding.item_code}`,
        ref: `${binding.binding_code}:${binding.item_code}`,
      });
    }

    if (!materialSpecsByCode.has(binding.material_code)) {
      pushIssue(issues, {
        severity: "error",
        code: "item_material_binding_missing_material_code",
        message: `ItemMaterialBinding ${binding.binding_code} references missing material_code: ${binding.material_code}`,
        ref: `${binding.binding_code}:${binding.material_code}`,
      });
    }

    if (binding.role === "primary" && binding.is_default) {
      const existing =
        defaultPrimaryBindingsByItemCode.get(binding.item_code) ?? [];
      defaultPrimaryBindingsByItemCode.set(binding.item_code, [
        ...existing,
        binding.binding_code,
      ]);
    }
  }

  for (const [itemCode, bindingCodes] of defaultPrimaryBindingsByItemCode) {
    if (bindingCodes.length > 1) {
      pushIssue(issues, {
        severity: "error",
        code: "multiple_default_primary_material_bindings",
        message: `Item ${itemCode} has multiple default primary material bindings: ${bindingCodes.join(", ")}`,
        ref: itemCode,
      });
    }
  }

  const materialBoundItemCodes = new Set(
    catalog.item_material_bindings.map((binding) => binding.item_code),
  );
  const unboundNotAllowlistedRefs: string[] = [];
  const unboundAllowlistedRefs: string[] = [];

  for (const template of catalog.quote_item_templates) {
    const itemCode = getTemplateItemCode(template);
    if (!materialBoundItemCodes.has(itemCode)) {
      if (ALLOWED_UNBOUND_MATERIAL_ITEM_CODES.has(itemCode)) {
        unboundAllowlistedRefs.push(itemCode);
        pushAllowedCondition(allowedConditions, {
          code: "template_missing_material_binding_allowlisted",
          message: `Material binding not required or not applicable for allowlisted item ${itemCode}; material_code will resolve to null.`,
          ref: itemCode,
        });
      } else {
        unboundNotAllowlistedRefs.push(itemCode);
        pushIssue(issues, {
          severity: "warning",
          code: "template_missing_material_binding_not_allowlisted",
          message: `QuoteItemTemplate ${itemCode} has no ItemMaterialBinding and is not in the allowed unbound material item allowlist.`,
          ref: itemCode,
        });
      }
    }
  }

  pushGuardResult(guardResults, {
    guard: "unbound_material_allowlist_guard",
    passed: unboundNotAllowlistedRefs.length === 0,
    severity: unboundNotAllowlistedRefs.length === 0 ? "info" : "warning",
    message:
      unboundNotAllowlistedRefs.length === 0
        ? `Allowed unbound material item count: ${unboundAllowlistedRefs.length}. Codes: ${unboundAllowlistedRefs.join(", ") || "none"}.`
        : `Non-allowlisted unbound material item(s) found: ${unboundNotAllowlistedRefs.join(", ")}`,
    refs:
      unboundNotAllowlistedRefs.length === 0
        ? unboundAllowlistedRefs
        : unboundNotAllowlistedRefs,
  });

  const missingNoteCoverageRefs: string[] = [];

  for (const template of catalog.quote_item_templates) {
    const itemCode = getTemplateItemCode(template);
    const hasDefaultNote = template.default_notes.trim().length > 0;
    const hasCustomerVisibleNote = customerVisibleNoteItemCodes.has(itemCode);

    if (!hasDefaultNote && !hasCustomerVisibleNote) {
      missingNoteCoverageRefs.push(itemCode);
      pushIssue(issues, {
        severity: "warning",
        code: "template_missing_customer_note_coverage",
        message: `QuoteItemTemplate ${itemCode} has no default note or active customer-visible NoteTemplate.`,
        ref: itemCode,
      });
    }
  }

  pushGuardResult(guardResults, {
    guard: "quote_item_note_coverage_guard",
    passed: missingNoteCoverageRefs.length === 0,
    severity: missingNoteCoverageRefs.length === 0 ? "info" : "warning",
    message:
      missingNoteCoverageRefs.length === 0
        ? "All QuoteItemTemplate records have default notes or active customer-visible NoteTemplate coverage."
        : `QuoteItemTemplate note coverage gaps found: ${missingNoteCoverageRefs.join(", ")}`,
    refs: missingNoteCoverageRefs,
  });

  const errorCount = issues.filter((issue) => issue.severity === "error").length;
  const warningCount = issues.filter((issue) => issue.severity === "warning").length;

  return {
    valid: errorCount === 0,
    checked_at: new Date().toISOString(),
    summary: {
      quote_item_template_count: catalog.quote_item_templates.length,
      method_recipe_count: catalog.method_recipes.length,
      material_spec_count: catalog.material_specs.length,
      labor_rule_count: catalog.labor_rules.length,
      note_template_count: catalog.note_templates.length,
      unit_conversion_count: catalog.unit_conversions.length,
      inclusion_exclusion_rule_count: catalog.inclusion_exclusion_rules.length,
      item_material_binding_count: catalog.item_material_bindings.length,
      pricing_rule_count: catalog.pricing_rules.length,
      error_count: errorCount,
      warning_count: warningCount,
      allowed_condition_count: allowedConditions.length,
      guard_result_count: guardResults.length,
    },
    issues,
    allowed_conditions: allowedConditions,
    guard_results: guardResults,
  };
};
