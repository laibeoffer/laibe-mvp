import { generateBudgetEstimate } from "../budget-generator.ts";
import { mockProject } from "../mock/mock-layout.ts";
import { buildBudgetCatalogFromMethodSpec } from "./build-budget-catalog-from-method-spec.ts";
import { InMemoryMethodSpecRepository } from "./in-memory-method-spec-repository.ts";
import { seedMethodSpecCatalog } from "./seed-method-spec-catalog.ts";
import { validateMethodSpecCatalog } from "./validate-method-spec-catalog.ts";

const validationReport = validateMethodSpecCatalog(seedMethodSpecCatalog);

const repository = new InMemoryMethodSpecRepository();
repository.saveMethodSpecCatalog(seedMethodSpecCatalog);

const methodSpecCatalog = repository.getMethodSpecCatalog();
const budgetCatalog = buildBudgetCatalogFromMethodSpec(methodSpecCatalog);
const budgetEstimate = generateBudgetEstimate(mockProject, budgetCatalog);

const summary = {
  method_spec_valid: validationReport.valid,
  validation_report: validationReport,
  quote_item_template_count: methodSpecCatalog.quote_item_templates.length,
  method_recipe_count: methodSpecCatalog.method_recipes.length,
  material_spec_count: methodSpecCatalog.material_specs.length,
  labor_rule_count: methodSpecCatalog.labor_rules.length,
  note_template_count: methodSpecCatalog.note_templates.length,
  unit_conversion_count: methodSpecCatalog.unit_conversions.length,
  inclusion_exclusion_rule_count:
    methodSpecCatalog.inclusion_exclusion_rules.length,
  budget_total_amount: budgetEstimate.total_amount,
  budget_line_count: budgetEstimate.lines.length,
  review_required_lines_count: budgetEstimate.review_required_lines.length,
};

console.log(JSON.stringify(summary, null, 2));
