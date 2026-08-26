import {
  createDocumentEdgeHandler,
  type DocumentEdgeDependencies,
} from "../_shared/drs-document-storage/service.ts";

export const VERIFY_JWT_REQUIRED = false;
export const FUNCTION_PATH = "/functions/v1/drs-document-upload-intent";

export function createDrsDocumentUploadIntentHandler(
  dependencies?: DocumentEdgeDependencies,
) {
  return createDocumentEdgeHandler("uploadIntent", FUNCTION_PATH, dependencies);
}

if (typeof Deno !== "undefined" && import.meta.main) {
  Deno.serve(createDrsDocumentUploadIntentHandler());
}
