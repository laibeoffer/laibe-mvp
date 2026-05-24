import { validateMethodSpecCatalog } from "./validate-method-spec-catalog.ts";
import type { MethodSpecRepository } from "./method-spec-repository.ts";
import type {
  InclusionExclusionRule,
  MethodSpecCatalog,
  MethodSpecValidationReport,
  NoteTemplate,
} from "./types.ts";

export class InMemoryMethodSpecRepository implements MethodSpecRepository {
  private catalog: MethodSpecCatalog | null = null;

  constructor(initialCatalog?: MethodSpecCatalog) {
    if (initialCatalog) {
      this.catalog = initialCatalog;
    }
  }

  getMethodSpecCatalog(): MethodSpecCatalog {
    if (!this.catalog) {
      throw new Error("MethodSpecCatalog has not been loaded.");
    }

    return this.catalog;
  }

  saveMethodSpecCatalog(catalog: MethodSpecCatalog): void {
    this.catalog = catalog;
  }

  validateMethodSpecCatalog(): MethodSpecValidationReport {
    return validateMethodSpecCatalog(this.getMethodSpecCatalog());
  }

  getNoteTemplatesByItemCode(itemCode: string): NoteTemplate[] {
    return this.getMethodSpecCatalog().note_templates.filter((note) =>
      note.applies_to_item_codes.includes(itemCode),
    );
  }

  getInclusionExclusionByItemCode(itemCode: string): InclusionExclusionRule[] {
    return this.getMethodSpecCatalog().inclusion_exclusion_rules.filter(
      (rule) => rule.item_code === itemCode,
    );
  }
}
