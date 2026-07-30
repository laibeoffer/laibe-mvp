import test from "node:test";
import assert from "node:assert/strict";
import {
  createHash,
} from "node:crypto";
import {
  readFileSync,
  statSync,
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
const MAPPING_PATH = process.env.A1_WOODWORK_MAPPING_PATH
  ? resolve(process.env.A1_WOODWORK_MAPPING_PATH)
  : resolve(
      REPO_ROOT,
      "outputs",
      "budget_woodwork_items_20260710",
      "A1_woodwork_ingest_mapping_20260711.json",
    );

const EXPECTED_BYTES = 102_049_538;
const EXPECTED_SHA256 =
  "d4f3d30750894b4c788823e5155255dfe288f923c87b7fc4172332c94cae0f7a";
const EXPECTED_TOTAL = 42_248;
const EXPECTED_BUCKETS = {
  eligible_candidate_reference: 11_618,
  requires_image_or_quote_confirmation: 27_090,
  not_grade_applicable: 1_593,
  needs_manual_review: 1_947,
};
const DEMOLITION_SIGNAL =
  /拆除|打除|拆卸|拆解|拆換|拆裝/;

const mappingBuffer = readFileSync(MAPPING_PATH);
const mapping = JSON.parse(mappingBuffer.toString("utf8"));

function countBy(records, keySelector) {
  return records.reduce((counts, record) => {
    const key = keySelector(record);
    counts[key] = (counts[key] ?? 0) + 1;
    return counts;
  }, {});
}

test("authoritative woodwork mapping parses the complete locked 102 MB corpus", () => {
  assert.equal(statSync(MAPPING_PATH).size, EXPECTED_BYTES);
  assert.equal(mappingBuffer.byteLength, EXPECTED_BYTES);
  assert.equal(
    createHash("sha256").update(mappingBuffer).digest("hex"),
    EXPECTED_SHA256,
  );
  assert.equal(mapping.input_counts.total_extracted_rows, EXPECTED_TOTAL);
  assert.equal(mapping.input_counts.rows_count, EXPECTED_TOTAL);
  assert.equal(mapping.quality_gates.input_rows_actual, EXPECTED_TOTAL);
  assert.equal(mapping.quality_gates.output_records_count, EXPECTED_TOTAL);
  assert.equal(mapping.records.length, EXPECTED_TOTAL);
});

test("record-derived woodwork bucket counts match all four authoritative buckets", () => {
  const derived = countBy(mapping.records, (record) => record.bucket);

  assert.deepEqual(mapping.bucket_counts, EXPECTED_BUCKETS);
  assert.deepEqual(derived, EXPECTED_BUCKETS);
  assert.equal(
    Object.values(derived).reduce((total, count) => total + count, 0),
    EXPECTED_TOTAL,
  );
});

test("all 42,248 woodwork records remain non-pricing evidence", () => {
  const invalidDirectPricing = mapping.records.filter(
    (record) => record.next_use?.direct_pricing_allowed !== false,
  );
  const invalidTriggerPolicy = mapping.records.filter(
    (record) =>
      record.pricing_trigger_policy !== "not_a_pricing_trigger",
  );

  assert.deepEqual(
    invalidDirectPricing.slice(0, 5).map((record) => record.mapping_id),
    [],
    `${invalidDirectPricing.length} records allow direct pricing`,
  );
  assert.deepEqual(
    invalidTriggerPolicy.slice(0, 5).map((record) => record.mapping_id),
    [],
    `${invalidTriggerPolicy.length} records have an invalid trigger policy`,
  );
});

test("mapping_id, row_identity, and source references are complete and unique", () => {
  const mappingIds = new Set();
  const rowIdentities = new Set();
  const duplicateMappingIds = [];
  const duplicateRowIdentities = [];
  const invalidSourceReferences = [];

  for (const [index, record] of mapping.records.entries()) {
    if (
      typeof record.mapping_id !== "string" ||
      !/^A1-WD-\d{5}$/.test(record.mapping_id)
    ) {
      invalidSourceReferences.push({
        index,
        mapping_id: record.mapping_id,
        field: "mapping_id",
      });
    } else if (mappingIds.has(record.mapping_id)) {
      duplicateMappingIds.push(record.mapping_id);
    } else {
      mappingIds.add(record.mapping_id);
    }

    const sourceRef = record.source_ref ?? {};
    for (
      const field of [
        "source_workbook",
        "source_sheet",
        "source_row_number",
        "source_trade",
        "row_identity",
      ]
    ) {
      const value = sourceRef[field];
      if (value === null || value === undefined || value === "") {
        invalidSourceReferences.push({
          index,
          mapping_id: record.mapping_id,
          field,
        });
      }
    }

    if (
      !Number.isInteger(sourceRef.source_row_number) ||
      sourceRef.source_row_number < 1
    ) {
      invalidSourceReferences.push({
        index,
        mapping_id: record.mapping_id,
        field: "source_row_number",
      });
    }

    if (rowIdentities.has(sourceRef.row_identity)) {
      duplicateRowIdentities.push(sourceRef.row_identity);
    } else {
      rowIdentities.add(sourceRef.row_identity);
    }
  }

  assert.deepEqual(invalidSourceReferences.slice(0, 5), []);
  assert.deepEqual(duplicateMappingIds.slice(0, 5), []);
  assert.deepEqual(duplicateRowIdentities.slice(0, 5), []);
  assert.equal(mappingIds.size, EXPECTED_TOTAL);
  assert.equal(rowIdentities.size, EXPECTED_TOTAL);
});

test("the corpus exposes exactly 57 eligible demolition anomalies for quarantine", () => {
  const anomalies = mapping.records.filter(
    (record) =>
      record.bucket === "eligible_candidate_reference" &&
      DEMOLITION_SIGNAL.test(String(record.original_item?.item_name ?? "")),
  );

  assert.equal(anomalies.length, 57);
  assert.ok(
    anomalies.every(
      (record) =>
        record.next_use?.direct_pricing_allowed === false &&
        record.pricing_trigger_policy === "not_a_pricing_trigger" &&
        record.mapping_id &&
        record.source_ref?.row_identity,
    ),
  );
});
