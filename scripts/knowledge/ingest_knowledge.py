#!/usr/bin/env python3
"""Prepare Obsidian and budget workbook records for knowledge staging.

This tool is deliberately one-way. It reads source files without changing them,
adds conservative publication and pricing guards, and writes a review payload.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import re
import sys
import urllib.error
import urllib.request
import xml.etree.ElementTree as ET
import zipfile
from datetime import UTC, datetime
from pathlib import Path
from typing import Any, Iterable


STATUS_MAP = {
    "收件箱": "inbox",
    "待整理": "draft",
    "待確認": "pending_review",
    "已核准": "pending_review",
    "已停用": "retired",
}

TEMPLATE_REQUIRED_FIELDS = {
    "統一工項": {"統一工項名稱", "工種", "單位"},
    "品牌型號": {"品牌", "型號", "產品類別"},
    "材料規格": {"材料名稱", "材料類別", "規格值"},
    "工法與大樣圖": {"適用工項", "工法要求", "驗收資料要求"},
    "驗收依據": {"驗收項目", "驗收類別", "驗收時點"},
    "價格參考": {"價格名稱", "參考金額", "幣別", "日期", "單位"},
    "來源文件": {"文件名稱", "文件類型", "版本"},
    "規格衝突": {"問題名稱", "衝突類別", "負責角色"},
    "案件決策投影": {
        "案件識別名稱",
        "案件查找代碼",
        "正式案件紀錄位置",
    },
}

TITLE_FIELDS = {
    "統一工項": "統一工項名稱",
    "品牌型號": "品牌",
    "材料規格": "材料名稱",
    "工法與大樣圖": "工法名稱",
    "驗收依據": "驗收項目",
    "價格參考": "價格名稱",
    "來源文件": "文件名稱",
    "規格衝突": "問題名稱",
    "案件決策投影": "案件識別名稱",
}

EVIDENCE_FIELDS = (
    "來源檔",
    "來源文件",
    "來源定位",
    "工作表頁碼列",
    "正式來源位置",
    "附件",
    "版本",
    "最後核對者",
    "最後核對日期",
)

XML_MAIN = "http://schemas.openxmlformats.org/spreadsheetml/2006/main"
XML_REL = "http://schemas.openxmlformats.org/officeDocument/2006/relationships"
XML_PACKAGE_REL = (
    "http://schemas.openxmlformats.org/package/2006/relationships"
)
NS = {"m": XML_MAIN, "r": XML_REL, "pr": XML_PACKAGE_REL}

BOOL_FIELDS = {
    "is_budget_candidate",
    "is_auto_selectable",
    "requires_manual_review",
    "auto_trigger_allowed",
    "direct_pricing_allowed",
    "enabled",
    "active",
}


def utc_now() -> str:
    return datetime.now(UTC).isoformat().replace("+00:00", "Z")


def absolute_source_path(path: Path) -> Path:
    """Return an absolute path without expanding a mapped drive to UNC."""
    return Path(os.path.abspath(os.fspath(path)))


def _path_key(path: Path) -> str:
    return os.path.normcase(os.path.abspath(os.fspath(path)))


def file_sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def map_source_status(value: Any) -> str:
    return STATUS_MAP.get(str(value or "").strip(), "pending_review")


def _parse_scalar(value: str) -> Any:
    value = value.strip()
    if not value:
        return ""
    if value in {"[]", "[ ]"}:
        return []
    if value in {"{}", "{ }"}:
        return {}
    if (
        len(value) >= 2
        and value[0] == value[-1]
        and value[0] in {'"', "'"}
    ):
        return value[1:-1]
    lowered = value.lower()
    if lowered in {"true", "false"}:
        return lowered == "true"
    if lowered in {"null", "none", "~"}:
        return None
    if value.startswith("[") and value.endswith("]"):
        inner = value[1:-1].strip()
        if not inner:
            return []
        return [_parse_scalar(part) for part in inner.split(",")]
    if re.fullmatch(r"-?\d+", value):
        try:
            return int(value)
        except ValueError:
            pass
    if re.fullmatch(r"-?(?:\d+\.\d*|\d*\.\d+)", value):
        try:
            return float(value)
        except ValueError:
            pass
    return value


def parse_frontmatter(text: str) -> tuple[dict[str, Any], str, list[str]]:
    lines = text.lstrip("\ufeff").splitlines()
    if not lines or lines[0].strip() != "---":
        return {}, text, ["missing_frontmatter"]

    closing = next(
        (index for index, line in enumerate(lines[1:], 1) if line.strip() == "---"),
        None,
    )
    if closing is None:
        return {}, text, ["unclosed_frontmatter"]

    metadata: dict[str, Any] = {}
    errors: list[str] = []
    active_key: str | None = None
    for line_number, raw_line in enumerate(lines[1:closing], 2):
        if not raw_line.strip() or raw_line.lstrip().startswith("#"):
            continue
        if raw_line.startswith((" ", "\t")):
            stripped = raw_line.strip()
            if stripped.startswith("- ") and active_key:
                current = metadata.get(active_key)
                if current == "" or current is None:
                    current = []
                    metadata[active_key] = current
                if not isinstance(current, list):
                    errors.append(f"line_{line_number}:list_expected")
                    continue
                current.append(_parse_scalar(stripped[2:]))
            else:
                errors.append(f"line_{line_number}:unsupported_nested_value")
            continue
        if ":" not in raw_line:
            errors.append(f"line_{line_number}:missing_separator")
            continue
        key, value = raw_line.split(":", 1)
        active_key = key.strip()
        if not active_key:
            errors.append(f"line_{line_number}:empty_key")
            active_key = None
            continue
        metadata[active_key] = _parse_scalar(value)

    body = "\n".join(lines[closing + 1 :]).strip()
    return metadata, body, errors


def _first_heading(body: str) -> str:
    for line in body.splitlines():
        if line.startswith("# "):
            return line[2:].strip()
    return ""


def _template_validation(metadata: dict[str, Any], errors: list[str]) -> dict[str, Any]:
    item_type = str(metadata.get("類型", "")).strip()
    required = TEMPLATE_REQUIRED_FIELDS.get(item_type)
    missing = sorted(field for field in (required or set()) if field not in metadata)
    status = str(metadata.get("狀態", "")).strip()
    validation_errors = list(errors)
    if not item_type:
        validation_errors.append("missing_type")
    elif required is None:
        validation_errors.append("unknown_type")
    if status not in STATUS_MAP:
        validation_errors.append("invalid_status")
    if not isinstance(metadata.get("標籤"), list):
        validation_errors.append("labels_must_be_list")
    validation_errors.extend(f"missing_field:{field}" for field in missing)
    return {
        "schema_valid": not validation_errors,
        "schema_errors": validation_errors,
        "template_type": item_type or None,
    }


def _vault_exclusion(path: Path, vault_root: Path) -> str | None:
    relative = path.relative_to(vault_root)
    if path.name.lower() == "readme.md":
        return "readme"
    if path.name == "_INDEX.md":
        return "index"
    if "90_筆記模板" in relative.parts:
        return "template"
    if "98_附件" in relative.parts:
        return "attachment"
    if "99_封存" in relative.parts:
        return "archive"
    return None


def scan_vault(vault_root: Path) -> dict[str, Any]:
    vault_root = absolute_source_path(vault_root)
    records: list[dict[str, Any]] = []
    excluded: list[dict[str, Any]] = []
    quality_issues: list[dict[str, Any]] = []
    files = sorted(vault_root.rglob("*.md")) if vault_root.exists() else []
    file_manifest: list[dict[str, Any]] = []
    template_count = 0

    for path in files:
        relative = path.relative_to(vault_root).as_posix()
        source_sha256 = file_sha256(path)
        text = path.read_text(encoding="utf-8-sig")
        metadata, body, parse_errors = parse_frontmatter(text)
        reason = _vault_exclusion(path, vault_root)
        file_manifest.append(
            {
                "source_relative_path": relative,
                "file_sha256": source_sha256,
                "source_role": reason or "knowledge_note",
            }
        )

        if reason:
            item = {
                "source_relative_path": relative,
                "file_sha256": source_sha256,
                "reason": reason,
                "parse_errors": parse_errors,
            }
            if reason == "template":
                template_count += 1
                item.update(_template_validation(metadata, parse_errors))
            excluded.append(item)
            continue

        if parse_errors:
            issue = {
                "code": "vault_frontmatter_invalid",
                "severity": "needs_review",
                "source_relative_path": relative,
                "details": parse_errors,
            }
            quality_issues.append(issue)
            excluded.append(
                {
                    "source_relative_path": relative,
                    "file_sha256": source_sha256,
                    "reason": "parse_error",
                    "parse_errors": parse_errors,
                    "schema_valid": False,
                }
            )
            continue

        item_type = str(metadata.get("類型", "")).strip()
        title_field = TITLE_FIELDS.get(item_type)
        title = str(metadata.get(title_field, "") if title_field else "").strip()
        title = title or _first_heading(body) or path.stem
        source_status = str(metadata.get("狀態", "")).strip()
        records.append(
            {
                "record_kind": "obsidian_note",
                "source_relative_path": relative,
                "file_sha256": source_sha256,
                "source_status": source_status,
                "mapped_status": map_source_status(source_status),
                "publication_allowed": False,
                "requires_human_review": True,
                "title": title,
                "type": item_type or "未分類",
                "metadata": metadata,
                "evidence_metadata": {
                    field: metadata[field]
                    for field in EVIDENCE_FIELDS
                    if field in metadata
                },
                "body": body,
                "parse_errors": [],
            }
        )

    manifest_sha256 = hashlib.sha256(
        json.dumps(
            file_manifest,
            ensure_ascii=False,
            sort_keys=True,
            separators=(",", ":"),
        ).encode("utf-8")
    ).hexdigest()

    return {
        "source": {
            "kind": "obsidian_vault",
            "path": str(vault_root),
            "source_sha256": manifest_sha256,
            "source_record_count": len(records),
            "file_manifest": file_manifest,
            "scanned_at": utc_now(),
        },
        "summary": {
            "markdown_files": len(files),
            "publishable_records": len(records),
            "excluded_records": len(excluded),
            "template_files": template_count,
            "quality_issues": len(quality_issues),
        },
        "records": records,
        "excluded": excluded,
        "quality_issues": quality_issues,
    }


def _cell_column(reference: str) -> int:
    letters = "".join(character for character in reference if character.isalpha())
    result = 0
    for character in letters.upper():
        result = result * 26 + ord(character) - ord("A") + 1
    return result - 1


def _shared_strings(archive: zipfile.ZipFile) -> list[str]:
    if "xl/sharedStrings.xml" not in archive.namelist():
        return []
    root = ET.fromstring(archive.read("xl/sharedStrings.xml"))
    return [
        "".join(node.text or "" for node in item.iter(f"{{{XML_MAIN}}}t"))
        for item in root.findall("m:si", NS)
    ]


def _cell_value(cell: ET.Element, shared: list[str]) -> Any:
    cell_type = cell.attrib.get("t")
    if cell_type == "inlineStr":
        return "".join(
            node.text or "" for node in cell.iter(f"{{{XML_MAIN}}}t")
        )
    value_node = cell.find("m:v", NS)
    if value_node is None or value_node.text is None:
        return ""
    value = value_node.text
    if cell_type == "s":
        try:
            return shared[int(value)]
        except (IndexError, ValueError):
            return value
    if cell_type == "b":
        return value == "1"
    if cell_type in {"str", "e"}:
        return value
    if re.fullmatch(r"-?\d+", value):
        try:
            return int(value)
        except ValueError:
            return value
    if re.fullmatch(r"-?(?:\d+\.\d*|\d*\.\d+)(?:[Ee][+-]?\d+)?", value):
        try:
            return float(value)
        except ValueError:
            return value
    return value


def _worksheet_rows(
    archive: zipfile.ZipFile,
    worksheet_path: str,
    shared: list[str],
) -> Iterable[tuple[int, dict[int, Any]]]:
    root = ET.fromstring(archive.read(worksheet_path))
    for row in root.findall(".//m:sheetData/m:row", NS):
        values: dict[int, Any] = {}
        for cell in row.findall("m:c", NS):
            reference = cell.attrib.get("r", "")
            values[_cell_column(reference)] = _cell_value(cell, shared)
        yield int(row.attrib.get("r", "0")), values


def _clean_header(value: Any, index: int) -> str:
    header = str(value or "").strip()
    return header or f"column_{index + 1}"


def _normalise_row(headers: list[str], cells: dict[int, Any]) -> dict[str, Any]:
    row: dict[str, Any] = {}
    seen: dict[str, int] = {}
    for index, header in enumerate(headers):
        key = header
        if key in seen:
            seen[key] += 1
            key = f"{key}_{seen[key]}"
        else:
            seen[key] = 1
        value = cells.get(index, "")
        if key.lower() in BOOL_FIELDS and isinstance(value, (int, float)):
            value = bool(value)
        row[key] = value
    return row


def _sheet_kind(sheet_name: str, headers: list[str]) -> str:
    marker = f"{sheet_name} {' '.join(headers)}".lower()
    if "alias" in marker or "同義" in marker or "別名" in marker:
        return "budget_alias"
    if "trigger" in marker or "觸發" in marker:
        return "budget_trigger"
    if "bundle" in marker or "組合" in marker:
        return "budget_bundle"
    if "depend" in marker or "相依" in marker or "依存" in marker:
        return "budget_dependency"
    if "quantity" in marker or "數量" in marker:
        return "budget_quantity_rule"
    return "budget_item"


def _source_flag(row: dict[str, Any], name: str) -> bool:
    for key, value in row.items():
        if key.lower() != name:
            continue
        if isinstance(value, bool):
            return value
        return str(value).strip().lower() in {"1", "true", "yes", "y", "是"}
    return False


def _row_title(row: dict[str, Any]) -> str:
    candidates = (
        "unified_item_name",
        "canonical_item_name",
        "standard_work_item_name",
        "work_item_name",
        "item_name",
        "name",
        "統一工項名稱",
        "工項名稱",
        "項目名稱",
        "alias",
        "alias_text",
        "object_type",
        "trigger_name",
        "trigger_id",
        "bundle_name",
        "bundle_id",
        "dependency_name",
        "dependency_id",
        "dependency_rule_id",
        "rule_name",
        "rule_id",
        "quantity_rule_id",
        "puzzle_object_type",
        "mapping_id",
    )
    lowered = {key.lower(): value for key, value in row.items()}
    for candidate in candidates:
        value = lowered.get(candidate.lower())
        if str(value or "").strip():
            return str(value).strip()
    return ""


def _price_values(row: dict[str, Any]) -> tuple[Any, Any]:
    minimum = None
    maximum = None
    for key, value in row.items():
        marker = key.lower().replace(" ", "_")
        if "price" in marker or "價格" in marker or "單價" in marker:
            if "min" in marker or "最低" in marker:
                minimum = value
            if "max" in marker or "最高" in marker:
                maximum = value
    return minimum, maximum


def _find_header(rows: list[tuple[int, dict[int, Any]]]) -> int:
    best_index = 0
    best_score = -1
    hints = {
        "id",
        "name",
        "item",
        "alias",
        "trigger",
        "rule",
        "統一",
        "工項",
        "名稱",
        "規則",
    }
    for index, (_, cells) in enumerate(rows[:20]):
        values = [str(value or "").strip() for value in cells.values()]
        nonempty = sum(bool(value) for value in values)
        text = " ".join(values).lower()
        hint_score = sum(1 for hint in hints if hint in text)
        score = nonempty + hint_score * 5
        if score > best_score:
            best_score = score
            best_index = index
    return best_index


def _workbook_sheets(
    archive: zipfile.ZipFile,
) -> list[tuple[str, str]]:
    workbook = ET.fromstring(archive.read("xl/workbook.xml"))
    relationships = ET.fromstring(
        archive.read("xl/_rels/workbook.xml.rels")
    )
    relation_map = {
        relation.attrib["Id"]: relation.attrib["Target"]
        for relation in relationships
    }
    result: list[tuple[str, str]] = []
    for sheet in workbook.findall("m:sheets/m:sheet", NS):
        relation_id = sheet.attrib[f"{{{XML_REL}}}id"]
        target = relation_map[relation_id].replace("\\", "/").lstrip("/")
        if not target.startswith("xl/"):
            target = f"xl/{target}"
        result.append((sheet.attrib["name"], target))
    return result


def _even_sample(records: list[dict[str, Any]], count: int) -> list[dict[str, Any]]:
    if count <= 0:
        return []
    if count >= len(records):
        return records
    if count == 1:
        return [records[0]]
    return [
        records[round(index * (len(records) - 1) / (count - 1))]
        for index in range(count)
    ]


def scan_budget_inventory(
    budget_root: Path,
    *,
    master_path: Path | None = None,
) -> dict[str, Any]:
    budget_root = absolute_source_path(budget_root)
    master_path = absolute_source_path(master_path) if master_path else None
    supported = {".xlsx", ".md", ".json"}
    files: list[dict[str, Any]] = []
    counts = {"total": 0, "xlsx": 0, "md": 0, "json": 0}
    if budget_root.exists():
        for path in sorted(budget_root.rglob("*")):
            extension = path.suffix.lower()
            if not path.is_file() or extension not in supported:
                continue
            kind = extension.lstrip(".")
            if master_path and _path_key(path) == _path_key(master_path):
                source_role = "active_master_index"
            elif kind == "xlsx":
                source_role = "source_workbook"
            elif kind == "md":
                source_role = "source_note"
            else:
                source_role = "source_metadata"
            files.append(
                {
                    "record_kind": "budget_source_file",
                    "target_schema": "knowledge_staging",
                    "relative_path": path.relative_to(budget_root).as_posix(),
                    "file_sha256": file_sha256(path),
                    "kind": kind,
                    "extension": extension,
                    "source_role": source_role,
                    "size_bytes": path.stat().st_size,
                    "publication_allowed": False,
                    "direct_pricing_allowed": False,
                    "requires_manual_review": True,
                }
            )
            counts["total"] += 1
            counts[kind] += 1
    return {
        "source": {
            "kind": "budget_source_inventory",
            "path": str(budget_root),
            "scanned_at": utc_now(),
        },
        "summary": counts,
        "files": files,
    }


def _worksheet_role(sheet_name: str) -> str:
    marker = sheet_name.lower()
    if "reject" in marker or "拒絕" in marker or "退件" in marker:
        return "quarantine"
    if (
        "manifest" in marker
        or "validation" in marker
        or "report" in marker
        or "清單說明" in marker
        or "驗證" in marker
        or "報告" in marker
    ):
        return "control_evidence"
    return "staging_record"


def _classification_conflict(row: dict[str, Any], title: str) -> bool:
    lowered = {key.lower(): value for key, value in row.items()}
    conflicting = str(
        lowered.get("conflicting_unified_item_name")
        or lowered.get("conflicting_item_name")
        or ""
    ).strip()
    explicit = lowered.get("classification_conflict")
    explicit_true = (
        explicit is True
        or str(explicit or "").strip().lower() in {"1", "true", "yes", "是"}
    )
    return explicit_true or bool(conflicting and conflicting != title)


def _quality_issue(
    *,
    code: str,
    locator: dict[str, Any],
    description: str,
    severity: str = "warning",
    quarantined: bool = False,
    evidence: dict[str, Any] | None = None,
) -> dict[str, Any]:
    return {
        "code": code,
        "severity": severity,
        "description": description,
        "locator": locator,
        "evidence": evidence or {},
        "review_state": "pending_review",
        "next_reviewer_role": "pcm",
        "quarantined": quarantined,
    }


def scan_budget_master(
    workbook_path: Path,
    *,
    source_root: Path | None = None,
    limit: int | None = None,
    sample: int | None = None,
) -> dict[str, Any]:
    workbook_path = absolute_source_path(workbook_path)
    source_root = (
        absolute_source_path(source_root)
        if source_root
        else workbook_path.parent
    )
    try:
        relative_path = workbook_path.relative_to(source_root).as_posix()
    except ValueError:
        relative_path = workbook_path.name
    records: list[dict[str, Any]] = []
    quality_issues: list[dict[str, Any]] = []
    control_evidence: list[dict[str, Any]] = []
    sheet_counts: dict[str, int] = {}
    quarantined_rows = 0
    digest = file_sha256(workbook_path)

    with zipfile.ZipFile(workbook_path) as archive:
        shared = _shared_strings(archive)
        for sheet_name, worksheet_path in _workbook_sheets(archive):
            raw_rows = list(_worksheet_rows(archive, worksheet_path, shared))
            if not raw_rows:
                sheet_counts[sheet_name] = 0
                continue
            header_index = _find_header(raw_rows)
            header_number, header_cells = raw_rows[header_index]
            width = max(header_cells, default=-1) + 1
            headers = [
                _clean_header(header_cells.get(index), index)
                for index in range(width)
            ]
            kind = _sheet_kind(sheet_name, headers)
            worksheet_role = _worksheet_role(sheet_name)
            sheet_row_count = 0
            for row_number, cells in raw_rows[header_index + 1 :]:
                if not any(str(value or "").strip() for value in cells.values()):
                    continue
                source = _normalise_row(headers, cells)
                price_minimum, price_maximum = _price_values(source)
                source_flags = {
                    "is_budget_candidate": _source_flag(
                        source, "is_budget_candidate"
                    ),
                    "is_auto_selectable": _source_flag(
                        source, "is_auto_selectable"
                    ),
                    "requires_manual_review": _source_flag(
                        source, "requires_manual_review"
                    ),
                    "auto_trigger_allowed": _source_flag(
                        source, "auto_trigger_allowed"
                    ),
                }
                locator = {"sheet": sheet_name, "row": row_number}
                if worksheet_role == "control_evidence":
                    control_evidence.append(
                        {
                            "record_kind": "control_evidence",
                            "relative_path": relative_path,
                            "file_sha256": digest,
                            "worksheet_name": sheet_name,
                            "row_number": row_number,
                            "locator": locator,
                            "source": source,
                            "publication_allowed": False,
                            "requires_manual_review": True,
                        }
                    )
                    sheet_row_count += 1
                    continue
                if worksheet_role == "quarantine":
                    quality_issues.append(
                        _quality_issue(
                            code="source_reject",
                            locator=locator,
                            description="來源工作表已將此列列為退件，保留供人工釐清。",
                            quarantined=True,
                            evidence=source,
                        )
                    )
                    quarantined_rows += 1
                    sheet_row_count += 1
                    continue

                title = _row_title(source)
                row_quality_codes: list[str] = []
                if not title:
                    row_quality_codes.append("missing_required_identity")
                    quality_issues.append(
                        _quality_issue(
                            code="missing_required_identity",
                            locator=locator,
                            description="來源列缺少可追溯的名稱或識別欄位。",
                            evidence=source,
                        )
                    )
                if _classification_conflict(source, title):
                    row_quality_codes.append("classification_conflict")
                    quality_issues.append(
                        _quality_issue(
                            code="classification_conflict",
                            locator=locator,
                            description="來源列存在分類名稱衝突，需由 PCM 確認。",
                            evidence=source,
                        )
                    )
                records.append(
                    {
                        "record_kind": kind,
                        "title": title,
                        "source_relative_path": relative_path,
                        "relative_path": relative_path,
                        "file_sha256": digest,
                        "worksheet_name": sheet_name,
                        "row_number": row_number,
                        "locator": locator,
                        "source": source,
                        "quality_status": "pending_review",
                        "quality_issues": row_quality_codes,
                        "staging_guard": {
                            "lifecycle_status": "pending_review",
                            "publication_allowed": False,
                            "direct_pricing_allowed": False,
                            "auto_select_allowed": False,
                            "auto_trigger_allowed": False,
                            "requires_manual_review": True,
                            "price_classification": (
                                "historical_reference"
                                if price_minimum not in {None, ""}
                                or price_maximum not in {None, ""}
                                else "not_provided"
                            ),
                            "trigger_requirements": [
                                "object_status:new",
                                "scope_confirmed",
                                "human_review",
                            ],
                            "source_flags_overridden": source_flags,
                        },
                    }
                )
                sheet_row_count += 1
                if (
                    isinstance(price_minimum, (int, float))
                    and isinstance(price_maximum, (int, float))
                    and price_minimum > price_maximum
                ):
                    quality_issues.append(
                        _quality_issue(
                            code="price_range_reversed",
                            locator=locator,
                            description="來源列的價格範圍上下限順序需確認。",
                            evidence={
                                "price_min": price_minimum,
                                "price_max": price_maximum,
                            },
                        )
                    )
            sheet_counts[sheet_name] = sheet_row_count

    original_count = len(records)
    if sample is not None:
        records = _even_sample(records, sample)
    if limit is not None:
        records = records[: max(limit, 0)]

    return {
        "source": {
            "kind": "budget_master_workbook",
            "path": str(workbook_path),
            "file_sha256": digest,
            "scanned_at": utc_now(),
        },
        "summary": {
            "rows": len(records),
            "workbook_rows": original_count,
            "sheets": sheet_counts,
            "quality_issues": len(quality_issues),
            "control_evidence": len(control_evidence),
            "quarantined_rows": quarantined_rows,
            "selection": {"limit": limit, "sample": sample},
        },
        "records": records,
        "quality_issues": quality_issues,
        "control_evidence": control_evidence,
    }


def find_latest_budget_master(budget_root: Path) -> Path:
    candidates = sorted(
        budget_root.rglob("laibe_budget_ai_master_index.xlsx"),
        key=lambda path: (path.stat().st_mtime_ns, path.as_posix()),
        reverse=True,
    )
    if not candidates:
        raise FileNotFoundError(
            f"No laibe_budget_ai_master_index.xlsx under {budget_root}"
        )
    return candidates[0]


def build_payload(
    *,
    vault_result: dict[str, Any],
    budget_result: dict[str, Any],
    budget_inventory: dict[str, Any] | None = None,
) -> dict[str, Any]:
    inventory = budget_inventory or {
        "source": None,
        "summary": {"total": 0, "xlsx": 0, "md": 0, "json": 0},
        "files": [],
    }
    control_evidence = budget_result.get("control_evidence", [])
    vault_source = vault_result.get("source", {})
    budget_source = budget_result.get("source", {})
    source_manifest = inventory.get("files", [])
    active_master = next(
        (
            source
            for source in source_manifest
            if source.get("source_role") == "active_master_index"
        ),
        {},
    )
    budget_source_sha256 = (
        active_master.get("file_sha256")
        or budget_source.get("file_sha256")
        or "0" * 64
    )
    budget_source_locator = (
        active_master.get("relative_path")
        or budget_source.get("path")
        or "knowledge-staging-source"
    )
    vault_quality_issues = [
        {**issue, "source_group": "obsidian"}
        for issue in vault_result["quality_issues"]
    ]
    budget_quality_issues = [
        {**issue, "source_group": "budget_master"}
        for issue in budget_result["quality_issues"]
    ]
    vault_record_kinds = sorted(
        {
            str(record.get("record_kind"))
            for record in vault_result["records"]
            if record.get("record_kind")
        }
    ) or ["obsidian_note"]
    budget_record_kinds = sorted(
        {
            str(record.get("record_kind"))
            for record in budget_result["records"]
            if record.get("record_kind")
        }
    )
    return {
        "schema_version": "knowledge_staging.v1",
        "generated_at": utc_now(),
        "policy": {
            "one_way_import": True,
            "source_approved_requires_studio_review": True,
            "direct_pricing_allowed": False,
            "source_auto_flags_are_publication_permission": False,
            "trigger_requirements": [
                "object_status:new",
                "scope_confirmed",
                "human_review",
            ],
        },
        "summary": {
            "vault": vault_result["summary"],
            "budget": budget_result["summary"],
            "budget_inventory": inventory["summary"],
            "record_count": len(vault_result["records"])
            + len(budget_result["records"]),
            "quality_issue_count": len(vault_result["quality_issues"])
            + len(budget_result["quality_issues"]),
            "control_evidence_count": len(control_evidence),
        },
        "records": vault_result["records"] + budget_result["records"],
        "excluded": vault_result["excluded"],
        "source_manifest": source_manifest,
        "control_evidence": control_evidence,
        "quality_issues": vault_quality_issues + budget_quality_issues,
        "source_groups": [
            {
                "group_key": "obsidian",
                "source_kind": "obsidian",
                "record_kinds": vault_record_kinds,
                "source_locator": vault_source.get("path") or "obsidian-vault",
                "source_sha256": vault_source.get("source_sha256") or "0" * 64,
                "source_record_count": len(vault_result["records"]),
                "files": vault_source.get("file_manifest", []),
                "control_evidence": [],
                "summary": vault_result["summary"],
            },
            {
                "group_key": "budget_master",
                "source_kind": "budget_master",
                "record_kinds": budget_record_kinds,
                "source_locator": budget_source_locator,
                "source_sha256": budget_source_sha256,
                "source_record_count": len(budget_result["records"]),
                "files": source_manifest,
                "control_evidence": control_evidence,
                "summary": budget_result["summary"],
            },
        ],
        "sources": [
            source
            for source in (
                vault_result["source"],
                inventory["source"],
                budget_result["source"],
            )
            if source
        ],
    }


def write_payload(
    payload: dict[str, Any],
    output_path: Path,
    *,
    overwrite: bool = False,
) -> None:
    output_path = absolute_source_path(output_path)
    if output_path.exists() and not overwrite:
        raise FileExistsError(f"Output already exists: {output_path}")
    output_path.parent.mkdir(parents=True, exist_ok=True)
    if output_path.suffix.lower() == ".ndjson":
        with output_path.open("w", encoding="utf-8", newline="\n") as handle:
            for record in payload.get("records", []):
                handle.write(
                    json.dumps(
                        {"record_type": "record", "data": record},
                        ensure_ascii=False,
                    )
                    + "\n"
                )
            for issue in payload.get("quality_issues", []):
                handle.write(
                    json.dumps(
                        {"record_type": "quality_issue", "data": issue},
                        ensure_ascii=False,
                    )
                    + "\n"
                )
        return
    output_path.write_text(
        json.dumps(payload, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )


def build_ingest_envelope(
    payload: dict[str, Any],
    *,
    batch_records: list[dict[str, Any]],
    batch_index: int,
    batch_count: int,
    source_group: dict[str, Any] | None = None,
    batch_quality_issues: list[dict[str, Any]] | None = None,
) -> dict[str, Any]:
    if source_group is None:
        budget_source = next(
            (
                source
                for source in payload.get("sources", [])
                if source.get("kind") == "budget_master_workbook"
            ),
            {},
        )
        source_manifest = payload.get("source_manifest", [])
        active_master = next(
            (
                source
                for source in source_manifest
                if source.get("source_role") == "active_master_index"
            ),
            {},
        )
        source_kind = "budget_master"
        source_sha256 = (
            active_master.get("file_sha256")
            or budget_source.get("file_sha256")
            or "0" * 64
        )
        source_locator = (
            active_master.get("relative_path")
            or budget_source.get("path")
            or "knowledge-staging-source"
        )
        source_record_count = payload.get("summary", {}).get(
            "record_count", len(payload.get("records", []))
        )
        source_summary = payload.get("summary", {})
        control_evidence = payload.get("control_evidence", [])
        correlation_prefix = "a5-budget"
    else:
        source_kind = str(source_group["source_kind"])
        source_sha256 = str(source_group["source_sha256"])
        source_locator = str(source_group["source_locator"])
        source_record_count = int(source_group.get("source_record_count", 0))
        source_manifest = source_group.get("files", [])
        source_summary = source_group.get("summary", {})
        control_evidence = source_group.get("control_evidence", [])
        correlation_prefix = (
            "a5-obsidian" if source_kind == "obsidian" else "a5-budget"
        )
    correlation_key = f"{correlation_prefix}:{source_sha256[:24]}"
    idempotency_key = (
        f"{correlation_key}:chunk:{batch_index:04d}"
    )

    source_records: list[dict[str, Any]] = []
    budget_items: list[dict[str, Any]] = []
    derived_quality_issues: list[dict[str, Any]] = []
    source_keys_by_locator: dict[tuple[str, str, int], str] = {}
    for record in batch_records:
        relative_path = str(
            record.get("relative_path")
            or record.get("source_relative_path")
            or source_locator
        )
        worksheet_name = str(record.get("worksheet_name") or "")
        row_number = int(record.get("row_number") or 0)
        key_material = (
            f"{relative_path}|{worksheet_name}|{row_number}|"
            f"{record.get('file_sha256', '')}|{record.get('title', '')}"
        )
        key_hash = hashlib.sha256(key_material.encode("utf-8")).hexdigest()[:24]
        source_key = f"source:{key_hash}"
        source_keys_by_locator[
            (relative_path, worksheet_name, row_number)
        ] = source_key
        source_records.append(
            {
                "source_key": source_key,
                "source_status": (
                    record.get("source_status", "待確認")
                    if record.get("record_kind") == "obsidian_note"
                    else "待確認"
                ),
                "is_budget_candidate": False,
                "auto_trigger_allowed": False,
                "raw_payload": record,
            }
        )

        if record.get("record_kind") not in {
            "budget_item",
            "budget_price_reference",
        }:
            continue
        source = record.get("source", {})
        price_minimum, price_maximum = _price_values(source)
        negative_price_fields: dict[str, float | int] = {}
        if (
            isinstance(price_minimum, (int, float))
            and not isinstance(price_minimum, bool)
            and price_minimum < 0
        ):
            negative_price_fields["historical_price_low"] = price_minimum
            price_minimum = None
        if (
            isinstance(price_maximum, (int, float))
            and not isinstance(price_maximum, bool)
            and price_maximum < 0
        ):
            negative_price_fields["historical_price_high"] = price_maximum
            price_maximum = None
        if negative_price_fields:
            derived_quality_issues.append(
                {
                    "source_record_key": source_key,
                    "issue_code": "negative_historical_price",
                    "severity": "warning",
                    "description": (
                        "來源價格含負值，已保留原始證據並排除可用價格欄位，"
                        "需由 PCM 覆核。"
                    ),
                    "evidence": {
                        **negative_price_fields,
                        "locator": {
                            "sheet": worksheet_name,
                            "row": row_number,
                        },
                        "quarantined": True,
                    },
                    "next_reviewer_role": "pcm",
                }
            )
        unit = next(
            (
                source.get(field)
                for field in ("unit", "default_unit", "單位")
                if source.get(field) not in {None, ""}
            ),
            None,
        )
        category_code = next(
            (
                source.get(field)
                for field in (
                    "category_code",
                    "source_price_category",
                    "class_lv1",
                    "工種",
                )
                if source.get(field) not in {None, ""}
            ),
            None,
        )
        title = str(record.get("title") or "").strip()
        if not title:
            title = f"待確認工項 {worksheet_name}!{row_number}"
        budget_item = {
            "source_record_key": source_key,
            "source_item_uid": f"budget:{key_hash}",
            "unified_item_name": title,
            "is_budget_candidate": False,
            "auto_trigger_allowed": False,
            "historical_price_low": price_minimum,
            "historical_price_high": price_maximum,
            "price_currency": "TWD",
            "raw_payload": record,
        }
        if category_code is not None:
            budget_item["category_code"] = category_code
        if unit is not None:
            budget_item["unit"] = unit
        budget_items.append(budget_item)

    issue_records: list[dict[str, Any]] = []
    source_quality_issues = (
        payload.get("quality_issues", [])
        if batch_quality_issues is None
        else batch_quality_issues
    )
    if batch_index == 1:
        for issue in source_quality_issues:
            locator = issue.get("locator", {})
            relative_path = str(
                issue.get("relative_path")
                or issue.get("source_relative_path")
                or source_locator
            )
            source_record_key = source_keys_by_locator.get(
                (
                    relative_path,
                    str(locator.get("sheet") or ""),
                    int(locator.get("row") or 0),
                )
            )
            severity = str(issue.get("severity") or "warning").lower()
            if severity not in {"info", "warning", "error"}:
                severity = "warning"
            issue_records.append(
                {
                    "source_record_key": source_record_key,
                    "issue_code": issue.get("code", "needs_review"),
                    "severity": severity,
                    "description": issue.get(
                        "description",
                        "來源資料需要人工確認。",
                    ),
                    "evidence": {
                        **issue.get("evidence", {}),
                        "locator": locator,
                        "quarantined": bool(issue.get("quarantined")),
                    },
                    "next_reviewer_role": issue.get(
                        "next_reviewer_role",
                        "pcm",
                    ),
                }
            )
    issue_records.extend(derived_quality_issues)

    return {
        "schema_version": payload.get("schema_version"),
        "idempotency_key": idempotency_key,
        "correlation_key": correlation_key,
        "source_manifest": {
            "source_kind": source_kind,
            "source_locator": source_locator,
            "source_sha256": source_sha256,
            "source_record_count": source_record_count,
            "chunk_index": batch_index,
            "chunk_count": batch_count,
            "notes": "單向匯入，所有內容均須人工覆核。",
            "generated_at": payload.get("generated_at"),
            "summary": source_summary,
            "files": source_manifest,
            "control_evidence": control_evidence,
        },
        "records": source_records,
        "budget_items": budget_items,
        "woodwork_candidates": [],
        "quality_issues": issue_records,
    }


def build_ingest_envelopes(
    payload: dict[str, Any],
    *,
    batch_size: int,
) -> list[dict[str, Any]]:
    if batch_size < 1:
        raise ValueError("batch_size must be at least 1")

    source_groups = payload.get("source_groups", [])
    if not source_groups:
        records = payload.get("records", [])
        batches = [
            records[index : index + batch_size]
            for index in range(0, len(records), batch_size)
        ] or [[]]
        return [
            build_ingest_envelope(
                payload,
                batch_records=batch,
                batch_index=index,
                batch_count=len(batches),
            )
            for index, batch in enumerate(batches, 1)
        ]

    envelopes: list[dict[str, Any]] = []
    records = payload.get("records", [])
    quality_issues = payload.get("quality_issues", [])
    for source_group in source_groups:
        group_key = source_group.get("group_key")
        record_kinds = set(source_group.get("record_kinds", []))
        group_records = [
            record
            for record in records
            if record.get("record_kind") in record_kinds
        ]
        group_quality_issues = [
            issue
            for issue in quality_issues
            if issue.get("source_group") == group_key
        ]
        batches = [
            group_records[index : index + batch_size]
            for index in range(0, len(group_records), batch_size)
        ] or [[]]
        envelopes.extend(
            build_ingest_envelope(
                payload,
                batch_records=batch,
                batch_index=index,
                batch_count=len(batches),
                source_group=source_group,
                batch_quality_issues=group_quality_issues,
            )
            for index, batch in enumerate(batches, 1)
        )
    return envelopes


def post_payload(
    payload: dict[str, Any],
    *,
    endpoint: str,
    jwt_environment_variable: str,
    batch_size: int,
) -> dict[str, Any]:
    token = os.environ.get(jwt_environment_variable)
    if not token:
        raise RuntimeError(
            f"Missing token in environment variable {jwt_environment_variable}"
        )
    envelopes = build_ingest_envelopes(payload, batch_size=batch_size)
    responses: list[dict[str, Any]] = []
    for index, envelope in enumerate(envelopes, 1):
        body = json.dumps(
            envelope,
            ensure_ascii=False,
        ).encode("utf-8")
        request = urllib.request.Request(
            endpoint,
            data=body,
            method="POST",
            headers={
                "Authorization": f"Bearer {token}",
                "Content-Type": "application/json; charset=utf-8",
            },
        )
        try:
            with urllib.request.urlopen(request, timeout=60) as response:
                response_text = response.read().decode("utf-8")
                responses.append(
                    {
                        "batch": index,
                        "source_kind": envelope["source_manifest"]["source_kind"],
                        "chunk_index": envelope["source_manifest"]["chunk_index"],
                        "chunk_count": envelope["source_manifest"]["chunk_count"],
                        "status": response.status,
                        "response": (
                            json.loads(response_text) if response_text else {}
                        ),
                    }
                )
        except urllib.error.HTTPError as error:
            raise RuntimeError(
                f"Upload batch {index} failed with HTTP {error.code}"
            ) from error
    return {"batches": responses}


def _argument_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description="Prepare one-way knowledge staging records."
    )
    parser.add_argument("--vault", type=Path, required=True)
    budget = parser.add_mutually_exclusive_group(required=True)
    budget.add_argument("--budget-root", type=Path)
    budget.add_argument("--budget-master", type=Path)
    parser.add_argument("--output", type=Path)
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--limit", type=int)
    parser.add_argument("--sample", type=int)
    parser.add_argument("--force", action="store_true")
    parser.add_argument("--endpoint")
    parser.add_argument(
        "--jwt-env",
        default="LAIBE_KNOWLEDGE_INGEST_JWT",
        help="Environment variable containing the short-lived bearer token.",
    )
    parser.add_argument("--post-batch-size", type=int, default=500)
    return parser


def main(argv: list[str] | None = None) -> int:
    args = _argument_parser().parse_args(argv)
    if not args.dry_run and args.output is None and not args.endpoint:
        raise SystemExit("--output or --endpoint is required unless --dry-run")
    workbook = (
        args.budget_master
        if args.budget_master
        else find_latest_budget_master(args.budget_root)
    )
    budget_root = args.budget_root or workbook.parent
    vault_result = scan_vault(args.vault)
    budget_inventory = scan_budget_inventory(
        budget_root,
        master_path=workbook,
    )
    budget_result = scan_budget_master(
        workbook,
        source_root=budget_root,
        limit=args.limit,
        sample=args.sample,
    )
    payload = build_payload(
        vault_result=vault_result,
        budget_result=budget_result,
        budget_inventory=budget_inventory,
    )

    if args.dry_run:
        print(json.dumps(payload["summary"], ensure_ascii=False, indent=2))
        return 0
    if args.output:
        source_keys = {_path_key(args.vault), _path_key(workbook)}
        if _path_key(args.output) in source_keys:
            raise SystemExit("Output must not overwrite a source path")
        write_payload(payload, args.output, overwrite=args.force)
    if args.endpoint:
        result = post_payload(
            payload,
            endpoint=args.endpoint,
            jwt_environment_variable=args.jwt_env,
            batch_size=min(max(args.post_batch_size, 1), 1000),
        )
        print(json.dumps(result, ensure_ascii=False, indent=2))
    else:
        print(json.dumps(payload["summary"], ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    sys.exit(main())
