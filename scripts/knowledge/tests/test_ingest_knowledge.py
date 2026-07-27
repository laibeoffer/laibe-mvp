import json
import os
import sys
import tempfile
import unittest
import zipfile
from pathlib import Path
from xml.sax.saxutils import escape


MODULE_DIR = Path(__file__).resolve().parents[1]
STAGING_SCHEMA_PATH = (
    MODULE_DIR.parents[1]
    / "supabase"
    / "contracts"
    / "knowledge_staging.v1.schema.json"
)
sys.path.insert(0, str(MODULE_DIR))

import ingest_knowledge as ingest_module  # noqa: E402

from ingest_knowledge import (  # noqa: E402
    build_ingest_envelope,
    map_source_status,
    scan_budget_inventory,
    scan_budget_master,
    scan_vault,
    write_payload,
)


def write_inline_xlsx(path: Path, sheets: dict[str, list[list[object]]]) -> None:
    workbook_sheets = "".join(
        f'<sheet name="{escape(name)}" sheetId="{index}" r:id="rId{index}"/>'
        for index, name in enumerate(sheets, 1)
    )
    relationships_items = "".join(
        (
            f'<Relationship Id="rId{index}" '
            'Type="http://schemas.openxmlformats.org/officeDocument/2006/'
            f'relationships/worksheet" Target="worksheets/sheet{index}.xml"/>'
        )
        for index in range(1, len(sheets) + 1)
    )
    workbook = f"""<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"
 xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <sheets>{workbook_sheets}</sheets>
</workbook>"""
    relationships = f"""<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  {relationships_items}
</Relationships>"""
    content_types = """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
</Types>"""

    def column_name(index: int) -> str:
        result = ""
        value = index + 1
        while value:
            value, remainder = divmod(value - 1, 26)
            result = chr(65 + remainder) + result
        return result

    with zipfile.ZipFile(path, "w") as archive:
        archive.writestr("[Content_Types].xml", content_types)
        archive.writestr("xl/workbook.xml", workbook)
        archive.writestr("xl/_rels/workbook.xml.rels", relationships)
        for sheet_index, rows in enumerate(sheets.values(), 1):
            xml_rows = []
            for row_index, values in enumerate(rows, 1):
                cells = []
                for column_index, value in enumerate(values):
                    reference = f"{column_name(column_index)}{row_index}"
                    if isinstance(value, bool):
                        cells.append(
                            f'<c r="{reference}" t="b"><v>{int(value)}</v></c>'
                        )
                    elif isinstance(value, (int, float)):
                        cells.append(f'<c r="{reference}"><v>{value}</v></c>')
                    else:
                        cells.append(
                            f'<c r="{reference}" t="inlineStr"><is><t>'
                            f"{escape(str(value))}</t></is></c>"
                        )
                xml_rows.append(
                    f'<row r="{row_index}">{"".join(cells)}</row>'
                )
            worksheet = (
                '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
                '<worksheet xmlns="http://schemas.openxmlformats.org/'
                'spreadsheetml/2006/main"><sheetData>'
                f'{"".join(xml_rows)}</sheetData></worksheet>'
            )
            archive.writestr(
                f"xl/worksheets/sheet{sheet_index}.xml",
                worksheet,
            )


def write_minimal_xlsx(path: Path) -> None:
    write_inline_xlsx(
        path,
        {
            "items": [
                [
                    "unified_item_name",
                    "is_budget_candidate",
                    "is_auto_selectable",
                    "requires_manual_review",
                    "price_min",
                    "price_max",
                    "auto_trigger_allowed",
                ],
                ["固定收納櫃", True, True, False, 1000, 3000, True],
            ]
        },
    )


class StatusMappingTests(unittest.TestCase):
    def test_approved_source_still_requires_studio_review(self):
        self.assertEqual(map_source_status("已核准"), "pending_review")

    def test_known_statuses_are_mapped(self):
        self.assertEqual(map_source_status("收件箱"), "inbox")
        self.assertEqual(map_source_status("待整理"), "draft")
        self.assertEqual(map_source_status("待確認"), "pending_review")
        self.assertEqual(map_source_status("已停用"), "retired")


class VaultScanTests(unittest.TestCase):
    def test_vault_source_hash_changes_when_note_content_changes(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            vault = Path(temp_dir)
            note = vault / "防水規則.md"
            note.write_text(
                "---\n"
                "類型: 統一工項\n"
                "狀態: 待確認\n"
                "統一工項名稱: 防水試水紀錄\n"
                "標籤: [驗收]\n"
                "---\n"
                "第一版內容\n",
                encoding="utf-8",
            )
            first = scan_vault(vault)
            note.write_text(
                "---\n"
                "類型: 統一工項\n"
                "狀態: 待確認\n"
                "統一工項名稱: 防水試水紀錄\n"
                "標籤: [驗收]\n"
                "---\n"
                "第二版內容\n",
                encoding="utf-8",
            )
            second = scan_vault(vault)

        first_hash = first["source"].get("source_sha256")
        second_hash = second["source"].get("source_sha256")
        self.assertIsNotNone(first_hash)
        self.assertRegex(first_hash, r"^[0-9a-f]{64}$")
        self.assertNotEqual(first_hash, second_hash)
        self.assertEqual(
            first["source"]["file_manifest"][0]["source_relative_path"],
            "防水規則.md",
        )

    def test_changed_note_at_same_path_gets_a_new_staging_identity(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            vault = Path(temp_dir)
            note = vault / "防水規則.md"
            note.write_text(
                "---\n類型: 統一工項\n狀態: 待確認\n"
                "統一工項名稱: 防水試水紀錄\n---\n第一版內容\n",
                encoding="utf-8",
            )
            first = scan_vault(vault)
            note.write_text(
                "---\n類型: 統一工項\n狀態: 待確認\n"
                "統一工項名稱: 防水試水紀錄\n---\n第二版內容\n",
                encoding="utf-8",
            )
            second = scan_vault(vault)

        def envelope_for(result):
            return build_ingest_envelope(
                {"schema_version": "knowledge_staging.v1"},
                batch_records=result["records"],
                batch_index=1,
                batch_count=1,
                source_group={
                    "source_kind": "obsidian",
                    "source_sha256": result["source"]["source_sha256"],
                    "source_locator": "Laibe-Budget-Vault",
                    "source_record_count": len(result["records"]),
                    "files": result["source"]["file_manifest"],
                    "summary": result["summary"],
                },
            )

        first_envelope = envelope_for(first)
        second_envelope = envelope_for(second)

        self.assertEqual(
            first_envelope["source_manifest"]["source_locator"],
            second_envelope["source_manifest"]["source_locator"],
        )
        self.assertNotEqual(
            first_envelope["source_manifest"]["source_sha256"],
            second_envelope["source_manifest"]["source_sha256"],
        )
        self.assertNotEqual(
            first_envelope["idempotency_key"],
            second_envelope["idempotency_key"],
        )
        for envelope in (first_envelope, second_envelope):
            self.assertFalse(envelope["records"][0]["is_budget_candidate"])
            self.assertFalse(envelope["records"][0]["auto_trigger_allowed"])
            self.assertEqual(
                envelope["records"][0]["source_status"],
                "待確認",
            )

    def test_templates_are_validated_but_never_publishable(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            vault = Path(temp_dir)
            (vault / "90_筆記模板").mkdir()
            (vault / "01_統一工項").mkdir()
            (vault / "README.md").write_text("# Vault", encoding="utf-8")
            (vault / "01_統一工項" / "_INDEX.md").write_text(
                "# Index", encoding="utf-8"
            )
            (vault / "90_筆記模板" / "統一工項模板.md").write_text(
                "---\n"
                "類型: 統一工項\n"
                "狀態: 收件箱\n"
                "統一工項名稱: \"\"\n"
                "工種: \"\"\n"
                "單位: \"\"\n"
                "標籤:\n"
                "  - 預算知識庫\n"
                "---\n",
                encoding="utf-8",
            )
            (vault / "01_統一工項" / "固定收納櫃.md").write_text(
                "---\n類型: 統一工項\n狀態: 已核准\n統一工項名稱: 固定收納櫃\n---\n",
                encoding="utf-8",
            )

            result = scan_vault(vault)

        self.assertEqual(result["summary"]["publishable_records"], 1)
        self.assertEqual(result["summary"]["excluded_records"], 3)
        template = next(
            item for item in result["excluded"] if item["reason"] == "template"
        )
        self.assertTrue(template["schema_valid"])
        self.assertEqual(
            result["records"][0]["mapped_status"],
            "pending_review",
        )

    def test_repository_vault_has_zero_publishable_records(self):
        root = Path(__file__).resolve().parents[3]
        vault = Path(
            os.environ.get(
                "LAIBE_BUDGET_VAULT_PATH",
                root / "Laibe-Budget-Vault",
            )
        )
        result = scan_vault(vault)
        self.assertEqual(result["summary"]["markdown_files"], 22)
        self.assertEqual(result["summary"]["publishable_records"], 0)
        self.assertEqual(result["summary"]["excluded_records"], 22)
        self.assertEqual(result["summary"]["template_files"], 9)


class BudgetScanTests(unittest.TestCase):
    def test_ingest_envelopes_keep_obsidian_and_budget_batches_separate(self):
        builder = getattr(ingest_module, "build_ingest_envelopes", None)
        self.assertIsNotNone(builder)

        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            vault = root / "vault"
            budget_root = root / "budget"
            vault.mkdir()
            budget_root.mkdir()
            (vault / "防水規則.md").write_text(
                "---\n"
                "類型: 統一工項\n"
                "狀態: 待確認\n"
                "統一工項名稱: 防水試水紀錄\n"
                "標籤: [驗收]\n"
                "---\n"
                "保留來源定位。\n",
                encoding="utf-8",
            )
            workbook = budget_root / "laibe_budget_ai_master_index.xlsx"
            write_minimal_xlsx(workbook)
            payload = ingest_module.build_payload(
                vault_result=scan_vault(vault),
                budget_result=scan_budget_master(
                    workbook,
                    source_root=budget_root,
                ),
                budget_inventory=scan_budget_inventory(
                    budget_root,
                    master_path=workbook,
                ),
            )
            envelopes = builder(payload, batch_size=1000)

        self.assertEqual(
            [item["source_manifest"]["source_kind"] for item in envelopes],
            ["obsidian", "budget_master"],
        )
        self.assertEqual(
            {record["raw_payload"]["record_kind"] for record in envelopes[0]["records"]},
            {"obsidian_note"},
        )
        budget_record_kinds = {
            record["raw_payload"]["record_kind"]
            for record in envelopes[1]["records"]
        }
        self.assertTrue(budget_record_kinds)
        self.assertTrue(
            all(kind.startswith("budget_") for kind in budget_record_kinds)
        )
        self.assertNotEqual(
            envelopes[0]["correlation_key"],
            envelopes[1]["correlation_key"],
        )

    def test_budget_inventory_counts_only_supported_source_files(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            (root / "nested").mkdir()
            workbook = root / "nested" / "items.xlsx"
            write_minimal_xlsx(workbook)
            (root / "notes.md").write_text("# note", encoding="utf-8")
            (root / "rules.json").write_text("{}", encoding="utf-8")
            (root / "ignore.txt").write_text("ignore", encoding="utf-8")

            result = scan_budget_inventory(root, master_path=workbook)

        self.assertEqual(
            result["summary"],
            {"total": 3, "xlsx": 1, "md": 1, "json": 1},
        )
        xlsx = next(item for item in result["files"] if item["kind"] == "xlsx")
        self.assertEqual(xlsx["relative_path"], "nested/items.xlsx")
        self.assertEqual(xlsx["source_role"], "active_master_index")
        self.assertRegex(xlsx["file_sha256"], r"^[0-9a-f]{64}$")

    def test_source_flags_and_prices_are_forced_into_staging_guards(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            workbook = Path(temp_dir) / "master.xlsx"
            write_minimal_xlsx(workbook)

            result = scan_budget_master(workbook, source_root=Path(temp_dir))

        self.assertEqual(result["summary"]["rows"], 1)
        record = result["records"][0]
        self.assertEqual(record["source"]["is_budget_candidate"], True)
        self.assertEqual(record["source"]["is_auto_selectable"], True)
        self.assertEqual(record["source"]["auto_trigger_allowed"], True)
        self.assertFalse(record["staging_guard"]["direct_pricing_allowed"])
        self.assertFalse(record["staging_guard"]["auto_select_allowed"])
        self.assertFalse(record["staging_guard"]["auto_trigger_allowed"])
        self.assertTrue(record["staging_guard"]["requires_manual_review"])
        self.assertEqual(
            record["staging_guard"]["price_classification"],
            "historical_reference",
        )
        self.assertEqual(
            record["staging_guard"]["trigger_requirements"],
            ["object_status:new", "scope_confirmed", "human_review"],
        )
        self.assertEqual(record["locator"], {"sheet": "items", "row": 2})
        self.assertEqual(record["relative_path"], "master.xlsx")
        self.assertEqual(record["worksheet_name"], "items")
        self.assertEqual(record["row_number"], 2)
        self.assertRegex(record["file_sha256"], r"^[0-9a-f]{64}$")

    def test_reject_and_control_sheets_are_not_budget_records(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            workbook = Path(temp_dir) / "master.xlsx"
            write_inline_xlsx(
                workbook,
                {
                    "00_manifest": [
                        ["field_name", "field_value"],
                        ["schema_version", "1"],
                    ],
                    "01_standard_work_item_master": [
                        [
                            "unified_item_name",
                            "classification_path",
                            "conflicting_unified_item_name",
                        ],
                        ["固定收納櫃", "木作櫃", "衣櫃"],
                        ["", "木作櫃", ""],
                    ],
                    "06_dependency_rules": [
                        ["dependency_rule_id", "condition"],
                        ["DEP_TV_POWER", "新增電視櫃"],
                    ],
                    "11_rejects": [
                        ["source_item", "reject_reason"],
                        ["舊工項", "缺少單位"],
                    ],
                    "12_validation_report": [
                        ["check_name", "result"],
                        ["row_count", "pass"],
                    ],
                },
            )

            result = scan_budget_master(
                workbook,
                source_root=Path(temp_dir),
            )

        record_sheets = {item["worksheet_name"] for item in result["records"]}
        self.assertEqual(
            record_sheets,
            {"01_standard_work_item_master", "06_dependency_rules"},
        )
        evidence_sheets = {
            item["worksheet_name"] for item in result["control_evidence"]
        }
        self.assertEqual(
            evidence_sheets,
            {"00_manifest", "12_validation_report"},
        )
        issues = {item["code"]: item for item in result["quality_issues"]}
        self.assertTrue(issues["source_reject"]["quarantined"])
        self.assertEqual(issues["source_reject"]["review_state"], "pending_review")
        self.assertIn("classification_conflict", issues)
        self.assertIn("missing_required_identity", issues)
        self.assertFalse(
            any(
                item["code"] == "missing_required_identity"
                and item["locator"]["sheet"] == "06_dependency_rules"
                for item in result["quality_issues"]
            )
        )

    def test_ingest_envelope_keeps_batch_source_and_quality_metadata(self):
        payload = {
            "schema_version": "knowledge_staging.v1",
            "generated_at": "2026-07-26T00:00:00Z",
            "summary": {"record_count": 1},
            "records": [
                {
                    "record_kind": "budget_item",
                    "title": "固定收納櫃",
                    "relative_path": "master.xlsx",
                    "file_sha256": "a" * 64,
                    "worksheet_name": "items",
                    "row_number": 2,
                    "source": {"unit": "尺", "price_min": 1000},
                    "staging_guard": {
                        "direct_pricing_allowed": False,
                        "auto_trigger_allowed": False,
                    },
                }
            ],
            "quality_issues": [
                {
                    "code": "source_reject",
                    "severity": "warning",
                    "description": "來源退件",
                    "evidence": {},
                }
            ],
            "source_manifest": [
                {
                    "relative_path": "master.xlsx",
                    "file_sha256": "a" * 64,
                    "source_role": "active_master_index",
                }
            ],
            "control_evidence": [{"worksheet_name": "00_manifest"}],
            "sources": [
                {
                    "kind": "budget_master_workbook",
                    "path": "master.xlsx",
                    "file_sha256": "a" * 64,
                }
            ],
        }

        envelope = build_ingest_envelope(
            payload,
            batch_records=payload["records"],
            batch_index=1,
            batch_count=1,
        )

        self.assertNotIn("operation", envelope)
        self.assertEqual(envelope["schema_version"], "knowledge_staging.v1")
        self.assertRegex(
            envelope["idempotency_key"],
            r"^[A-Za-z0-9][A-Za-z0-9._:-]{7,127}$",
        )
        self.assertRegex(
            envelope["correlation_key"],
            r"^[A-Za-z0-9][A-Za-z0-9._:-]{7,127}$",
        )
        self.assertEqual(
            envelope["source_manifest"]["source_kind"],
            "budget_master",
        )
        self.assertEqual(
            envelope["source_manifest"]["source_locator"],
            "master.xlsx",
        )
        self.assertEqual(
            envelope["source_manifest"]["files"],
            payload["source_manifest"],
        )
        self.assertEqual(len(envelope["records"]), 1)
        self.assertEqual(len(envelope["budget_items"]), 1)
        self.assertEqual(envelope["woodwork_candidates"], [])
        self.assertFalse(envelope["budget_items"][0]["is_budget_candidate"])
        self.assertFalse(envelope["budget_items"][0]["auto_trigger_allowed"])
        self.assertEqual(
            envelope["budget_items"][0]["historical_price_low"],
            1000,
        )
        self.assertEqual(
            envelope["quality_issues"][0]["issue_code"],
            "source_reject",
        )
        self.assertEqual(
            envelope["source_manifest"]["control_evidence"],
            payload["control_evidence"],
        )
        schema = json.loads(STAGING_SCHEMA_PATH.read_text(encoding="utf-8"))
        self.assertEqual(
            set(envelope),
            set(schema["required"]) | {"woodwork_candidates"},
        )
        self.assertFalse(
            set(envelope["source_manifest"])
            - set(schema["properties"]["source_manifest"]["properties"])
        )
        self.assertFalse(
            set(envelope["budget_items"][0])
            - set(
                schema["properties"]["budget_items"]["items"]["properties"]
            )
        )

    def test_ingest_envelope_omits_empty_optional_budget_fields(self):
        payload = {
            "schema_version": "knowledge_staging.v1",
            "generated_at": "2026-07-26T00:00:00Z",
            "summary": {"record_count": 1},
            "records": [
                {
                    "record_kind": "budget_item",
                    "title": "待確認工項",
                    "relative_path": "master.xlsx",
                    "file_sha256": "b" * 64,
                    "worksheet_name": "items",
                    "row_number": 2,
                    "source": {},
                }
            ],
            "quality_issues": [],
            "source_manifest": [
                {
                    "relative_path": "master.xlsx",
                    "file_sha256": "b" * 64,
                    "source_role": "active_master_index",
                }
            ],
            "control_evidence": [],
            "sources": [
                {
                    "kind": "budget_master_workbook",
                    "path": "master.xlsx",
                    "file_sha256": "b" * 64,
                }
            ],
        }

        envelope = build_ingest_envelope(
            payload,
            batch_records=payload["records"],
            batch_index=1,
            batch_count=1,
        )

        item = envelope["budget_items"][0]
        self.assertNotIn("category_code", item)
        self.assertNotIn("unit", item)

    def test_negative_historical_price_is_quarantined_from_price_fields(self):
        payload = {
            "schema_version": "knowledge_staging.v1",
            "generated_at": "2026-07-26T00:00:00Z",
            "summary": {"record_count": 1},
            "records": [
                {
                    "record_kind": "budget_price_reference",
                    "title": "負值來源待確認",
                    "relative_path": "master.xlsx",
                    "file_sha256": "c" * 64,
                    "worksheet_name": "prices",
                    "row_number": 22,
                    "source": {"price_min": -1, "price_max": 500},
                }
            ],
            "quality_issues": [],
            "source_manifest": [
                {
                    "relative_path": "master.xlsx",
                    "file_sha256": "c" * 64,
                    "source_role": "active_master_index",
                }
            ],
            "control_evidence": [],
            "sources": [
                {
                    "kind": "budget_master_workbook",
                    "path": "master.xlsx",
                    "file_sha256": "c" * 64,
                }
            ],
        }

        envelope = build_ingest_envelope(
            payload,
            batch_records=payload["records"],
            batch_index=22,
            batch_count=60,
        )

        item = envelope["budget_items"][0]
        self.assertIsNone(item["historical_price_low"])
        self.assertEqual(item["historical_price_high"], 500)
        self.assertEqual(item["raw_payload"]["source"]["price_min"], -1)
        issue = envelope["quality_issues"][0]
        self.assertEqual(issue["issue_code"], "negative_historical_price")
        self.assertEqual(
            issue["source_record_key"],
            envelope["records"][0]["source_key"],
        )
        self.assertTrue(issue["evidence"]["quarantined"])

    @unittest.skipUnless(sys.platform == "win32", "Windows drive mapping test")
    def test_absolute_source_path_preserves_mapped_drive_letter(self):
        source = Path(r"Z:\08-Jacky\laibe_MVP_project")

        resolved = ingest_module.absolute_source_path(source)

        self.assertTrue(str(resolved).startswith("Z:\\"))
        self.assertFalse(str(resolved).startswith("\\\\"))

    def test_payload_writer_supports_json_and_ndjson(self):
        payload = {
            "records": [{"record_kind": "vault"}, {"record_kind": "budget"}],
            "quality_issues": [{"code": "needs_review"}],
        }
        with tempfile.TemporaryDirectory() as temp_dir:
            target = Path(temp_dir)
            json_path = target / "payload.json"
            ndjson_path = target / "payload.ndjson"
            write_payload(payload, json_path)
            write_payload(payload, ndjson_path)
            parsed = json.loads(json_path.read_text(encoding="utf-8"))
            lines = [
                json.loads(line)
                for line in ndjson_path.read_text(encoding="utf-8").splitlines()
            ]

        self.assertEqual(parsed, payload)
        self.assertEqual(len(lines), 3)
        self.assertEqual(lines[-1]["record_type"], "quality_issue")


if __name__ == "__main__":
    unittest.main()
