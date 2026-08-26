import {
  createDocumentEdgeHandler,
  type DocumentEdgeDependencies,
} from "../_shared/drs-document-storage/service.ts";

export const VERIFY_JWT_REQUIRED = false;
export const FUNCTION_PATH = "/functions/v1/drs-document-snapshot";

export function createDrsDocumentSnapshotHandler(
  dependencies?: DocumentEdgeDependencies,
) {
  return createDocumentEdgeHandler("snapshot", FUNCTION_PATH, dependencies);
}

if (typeof Deno !== "undefined" && import.meta.main) {
  Deno.serve(createDrsDocumentSnapshotHandler());
}
