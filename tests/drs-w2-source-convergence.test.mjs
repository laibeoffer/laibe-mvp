import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import test from "node:test";

const lanes = [
  {
    name: "Core Data/Audit",
    worktree: "C:\\CodexWork\\08-Jacky\\worktrees\\laibe_MVP_project\\drs-core-data-audit-w1-20260820",
    branch: "codex/drs-core-data-audit-w1-20260820",
    parent: "5fac5f5c98554683b6046b5b39aa8db9173ca25b",
    allowed: [
      /^tests\/drs-core-postgres-runtime\//,
      /^scripts\/drs-core-postgres-runtime\//,
      /^docs\/drs_backend\/core_data_audit_w2_runtime\.md$/,
      /^supabase\/migrations\/20260820090000_drs_core_case_audit_contract\.sql$/,
      /^tests\/drs-core-contract\.test\.mjs$/,
    ],
  },
  {
    name: "A14 LINE/OpenAI adapter",
    worktree: "C:\\CodexWork\\08-Jacky\\worktrees\\laibe_MVP_project\\a14-drs-linebot-group-ai-human-w1-20260820",
    branch: "drs-web/a14-drs-linebot-group-ai-human-w1-20260820",
    parent: "8cc97d03f65b3317e21aeae9b7c252f2079709ab",
    allowed: [
      /^src\/lib\/drs-linebot\/runtime\//,
      /^tests\/line_bot\/drs_runtime_adapter_w2\.test\.ts$/,
      /^docs\/drs_backend\/line_ai_runtime_adapter_w2\.md$/,
      /^src\/lib\/drs-linebot\/w1\.ts$/,
    ],
  },
  {
    name: "Isolated DRS Workspace",
    worktree: "C:\\CodexWork\\08-Jacky\\worktrees\\laibe_MVP_project\\drs-workspaces-w1-20260820",
    branch: "codex/drs-workspaces-w1-20260820",
    parent: "6866e9e61cadf6a22ae485c944a4f6ca753475f1",
    allowed: [
      /^src\/stitch_laibe_landing_onboarding\/drs_standalone\//,
      /^tests\/drs-workspace-data-binding\.test\.mjs$/,
      /^tests\/drs-workspace-shell\.test\.mjs$/,
      /^tests\/drs-workspace-browser-e2e\.test\.mjs$/,
      /^docs\/drs_backend\/workspace_ui_w2\.md$/,
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

for (const lane of lanes) {
  test(`${lane.name} has one clean W2 child candidate inside its allowlist`, () => {
    assert.equal(git(lane.worktree, "branch", "--show-current"), lane.branch);

    const head = git(lane.worktree, "rev-parse", "HEAD");
    assert.notEqual(head, lane.parent, `${lane.name}: W2 child commit is not available yet`);

    assert.doesNotThrow(() => git(lane.worktree, "merge-base", "--is-ancestor", lane.parent, head));
    assert.equal(git(lane.worktree, "status", "--porcelain=v1"), "", `${lane.name}: worktree/index is not clean`);

    const changedPaths = lines(git(lane.worktree, "diff", "--name-only", `${lane.parent}..${head}`));
    assert.ok(changedPaths.length > 0, `${lane.name}: W2 delta is empty`);

    for (const file of changedPaths) {
      assert.ok(lane.allowed.some((pattern) => pattern.test(file)), `${lane.name}: path outside W2 allowlist: ${file}`);
      assert.ok(!protectedPatterns.some((pattern) => pattern.test(file)), `${lane.name}: protected A0 path changed: ${file}`);
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
