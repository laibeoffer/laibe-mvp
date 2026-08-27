import {
  createDocumentEdgeHandler,
  type DocumentEdgeDependencies,
} from "../_shared/drs-document-storage/service.ts";
import {
  createDrsDocumentEdgeRuntime,
  type DrsDocumentEdgeRuntimeOptions,
} from "../_shared/drs-document-storage/drs-document-edge-runtime.ts";

export const VERIFY_JWT_REQUIRED = false;
export const FUNCTION_PATH = "/functions/v1/drs-document-snapshot";

export function createDrsDocumentSnapshotHandler(
  dependencies?: DocumentEdgeDependencies,
  runtimeOptions: DrsDocumentEdgeRuntimeOptions = {},
) {
  const resolvedDependencies = dependencies ?? createDrsDocumentEdgeRuntime(
    "snapshot",
    FUNCTION_PATH,
    runtimeOptions,
  );
  return createDocumentEdgeHandler(
    "snapshot",
    FUNCTION_PATH,
    resolvedDependencies,
  );
}

if (typeof Deno !== "undefined" && import.meta.main) {
  Deno.serve(createDrsDocumentSnapshotHandler());
}
