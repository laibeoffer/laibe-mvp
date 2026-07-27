from __future__ import annotations

import base64
import copy
import hashlib
import importlib.util
import json
import os
import tempfile
import time
import unittest
from pathlib import Path
from unittest import mock


TESTS_DIR = Path(__file__).parent
SCRIPT_DIR = TESTS_DIR.parent
REPO_ROOT = SCRIPT_DIR.parents[1]
MODULE_PATH = SCRIPT_DIR / "ingest_woodwork_mapping.py"
SOURCE_PATH = (
    REPO_ROOT
    / "outputs"
    / "budget_woodwork_items_20260710"
    / "A1_woodwork_ingest_mapping_20260711.json"
)
STAGING_SCHEMA_PATH = (
    REPO_ROOT / "supabase" / "contracts" / "knowledge_staging.v1.schema.json"
)
EXPECTED_SHA256 = "d4f3d30750894b4c788823e5155255dfe288f923c87b7fc4172332c94cae0f7a"
EXPECTED_BUCKET_COUNTS = {
    "eligible_candidate_reference": 11618,
    "requires_image_or_quote_confirmation": 27090,
    "not_grade_applicable": 1593,
    "needs_manual_review": 1947,
}
EXPECTED_CANDIDATE_KEYS = {
    "source_record_key",
    "mapping_id",
    "bucket",
    "pricing_trigger_policy",
    "source_ref",
    "original_item",
    "candidate_evidence",
    "grade_fields",
    "evidence_priority_used",
    "confidence_grade",
    "review_state_label",
    "review_reason",
    "missing_info_items",
    "next_use",
}


spec = importlib.util.spec_from_file_location(
    "ingest_woodwork_mapping",
    MODULE_PATH,
)
if spec is None or spec.loader is None:
    raise RuntimeError("Unable to load ingest_woodwork_mapping module")
woodwork = importlib.util.module_from_spec(spec)
spec.loader.exec_module(woodwork)


def _compact_jwt(payload: dict[str, object]) -> str:
    def encode(value: dict[str, object]) -> str:
        raw = json.dumps(value, separators=(",", ":")).encode("utf-8")
        return base64.urlsafe_b64encode(raw).decode("ascii").rstrip("=")

    return f"{encode({'alg': 'RS256', 'typ': 'JWT'})}.{encode(payload)}.signature"


def _small_record(
    *,
    mapping_id: str = "A1-WD-TEST-1",
    row_identity: str = "test.xlsx|預算單|row:2|測試木作",
    direct_pricing_allowed: bool = False,
) -> dict[str, object]:
    return {
        "mapping_id": mapping_id,
        "bucket": "eligible_candidate_reference",
        "pricing_trigger_policy": "not_a_pricing_trigger",
        "source_ref": {
            "source_workbook": "test.xlsx",
            "source_sheet": "預算單",
            "source_row_number": 2,
            "source_trade": "木作工程",
            "row_identity": row_identity,
        },
        "original_item": {
            "item_name": "測試木作",
            "spec_text": None,
            "unit": "式",
            "quantity": 1,
            "low_price_evidence": None,
            "high_price_evidence": None,
            "amount_evidence": None,
            "note": None,
        },
        "candidate_evidence": {
            "woodwork_scope": "木作",
            "component_tags": ["木作"],
            "classification_basis": "測試",
            "source_confidence_text": "高",
            "inclusion_reason": "測試",
            "exclusion_reason": None,
            "detail_id_candidate": None,
        },
        "grade_fields": {
            "public_grade_candidate": None,
            "grade_status": "未決定",
            "brand_group_candidate": [],
            "material_candidate": [],
            "surface_candidate": [],
            "hardware_candidate": [],
            "method_candidate": "木作",
            "board_type_candidate": [],
            "formaldehyde_class_candidate": [],
            "moisture_resistance_candidate": [],
        },
        "evidence_priority_used": "corpus",
        "confidence_grade": "D",
        "review_state": "待人工確認",
        "review_reason": "測試",
        "missing_info_items": [],
        "next_use": {
            "usable_for_later_matching": True,
            "usable_for_evidence_retrieval": True,
            "direct_pricing_allowed": direct_pricing_allowed,
            "pricing_trigger_note": "不得直接計價",
        },
    }


def _small_document(records: list[dict[str, object]]) -> dict[str, object]:
    return {
        "task_id": "test",
        "created_at": "2026-07-27T00:00:00Z",
        "input_counts": {
            "total_extracted_rows": len(records),
            "rows_count": len(records),
        },
        "bucket_counts": {
            "eligible_candidate_reference": len(records),
            "requires_image_or_quote_confirmation": 0,
            "not_grade_applicable": 0,
            "needs_manual_review": 0,
        },
        "quality_gates": {
            "output_records_count": len(records),
            "bucket_count_sum": len(records),
        },
        "records": records,
    }


class RepositoryMappingContractTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        cls.validated = woodwork.load_and_validate_source(SOURCE_PATH)

    def test_pinned_sha_counts_and_bucket_reconciliation(self):
        self.assertEqual(cls := self.validated.source_sha256, EXPECTED_SHA256)
        self.assertRegex(cls, r"^[0-9a-f]{64}$")
        self.assertEqual(len(self.validated.records), 42248)
        self.assertEqual(self.validated.bucket_counts, EXPECTED_BUCKET_COUNTS)
        self.assertEqual(self.validated.demolition_conflict_count, 57)

    def test_envelopes_preserve_raw_records_and_emit_safe_candidates(self):
        originals = {
            record["mapping_id"]: record for record in self.validated.records
        }
        staging_schema = json.loads(
            STAGING_SCHEMA_PATH.read_text(encoding="utf-8")
        )
        allowed_manifest_keys = set(
            staging_schema["properties"]["source_manifest"]["properties"]
        )
        record_count = 0
        candidate_count = 0
        issue_count = 0
        envelope_count = 0
        idempotency_keys: set[str] = set()

        for envelope in woodwork.iter_envelopes(
            self.validated,
            batch_size=1000,
        ):
            envelope_count += 1
            self.assertEqual(envelope["schema_version"], "knowledge_staging.v1")
            self.assertEqual(
                envelope["source_manifest"]["source_kind"],
                "woodwork_mapping",
            )
            self.assertFalse(
                set(envelope["source_manifest"]) - allowed_manifest_keys
            )
            self.assertRegex(
                envelope["source_manifest"]["summary"]["chunk_sha256"],
                r"^[0-9a-f]{64}$",
            )
            self.assertEqual(
                envelope["source_manifest"]["summary"]["transform_version"],
                woodwork.TRANSFORM_VERSION,
            )
            self.assertLessEqual(len(envelope["records"]), 1000)
            self.assertLessEqual(len(envelope["woodwork_candidates"]), 1000)
            self.assertEqual(envelope["budget_items"], [])
            self.assertNotIn(envelope["idempotency_key"], idempotency_keys)
            idempotency_keys.add(envelope["idempotency_key"])

            self.assertEqual(
                len(envelope["records"]),
                len(envelope["woodwork_candidates"]),
            )
            for source_record, candidate in zip(
                envelope["records"],
                envelope["woodwork_candidates"],
                strict=True,
            ):
                original = originals[candidate["mapping_id"]]
                self.assertEqual(source_record["raw_payload"], original)
                self.assertEqual(
                    candidate["source_record_key"],
                    source_record["source_key"],
                )
                self.assertEqual(source_record["source_key"], candidate["mapping_id"])
                self.assertEqual(set(candidate), EXPECTED_CANDIDATE_KEYS)
                self.assertEqual(candidate["bucket"], original["bucket"])
                self.assertNotIn("raw_payload", candidate)
                self.assertEqual(
                    candidate["pricing_trigger_policy"],
                    "not_a_pricing_trigger",
                )
                self.assertEqual(candidate["original_item"], original["original_item"])
                self.assertEqual(
                    candidate["review_state_label"],
                    original["review_state"],
                )
                self.assertEqual(
                    set(candidate["next_use"]),
                    {
                        "usable_for_later_matching",
                        "usable_for_evidence_retrieval",
                        "pricing_trigger_note",
                        "publication_authorized",
                        "candidate_creation_authorized",
                        "direct_pricing_allowed",
                        "auto_trigger_allowed",
                        "auto_select_allowed",
                    },
                )
                self.assertEqual(
                    candidate["next_use"]["usable_for_later_matching"],
                    original["next_use"]["usable_for_later_matching"],
                )
                self.assertEqual(
                    candidate["next_use"]["usable_for_evidence_retrieval"],
                    original["next_use"]["usable_for_evidence_retrieval"],
                )
                self.assertEqual(
                    candidate["next_use"]["pricing_trigger_note"],
                    original["next_use"]["pricing_trigger_note"],
                )
                self.assertFalse(source_record["is_budget_candidate"])
                self.assertFalse(source_record["auto_trigger_allowed"])
                for flag in (
                    "publication_authorized",
                    "candidate_creation_authorized",
                    "direct_pricing_allowed",
                    "auto_trigger_allowed",
                    "auto_select_allowed",
                ):
                    self.assertIs(candidate["next_use"][flag], False)

            for issue in envelope["quality_issues"]:
                issue_count += 1
                self.assertEqual(
                    issue["issue_code"],
                    "demolition_candidate_conflict",
                )
                self.assertTrue(issue["evidence"]["quarantined"])
                self.assertEqual(issue["next_reviewer_role"], "pcm")
                mapping_id = issue["evidence"]["mapping_id"]
                self.assertEqual(
                    originals[mapping_id]["bucket"],
                    "eligible_candidate_reference",
                )

            record_count += len(envelope["records"])
            candidate_count += len(envelope["woodwork_candidates"])

        self.assertEqual(envelope_count, 43)
        self.assertEqual(record_count, 42248)
        self.assertEqual(candidate_count, 42248)
        self.assertEqual(issue_count, 57)

    def test_idempotency_is_stable_and_batch_shape_sensitive(self):
        first_a = next(
            woodwork.iter_envelopes(self.validated, batch_size=1000)
        )
        first_b = next(
            woodwork.iter_envelopes(self.validated, batch_size=1000)
        )
        first_smaller = next(
            woodwork.iter_envelopes(self.validated, batch_size=500)
        )

        self.assertEqual(
            first_a["idempotency_key"],
            first_b["idempotency_key"],
        )
        self.assertEqual(
            woodwork.canonical_sha256(first_a),
            woodwork.canonical_sha256(first_b),
        )
        self.assertNotEqual(
            first_a["idempotency_key"],
            first_smaller["idempotency_key"],
        )


class FailClosedTests(unittest.TestCase):
    def test_malformed_json_fails_closed(self):
        with tempfile.TemporaryDirectory(dir=TESTS_DIR) as temp_dir:
            path = Path(temp_dir) / "malformed.json"
            path.write_text('{"records": [', encoding="utf-8")
            digest = hashlib.sha256(path.read_bytes()).hexdigest()
            with self.assertRaises(woodwork.WoodworkMappingValidationError):
                woodwork.load_and_validate_source(
                    path,
                    expected_sha256=digest,
                    expected_record_count=1,
                    expected_bucket_counts={
                        "eligible_candidate_reference": 1,
                        "requires_image_or_quote_confirmation": 0,
                        "not_grade_applicable": 0,
                        "needs_manual_review": 0,
                    },
                    expected_conflict_count=0,
                )

    def test_duplicate_identity_and_pricing_flag_fail_closed(self):
        first = _small_record()
        duplicate = copy.deepcopy(first)
        duplicate["next_use"]["direct_pricing_allowed"] = True
        document = _small_document([first, duplicate])

        with self.assertRaises(woodwork.WoodworkMappingValidationError) as caught:
            woodwork.validate_mapping_document(
                document,
                source_sha256="a" * 64,
                expected_record_count=2,
                expected_bucket_counts={
                    "eligible_candidate_reference": 2,
                    "requires_image_or_quote_confirmation": 0,
                    "not_grade_applicable": 0,
                    "needs_manual_review": 0,
                },
                expected_conflict_count=0,
            )

        message = str(caught.exception)
        self.assertIn("duplicate mapping_id", message)
        self.assertIn("duplicate row_identity", message)
        self.assertIn("direct_pricing_allowed", message)

    def test_sha_mismatch_fails_before_envelope_generation(self):
        with self.assertRaises(woodwork.WoodworkMappingValidationError):
            woodwork.load_and_validate_source(
                SOURCE_PATH,
                expected_sha256="0" * 64,
            )

    @unittest.skipUnless(os.name == "nt", "Windows drive mapping test")
    def test_z_drive_path_is_not_expanded_to_unc(self):
        path = woodwork.absolute_source_path(
            Path(r"Z:\08-Jacky\laibe_MVP_project")
        )
        self.assertTrue(str(path).startswith("Z:\\"))
        self.assertFalse(str(path).startswith("\\\\"))

    def test_post_requires_explicit_short_lived_jwt(self):
        now = int(time.time())
        valid = _compact_jwt({"iat": now, "exp": now + 600, "sub": "reviewer"})
        self.assertEqual(
            woodwork.validate_short_lived_jwt(valid, now=now),
            now + 600,
        )

        too_long = _compact_jwt(
            {"iat": now, "exp": now + woodwork.MAX_JWT_LIFETIME_SECONDS + 1}
        )
        with self.assertRaises(woodwork.WoodworkMappingValidationError):
            woodwork.validate_short_lived_jwt(too_long, now=now)
        with self.assertRaises(woodwork.WoodworkMappingValidationError):
            woodwork.validate_post_configuration(
                endpoint="https://example.invalid/ingest",
                jwt_environment_variable=None,
                publishable_key_environment_variable="TEST_KEY",
                environment={},
                now=now,
            )
        with self.assertRaises(woodwork.WoodworkMappingValidationError):
            woodwork.validate_post_configuration(
                endpoint="https://example.invalid/ingest",
                jwt_environment_variable="TEST_JWT",
                publishable_key_environment_variable=None,
                environment={"TEST_JWT": valid},
                now=now,
            )

        self.assertEqual(
            woodwork.validate_post_configuration(
                endpoint="https://example.invalid/ingest",
                jwt_environment_variable="TEST_JWT",
                publishable_key_environment_variable="TEST_KEY",
                environment={
                    "TEST_JWT": valid,
                    "TEST_KEY": "sb_publishable_test",
                },
                now=now,
            ),
            (valid, "sb_publishable_test"),
        )

    def test_post_sends_user_jwt_and_publishable_key(self):
        class _Response:
            status = 200

            def __enter__(self):
                return self

            def __exit__(self, *_args):
                return False

            def read(self):
                return b"{}"

        envelope = {"source_manifest": {"chunk_index": 1}}
        with mock.patch.object(
            woodwork.urllib.request,
            "urlopen",
            return_value=_Response(),
        ) as opened:
            result = woodwork.post_envelopes(
                [envelope],
                endpoint="https://example.invalid/ingest",
                token="user-jwt",
                publishable_key="sb_publishable_test",
            )

        request = opened.call_args.args[0]
        self.assertEqual(request.get_header("Authorization"), "Bearer user-jwt")
        self.assertEqual(
            request.get_header("Apikey"),
            "sb_publishable_test",
        )
        self.assertEqual(result["batches"][0]["status"], 200)


if __name__ == "__main__":
    unittest.main()
