import {
  type AnalysisOutput,
  type AnalysisRunContext,
  sha256Text,
  validateAnalysisOutput,
} from "../_shared/drs-analysis/contracts.ts";

export const VERIFY_JWT_REQUIRED = false;

export type AnalysisClaimedJob = Readonly<{
  jobId: string;
  workerId: string;
  input: AnalysisRunContext;
  untrustedDocumentText?: string;
}>;

export interface AnalysisWorkerQueue {
  claim(workerId: string): Promise<AnalysisClaimedJob | null>;
  complete(
    jobId: string,
    workerId: string,
    outputSha256: string,
    output: AnalysisOutput,
  ): Promise<unknown>;
  fail(jobId: string, workerId: string, errorCode: string): Promise<unknown>;
}

export interface ProviderNeutralAnalysisAdapter {
  analyze(job: AnalysisClaimedJob): Promise<unknown>;
}

export type AnalysisWorkerDependencies = Readonly<{
  workerId: string;
  queue: AnalysisWorkerQueue;
  provider: ProviderNeutralAnalysisAdapter;
  logger?: Readonly<{
    info(code: string, fields: Readonly<Record<string, unknown>>): void;
  }>;
  formalEffects?: Readonly<{
    command(): unknown;
    decision(): unknown;
    event(): unknown;
  }>;
}>;

type WorkerResult = Readonly<{
  state: "IDLE" | "APPLIED" | "REPLAYED" | "FAILED";
  newEffects: 0 | 1;
}>;

function completionResult(value: unknown): WorkerResult | null {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  const record = value as Record<string, unknown>;
  if (
    !["APPLIED", "REPLAYED"].includes(String(record.state)) ||
    (record.newEffects !== 0 && record.newEffects !== 1)
  ) return null;
  return Object.freeze({
    state: record.state as "APPLIED" | "REPLAYED",
    newEffects: record.newEffects,
  });
}

function safeLog(
  dependencies: AnalysisWorkerDependencies,
  code: string,
  jobId?: string,
): void {
  dependencies.logger?.info(
    code,
    Object.freeze(jobId ? { jobId } : {}),
  );
}

export async function runAnalysisWorkerOnce(
  dependencies: AnalysisWorkerDependencies,
): Promise<WorkerResult> {
  const job = await dependencies.queue.claim(dependencies.workerId);
  if (!job) return Object.freeze({ state: "IDLE", newEffects: 0 });
  if (job.workerId !== dependencies.workerId) {
    await dependencies.queue.fail(
      job.jobId,
      dependencies.workerId,
      "CLAIM_MISMATCH",
    );
    return Object.freeze({ state: "FAILED", newEffects: 0 });
  }
  try {
    // The provider receives document text only as untrusted data. No command,
    // decision, event, or tool capability is supplied to this adapter.
    const candidate = await dependencies.provider.analyze(job);
    const validated = validateAnalysisOutput(job.input, candidate);
    if (!validated) throw new Error("INVALID_ANALYSIS_OUTPUT");
    const outputSha256 = await sha256Text(JSON.stringify(validated));
    const completed = completionResult(
      await dependencies.queue.complete(
        job.jobId,
        dependencies.workerId,
        outputSha256,
        validated,
      ),
    );
    if (!completed) throw new Error("COMPLETE_UNAVAILABLE");
    safeLog(dependencies, "DRS_ANALYSIS_WORKER_COMPLETED", job.jobId);
    return completed;
  } catch (error) {
    const code = error instanceof Error
      ? error.message
      : "ANALYSIS_WORKER_FAILED";
    await dependencies.queue.fail(job.jobId, dependencies.workerId, code);
    safeLog(dependencies, "DRS_ANALYSIS_WORKER_FAILED", job.jobId);
    return Object.freeze({ state: "FAILED", newEffects: 0 });
  }
}

export function createAnalysisWorkerHandler(
  dependencies?: AnalysisWorkerDependencies,
): (request: Request) => Promise<Response> {
  return async (request) => {
    if (request.method !== "POST" || !dependencies) {
      return Response.json({ state: "CONTEXT_UNAVAILABLE" }, { status: 503 });
    }
    const result = await runAnalysisWorkerOnce(dependencies);
    return Response.json(result, {
      status: result.state === "FAILED" ? 502 : 200,
    });
  };
}

export const handler = createAnalysisWorkerHandler();
if (import.meta.main) Deno.serve(handler);
