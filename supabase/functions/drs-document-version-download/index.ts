import {
  createDocumentEdgeHandler,
  type DocumentEdgeDependencies,
} from "../_shared/drs-document-storage/service.ts";
import { createDrsDocumentEdgeRuntime } from "../_shared/drs-document-storage/drs-document-edge-runtime.ts";

export const VERIFY_JWT_REQUIRED = false;
export const FUNCTION_PATH = "/functions/v1/drs-document-version-download";

export function createDrsDocumentVersionDownloadHandler(
  dependencies: DocumentEdgeDependencies = createDrsDocumentEdgeRuntime(
    "download",
    FUNCTION_PATH,
  ),
) {
  return createDocumentEdgeHandler("download", FUNCTION_PATH, dependencies);
}

if (typeof Deno !== "undefined" && import.meta.main) {
  Deno.serve(createDrsDocumentVersionDownloadHandler());
}
