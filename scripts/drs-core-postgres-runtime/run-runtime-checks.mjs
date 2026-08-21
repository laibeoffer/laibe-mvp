import process from "node:process";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { detectLocalRuntimeTooling, runLocalPostgresRuntimeVerification, selectLocalRuntimeStrategy } from "./runtime-harness.mjs";

function printHuman(result) {
  if (result.status === "passed") {
    console.log(`STATUS=passed`);
    console.log(`STRATEGY=${result.strategy_id}`);
    console.log(`RUNTIME=${result.runtime_identity.kind}`);
    console.log(`VERSION=${result.runtime_identity.version}`);
    return;
  }
  console.log(`STATUS=blocked`);
  console.log(`REASON_CODE=${result.reason_code}`);
  console.log(`MISSING_COMMANDS=${(result.missing_commands || []).join(",")}`);
  console.log(`REASON=${result.reason}`);
  console.log(`NEXT_SAFE_ACTION=${result.next_safe_action}`);
}

export function determineExitCode(result) {
  return result?.status === "blocked" ? 2 : 0;
}

export function buildCliResult({ argv = process.argv.slice(2), tooling = detectLocalRuntimeTooling() } = {}) {
  const jsonMode = argv.includes("--json");
  const toolingOnly = argv.includes("--tooling-only");
  const result = toolingOnly
    ? { status: "tooling-only", tooling, strategy: selectLocalRuntimeStrategy(tooling) }
    : runLocalPostgresRuntimeVerification({ tooling });
  return { jsonMode, result };
}

export function main({ argv = process.argv.slice(2), tooling = detectLocalRuntimeTooling() } = {}) {
  const { jsonMode, result } = buildCliResult({ argv, tooling });
  if (jsonMode) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    printHuman(result);
  }
  const exitCode = determineExitCode(result);
  if (exitCode !== 0) {
    process.exitCode = exitCode;
  }
  return exitCode;
}

const isEntryPoint = process.argv[1]
  && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isEntryPoint) {
  main();
}
