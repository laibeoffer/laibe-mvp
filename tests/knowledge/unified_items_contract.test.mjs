import test from "node:test";
import assert from "node:assert/strict";
import {
  readdirSync,
  readFileSync,
} from "node:fs";
import {
  dirname,
  resolve,
} from "node:path";
import {
  fileURLToPath,
} from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(HERE, "..", "..");
const MIGRATIONS_DIR = resolve(REPO_ROOT, "supabase", "migrations");
const migrationCorpus = readdirSync(MIGRATIONS_DIR)
  .filter((name) => name.endsWith(".sql"))
  .sort()
  .map((name) => readFileSync(resolve(MIGRATIONS_DIR, name), "utf8"))
  .join("\n");

function extractTable(sql, qualifiedName) {
  const escaped = qualifiedName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return sql.match(
    new RegExp(
      `create\\s+table\\s+${escaped}\\s*\\([\\s\\S]*?\\n\\);`,
      "i",
    ),
  )?.[0] ?? "";
}

function extractFunction(sql, qualifiedName) {
  const escaped = qualifiedName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return sql.match(
    new RegExp(
      `create\\s+or\\s+replace\\s+function\\s+${escaped}` +
        `[\\s\\S]*?\\n\\$\\$;`,
      "i",
    ),
  )?.[0] ?? "";
}

function expectPattern(text, pattern, message) {
  assert.ok(pattern.test(text), message);
}

function expectForeignKey(tableName) {
  const escapedTable = tableName.replaceAll(".", "\\.");
  expectPattern(
    migrationCorpus,
    new RegExp(
      `alter\\s+table\\s+${escapedTable}` +
        `[\\s\\S]*?foreign\\s+key\\s*\\(\\s*unified_item_code\\s*\\)` +
        `[\\s\\S]*?references\\s+knowledge\\.unified_items\\s*\\(\\s*item_code\\s*\\)`,
      "i",
    ),
    `${tableName}.unified_item_code foreign key is missing`,
  );
}

function expectLeadingIndex(tableName) {
  const escapedTable = tableName.replaceAll(".", "\\.");
  expectPattern(
    migrationCorpus,
    new RegExp(
      `create\\s+(?:unique\\s+)?index[\\s\\S]*?` +
        `on\\s+${escapedTable}\\s*\\(\\s*unified_item_code(?:\\s*,|\\s*\\))`,
      "i",
    ),
    `${tableName}.unified_item_code leading index is missing`,
  );
}

test("unified_items has the minimum governed fields and immutable pricing guard", () => {
  const table = extractTable(migrationCorpus, "knowledge.unified_items");
  assert.ok(table, "knowledge.unified_items table is missing");

  for (
    const field of [
      "item_code",
      "unified_item_name",
      "trade_code",
      "default_unit",
      "effective_entry_version_id",
      "lifecycle_state",
      "direct_pricing_allowed",
    ]
  ) {
    assert.ok(
      new RegExp(`\\b${field}\\b`, "i").test(table),
      `knowledge.unified_items is missing ${field}`,
    );
  }
  expectPattern(
    table,
    /item_code\s+text\s+not\s+null\s+unique/i,
    "unified item_code must be unique",
  );
  expectPattern(
    table,
    /effective_entry_version_id\s+uuid[\s\S]*?references\s+knowledge\.entry_versions\s*\(\s*id\s*\)/i,
    "effective_entry_version_id must reference entry_versions",
  );
  expectPattern(
    table,
    /direct_pricing_allowed\s+boolean\s+not\s+null\s+default\s+false[\s\S]*?check\s*\(\s*direct_pricing_allowed\s*=\s*false\s*\)/i,
    "unified_items direct pricing guard is missing",
  );
});

test("approved unified item requires the current approved budget entry version", () => {
  const triggerFunction = extractFunction(
    migrationCorpus,
    "knowledge.prepare_unified_item",
  );
  assert.ok(triggerFunction, "knowledge.prepare_unified_item is missing");
  for (
    const fragment of [
      "new.lifecycle_state = 'approved'",
      "version.lifecycle_state = 'approved'",
      "entry.lifecycle_state = 'approved'",
      "entry.current_version_id = version.id",
      "entry.domain = 'budget'",
    ]
  ) {
    assert.ok(
      triggerFunction.toLowerCase().includes(fragment.toLowerCase()),
      `approved unified-item gate is missing: ${fragment}`,
    );
  }
  expectPattern(
    migrationCorpus,
    /before\s+insert\s+or\s+update\s+on\s+knowledge\.unified_items[\s\S]*?execute\s+function\s+knowledge\.prepare_unified_item\s*\(\s*\)/i,
    "unified_items prepare trigger is missing",
  );
});

test("unified_items RLS requires active reviewer or approved budget-domain access", () => {
  expectPattern(
    migrationCorpus,
    /alter\s+table\s+knowledge\.unified_items\s+enable\s+row\s+level\s+security/i,
    "unified_items RLS enablement is missing",
  );
  expectPattern(
    migrationCorpus,
    /create\s+policy\s+unified_items_approved_or_reviewer_select[\s\S]*?knowledge\.is_interactive_reviewer\s*\(\s*\)[\s\S]*?lifecycle_state\s*=\s*'approved'[\s\S]*?knowledge\.can_access_domain\s*\(\s*'budget'\s*\)/i,
    "unified_items select policy is incomplete",
  );
  expectPattern(
    migrationCorpus,
    /create\s+or\s+replace\s+function\s+knowledge\.is_interactive_reviewer[\s\S]*?knowledge\.has_active_session\s*\(\s*\)/i,
    "interactive reviewer does not require an active session",
  );
  expectPattern(
    migrationCorpus,
    /revoke\s+all[\s\S]*?on\s+knowledge\.unified_items[\s\S]*?from\s+public\s*,\s*anon\s*,\s*authenticated/i,
    "unified_items grants are not reset",
  );
  expectPattern(
    migrationCorpus,
    /grant\s+select\s*,\s*insert\s*,\s*update[\s\S]*?on\s+knowledge\.unified_items[\s\S]*?to\s+authenticated/i,
    "unified_items authenticated grant is incomplete",
  );
  assert.equal(
    /grant\s+delete[\s\S]*?on\s+knowledge\.unified_items/i.test(
      migrationCorpus,
    ),
    false,
    "unified_items must not grant DELETE",
  );
});

test("all unified_item_code consumers have FKs and leading indexes", () => {
  for (
    const tableName of [
      "knowledge.budget_rules",
      "knowledge.price_observations",
      "casework.candidate_budget_lines",
    ]
  ) {
    expectForeignKey(tableName);
    expectLeadingIndex(tableName);
  }
});
