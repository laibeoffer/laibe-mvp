import type {
  InclusionExclusionRule,
  MethodSpecCatalog,
  MethodSpecValidationReport,
  NoteTemplate,
} from "./types.ts";

export interface MethodSpecRepository {
  getMethodSpecCatalog(): MethodSpecCatalog;
  saveMethodSpecCatalog(catalog: MethodSpecCatalog): void;
  validateMethodSpecCatalog(): MethodSpecValidationReport;
  getNoteTemplatesByItemCode(itemCode: string): NoteTemplate[];
  getInclusionExclusionByItemCode(itemCode: string): InclusionExclusionRule[];
}
