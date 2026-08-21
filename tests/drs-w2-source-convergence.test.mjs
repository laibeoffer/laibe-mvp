import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

const lanes = [
  {
    name: "Core Data/Audit",
    worktree: "C:\\CodexWork\\08-Jacky\\worktrees\\laibe_MVP_project\\drs-core-data-audit-w1-20260820",
    branch: "codex/drs-core-data-audit-w1-20260820",
    parent: "5fac5f5c98554683b6046b5b39aa8db9173ca25b",
    frozenCommit: "5149037dda85b82c2fedca01d9bb08f9bc649438",
    frozenTree: "d00b4e415c55c3297242cbdc370c9cfed84a95e1",
    allowed: [
      /^tests\/drs-core-postgres-runtime\//,
      /^scripts\/drs-core-postgres-runtime\//,
      /^docs\/drs_backend\/core_data_audit_w2_runtime\.md$/,
      /^supabase\/migrations\/20260820090000_drs_core_case_audit_contract\.sql$/,
      /^tests\/drs-core-contract\.test\.mjs$/,
    ],
    admittedPaths: [
      "docs/drs_backend/core_data_audit_w1.md",
      "docs/drs_backend/core_data_audit_w2_runtime.md",
      "scripts/drs-core-postgres-runtime/bootstrap-local-auth.sql",
      "scripts/drs-core-postgres-runtime/run-runtime-checks.mjs",
      "scripts/drs-core-postgres-runtime/runtime-harness.mjs",
      "scripts/drs-core-postgres-runtime/verify-drs-core-runtime.sql",
      "src/lib/drs-core/index.mjs",
      "supabase/migrations/20260820090000_drs_core_case_audit_contract.sql",
      "tests/drs-core-contract.test.mjs",
      "tests/drs-core-postgres-runtime/preflight.test.mjs",
      "tests/drs-core-postgres-runtime/static-contract.test.mjs",
    ],
  },
  {
    name: "A14 LINE/OpenAI adapter",
    worktree: "C:\\CodexWork\\08-Jacky\\worktrees\\laibe_MVP_project\\a14-drs-linebot-group-ai-human-w1-20260820",
    branch: "drs-web/a14-drs-linebot-group-ai-human-w1-20260820",
    parent: "8cc97d03f65b3317e21aeae9b7c252f2079709ab",
    frozenCommit: "db955712199652c1fbac38273ba31e4b6fba64df",
    frozenTree: "14992b5eb9946d229204f309f69fd3339acd4752",
    allowed: [
      /^src\/lib\/drs-linebot\/runtime\//,
      /^tests\/line_bot\/drs_runtime_adapter_w2\.test\.ts$/,
      /^docs\/drs_backend\/line_ai_runtime_adapter_w2\.md$/,
      /^src\/lib\/drs-linebot\/w1\.ts$/,
    ],
    admittedPaths: [
      "deno.json",
      "docs/drs_backend/line_ai_runtime_adapter_w2.md",
      "src/lib/drs-linebot/runtime/mod.ts",
      "src/lib/drs-linebot/w1.ts",
      "supabase/migrations/20260820000000_drs_linebot_group_ai_human_w1.sql",
      "tests/line_bot/drs_group_ai_human_w1.test.ts",
      "tests/line_bot/drs_runtime_adapter_w2.test.ts",
    ],
  },
  {
    name: "Isolated DRS Workspace",
    worktree: "C:\\CodexWork\\08-Jacky\\worktrees\\laibe_MVP_project\\drs-workspaces-w1-20260820",
    branch: "codex/drs-workspaces-w1-20260820",
    parent: "6866e9e61cadf6a22ae485c944a4f6ca753475f1",
    frozenCommit: "697bc83f6734abc6842546faa6feed9abef81f65",
    frozenTree: "2768fe8e2403418fb92a27198a3bee6059e5b0de",
    allowed: [
      /^src\/stitch_laibe_landing_onboarding\/drs_standalone\//,
      /^tests\/drs-workspace-data-binding\.test\.mjs$/,
      /^tests\/drs-workspace-shell\.test\.mjs$/,
      /^tests\/drs-workspace-browser-e2e\.test\.mjs$/,
      /^docs\/drs_backend\/workspace_ui_w2\.md$/,
    ],
    admittedPaths: [
      "docs/drs_backend/workspace_ui_w1.md",
      "docs/drs_backend/workspace_ui_w2.md",
      "src/stitch_laibe_landing_onboarding/drs_standalone/owner_workspace/app.js",
      "src/stitch_laibe_landing_onboarding/drs_standalone/owner_workspace/code.html",
      "src/stitch_laibe_landing_onboarding/drs_standalone/owner_workspace/styles.css",
      "src/stitch_laibe_landing_onboarding/drs_standalone/shared/drs-data-client.js",
      "src/stitch_laibe_landing_onboarding/drs_standalone/shared/drs-workspace-renderer.js",
      "src/stitch_laibe_landing_onboarding/drs_standalone/specialist_workspace/app.js",
      "src/stitch_laibe_landing_onboarding/drs_standalone/specialist_workspace/code.html",
      "src/stitch_laibe_landing_onboarding/drs_standalone/specialist_workspace/styles.css",
      "src/stitch_laibe_landing_onboarding/drs_standalone/vendor_workspace/app.js",
      "src/stitch_laibe_landing_onboarding/drs_standalone/vendor_workspace/code.html",
      "src/stitch_laibe_landing_onboarding/drs_standalone/vendor_workspace/styles.css",
      "tests/drs-workspace-data-binding.test.mjs",
      "tests/drs-workspace-shell.test.mjs",
    ],
  },
];

const protectedPatterns = [
  /^src\/stitch_laibe_landing_onboarding\/pcm_standalone\//,
  /(?:^|\/)PAGE_REGISTRY\.md$/,
  /(?:^|\/)CTA_FLOW_MAP\.md$/,
  /(?:^|\/)(?:route-manifest|routes?|header|navigation)(?:\.|\/)/i,
];

function git(worktree, ...args) {
  return execFileSync("git", ["-C", worktree, ...args], {
    encoding: "utf8",
    windowsHide: true,
  }).trim();
}

function lines(value) {
  return value ? value.split(/\r?\n/).filter(Boolean) : [];
}

function gitBuffer(worktree, ...args) {
  return execFileSync("git", ["-C", worktree, ...args], {
    windowsHide: true,
  });
}

for (const lane of lanes) {
  test(`${lane.name} is frozen at the exact approved W2 source`, () => {
    assert.equal(git(lane.worktree, "branch", "--show-current"), lane.branch);

    const head = git(lane.worktree, "rev-parse", "HEAD");
    assert.equal(head, lane.frozenCommit, `${lane.name}: HEAD drifted after Commander freeze`);
    assert.equal(git(lane.worktree, "rev-parse", `${head}^{tree}`), lane.frozenTree);

    assert.doesNotThrow(() => git(lane.worktree, "merge-base", "--is-ancestor", lane.parent, head));
    assert.equal(git(lane.worktree, "status", "--porcelain=v1"), "", `${lane.name}: worktree/index is not clean`);

    const changedPaths = lines(git(lane.worktree, "diff", "--name-only", `${lane.parent}..${head}`));
    assert.ok(changedPaths.length > 0, `${lane.name}: W2 delta is empty`);

    for (const file of changedPaths) {
      assert.ok(lane.allowed.some((pattern) => pattern.test(file)), `${lane.name}: path outside W2 allowlist: ${file}`);
      assert.ok(!protectedPatterns.some((pattern) => pattern.test(file)), `${lane.name}: protected A0 path changed: ${file}`);
    }
  });

  test(`${lane.name} admitted files match the frozen lane commit`, () => {
    for (const file of lane.admittedPaths) {
      const admitted = readFileSync(path.join(process.cwd(), file));
      const frozen = gitBuffer(lane.worktree, "show", `${lane.frozenCommit}:${file}`);
      assert.deepEqual(admitted, frozen, `${lane.name}: admitted file drifted from frozen source: ${file}`);
    }
  });
}

test("migration filenames remain unique across admitted W1 contracts", () => {
  const migrations = [
    "20260820000000_drs_linebot_group_ai_human_w1.sql",
    "20260820090000_drs_core_case_audit_contract.sql",
  ];
  assert.equal(new Set(migrations).size, migrations.length);
});
