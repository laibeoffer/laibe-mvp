import {
  createDocumentEdgeHandler,
  type DocumentEdgeDependencies,
} from "../_shared/drs-document-storage/service.ts";
import {
  createDrsDocumentEdgeRuntime,
  type DrsDocumentEdgeRuntimeOptions,
} from "../_shared/drs-document-storage/drs-document-edge-runtime.ts";

export const VERIFY_JWT_REQUIRED = false;
export const FUNCTION_PATH = "/functions/v1/drs-document-upload-finalize";

export function createDrsDocumentUploadFinalizeHandler(
  dependencies?: DocumentEdgeDependencies,
  runtimeOptions: DrsDocumentEdgeRuntimeOptions = {},
) {
  const resolvedDependencies = dependencies ?? createDrsDocumentEdgeRuntime(
    "finalize",
    FUNCTION_PATH,
    runtimeOptions,
  );
  return createDocumentEdgeHandler(
    "finalize",
    FUNCTION_PATH,
    resolvedDependencies,
  );
}

if (typeof Deno !== "undefined" && import.meta.main) {
  Deno.serve(createDrsDocumentUploadFinalizeHandler());
}
