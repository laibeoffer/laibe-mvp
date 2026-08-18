import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const TEST_DIR = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(TEST_DIR, "..", "..");
const SCHEMA_DIR = resolve(
  REPO_ROOT,
  "src",
  "lib",
  "budget",
  "quote-healthcheck",
  "schemas",
);

for (
  const [name, wire] of [
    [
      "quote-extraction-packet-v1.schema.json",
      "laibe.quote-extraction-packet.v1",
    ],
    ["quote-health-report-v1.schema.json", "laibe.quote-health-report.v1"],
  ]
) {
  Deno.test(`${wire} candidate schema is closed and freezes the A0 boundary constants`, () => {
    const path = resolve(SCHEMA_DIR, name);
    assert.ok(existsSync(path), `IMPLEMENTATION_MISSING: ${path}`);
    const schema = JSON.parse(readFileSync(path, "utf8"));
    assert.equal(schema.additionalProperties, false);
    assert.equal(schema.properties.schemaName.const, wire);
    assert.equal(schema.properties.schemaVersion.const, 1);
    assert.equal(schema.properties.producerRole.const, "A1");
    assert.equal(schema.properties.humanReviewRequired.const, true);
    assert.equal(schema.properties.paymentAuthorization.const, false);
    assert.equal(
      schema.properties.contractorPaymentDue.const,
      "NOT_DETERMINED",
    );
    assert.equal(schema.properties.pricedCandidateGenerated.const, false);
    assert.equal(Object.hasOwn(schema.properties, "humanDecision"), false);
    assert.equal(Object.hasOwn(schema.properties, "supersededBy"), false);
    if (name === "quote-extraction-packet-v1.schema.json") {
      assert.ok(schema.required.includes("dependencyBasis"));
      assert.equal(
        schema.properties.dependencyBasis.$ref,
        "#/$defs/dependencyBasis",
      );
      assert.equal(schema.properties.upstreamPacketIds.minItems, 1);
      assert.equal(schema.properties.upstreamPacketIds.maxItems, 1);
      for (
        const definition of [
          "dependencyBasis",
          "planSnapshotReference",
          "knowledgeReleaseReference",
          "specReference",
        ]
      ) {
        assert.equal(schema.$defs[definition].additionalProperties, false);
      }
    }
  });
}
