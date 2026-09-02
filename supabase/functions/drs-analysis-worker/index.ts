import {
  type AnalysisOutput,
  type AnalysisRunContext,
  sha256Text,
  validateAnalysisOutput,
  validateAnalysisRunContext,
} from "../_shared/drs-analysis/contracts.ts";

export const VERIFY_JWT_REQUIRED = false;

const safeArrayIsArray = Array.isArray;
const safeGetOwnPropertyDescriptor = Object.getOwnPropertyDescriptor;
const safeNumberIsFinite = Number.isFinite;
const safeObjectCreate = Object.create;
const safeObjectFreeze = Object.freeze;
const safeObjectKeys = Object.keys;
const safeObjectSetPrototypeOf = Object.setPrototypeOf;
const safeString = String;
const JSON_HEX = "0123456789abcdef";

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

type DurableEncoding = Readonly<{
  text: string;
  value: unknown;
}>;

function jsonUnicodeEscape(code: number): string {
  return "\\u" + JSON_HEX[(code >>> 12) & 15] +
    JSON_HEX[(code >>> 8) & 15] + JSON_HEX[(code >>> 4) & 15] +
    JSON_HEX[code & 15];
}

function jsonQuotedString(value: string): string {
  let result = '"';
  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index);
    if (code === 0x22) result += '\\"';
    else if (code === 0x5c) result += "\\\\";
    else if (code === 0x08) result += "\\b";
    else if (code === 0x09) result += "\\t";
    else if (code === 0x0a) result += "\\n";
    else if (code === 0x0c) result += "\\f";
    else if (code === 0x0d) result += "\\r";
    else if (code < 0x20) result += jsonUnicodeEscape(code);
    else if (code >= 0xd800 && code <= 0xdbff) {
      const next = index + 1 < value.length ? value.charCodeAt(index + 1) : -1;
      if (next >= 0xdc00 && next <= 0xdfff) {
        result += value[index] + value[index + 1];
        index += 1;
      } else result += jsonUnicodeEscape(code);
    } else if (code >= 0xdc00 && code <= 0xdfff) {
      result += jsonUnicodeEscape(code);
    } else result += value[index];
  }
  return result + '"';
}

function durablePrimitiveJson(value: unknown): DurableEncoding {
  if (value === null) return { text: "null", value: null };
  if (typeof value === "string") {
    return { text: jsonQuotedString(value), value };
  }
  if (typeof value === "boolean") {
    return { text: value ? "true" : "false", value };
  }
  if (typeof value === "number") {
    if (!safeNumberIsFinite(value)) {
      throw new Error("INVALID_DURABLE_ANALYSIS_OUTPUT");
    }
    const normalized = value === 0 ? 0 : value;
    return { text: safeString(normalized), value: normalized };
  }
  if (safeArrayIsArray(value)) {
    const durable: unknown[] = [];
    durable.length = value.length;
    safeObjectSetPrototypeOf(durable, null);
    let text = "[";
    for (let index = 0; index < value.length; index += 1) {
      const descriptor = safeGetOwnPropertyDescriptor(value, `${index}`);
      if (!descriptor || !safeGetOwnPropertyDescriptor(descriptor, "value")) {
        throw new Error("INVALID_DURABLE_ANALYSIS_OUTPUT");
      }
      const encoded = durablePrimitiveJson(descriptor.value);
      if (index > 0) text += ",";
      text += encoded.text;
      durable[index] = encoded.value;
    }
    return { text: text + "]", value: safeObjectFreeze(durable) };
  }
  if (typeof value === "object") {
    const keys = safeObjectKeys(value);
    const durable = safeObjectCreate(null) as Record<string, unknown>;
    let text = "{";
    for (let index = 0; index < keys.length; index += 1) {
      const key = keys[index];
      const descriptor = safeGetOwnPropertyDescriptor(value, key);
      if (!descriptor || !safeGetOwnPropertyDescriptor(descriptor, "value")) {
        throw new Error("INVALID_DURABLE_ANALYSIS_OUTPUT");
      }
      const encoded = durablePrimitiveJson(descriptor.value);
      if (index > 0) text += ",";
      text += jsonQuotedString(key) + ":" + encoded.text;
      durable[key] = encoded.value;
    }
    return { text: text + "}", value: safeObjectFreeze(durable) };
  }
  throw new Error("INVALID_DURABLE_ANALYSIS_OUTPUT");
}

function durableAnalysisOutput(output: AnalysisOutput): Readonly<{
  text: string;
  value: AnalysisOutput;
}> {
  const encoded = durablePrimitiveJson(output);
  return {
    text: encoded.text,
    value: encoded.value as AnalysisOutput,
  };
}

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
    const input = validateAnalysisRunContext(job.input);
    if (!input) throw new Error("INVALID_ANALYSIS_INPUT");
    // The provider receives document text only as untrusted data. No command,
    // decision, event, or tool capability is supplied to this adapter.
    const candidate = await dependencies.provider.analyze(
      Object.freeze({ ...job, input }),
    );
    const validated = validateAnalysisOutput(input, candidate);
    if (!validated) throw new Error("INVALID_ANALYSIS_OUTPUT");
    const durable = durableAnalysisOutput(validated);
    const outputSha256 = await sha256Text(durable.text);
    const completed = completionResult(
      await dependencies.queue.complete(
        job.jobId,
        dependencies.workerId,
        outputSha256,
        durable.value,
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
