#!/usr/bin/env python3
"""Validate and stage the fixed A1 woodwork evidence mapping.

The importer is intentionally separate from the general budget importer. By
default it performs a local dry run. Network posting requires an explicit
endpoint plus environment variables containing a short-lived user JWT and the
project publishable key.
"""

from __future__ import annotations

import argparse
import base64
import copy
import hashlib
import json
import math
import os
import re
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path
from typing import Any, Iterable, Iterator, Mapping


SCHEMA_VERSION = "knowledge_staging.v1"
MANIFEST_VERSION = "a5_woodwork_ingest_manifest.v1"
TRANSFORM_VERSION = "woodwork_mapping.v1"
SOURCE_RELATIVE_PATH = Path(
    "outputs"
) / "budget_woodwork_items_20260710" / (
    "A1_woodwork_ingest_mapping_20260711.json"
)
REPO_ROOT = Path(__file__).parent.parent.parent
SOURCE_PATH = REPO_ROOT / SOURCE_RELATIVE_PATH
EXPECTED_SOURCE_SHA256 = (
    "d4f3d30750894b4c788823e5155255dfe288f923c87b7fc4172332c94cae0f7a"
)
EXPECTED_RECORD_COUNT = 42248
EXPECTED_BUCKET_COUNTS = {
    "eligible_candidate_reference": 11618,
    "requires_image_or_quote_confirmation": 27090,
    "not_grade_applicable": 1593,
    "needs_manual_review": 1947,
}
EXPECTED_DEMOLITION_CONFLICT_COUNT = 57
MAX_BATCH_SIZE = 1000
DEFAULT_BATCH_SIZE = 500
MAX_JWT_LIFETIME_SECONDS = 3600
ALLOWED_PUBLIC_GRADES = {None, "中級", "高級"}
DEMOLITION_TERMS = ("拆除", "打除", "拆卸")
DEMOLITION_PATTERN = re.compile("|".join(map(re.escape, DEMOLITION_TERMS)))
SOURCE_REF_FIELDS = (
    "source_workbook",
    "source_sheet",
    "source_row_number",
    "source_trade",
    "row_identity",
)
AUTHORIZATION_FLAGS = (
    "publication_authorized",
    "candidate_creation_authorized",
    "direct_pricing_allowed",
    "auto_trigger_allowed",
    "auto_select_allowed",
)


class WoodworkMappingValidationError(ValueError):
    """Raised when source or transport safety validation fails."""


class ValidatedMapping:
    __slots__ = (
        "source_path",
        "source_sha256",
        "task_id",
        "created_at",
        "records",
        "bucket_counts",
        "demolition_conflict_count",
    )

    def __init__(
        self,
        *,
        source_path: Path,
        source_sha256: str,
        task_id: str,
        created_at: str,
        records: tuple[dict[str, Any], ...],
        bucket_counts: dict[str, int],
        demolition_conflict_count: int,
    ) -> None:
        self.source_path = source_path
        self.source_sha256 = source_sha256
        self.task_id = task_id
        self.created_at = created_at
        self.records = records
        self.bucket_counts = bucket_counts
        self.demolition_conflict_count = demolition_conflict_count


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


def canonical_json_bytes(value: Any) -> bytes:
    return json.dumps(
        value,
        ensure_ascii=False,
        sort_keys=True,
        separators=(",", ":"),
    ).encode("utf-8")


def canonical_sha256(value: Any) -> str:
    return hashlib.sha256(canonical_json_bytes(value)).hexdigest()


def _nonempty_text(value: Any) -> bool:
    return isinstance(value, str) and bool(value.strip())


def _positive_integer(value: Any) -> bool:
    return isinstance(value, int) and not isinstance(value, bool) and value > 0


def _add_error(errors: list[str], message: str) -> None:
    if len(errors) < 100:
        errors.append(message)


def _declared_count(
    document: dict[str, Any],
    section: str,
    key: str,
) -> Any:
    value = document.get(section)
    return value.get(key) if isinstance(value, dict) else None


def validate_mapping_document(
    document: Any,
    *,
    source_sha256: str,
    source_path: Path | None = None,
    expected_record_count: int = EXPECTED_RECORD_COUNT,
    expected_bucket_counts: Mapping[str, int] = EXPECTED_BUCKET_COUNTS,
    expected_conflict_count: int = EXPECTED_DEMOLITION_CONFLICT_COUNT,
) -> ValidatedMapping:
    if not isinstance(document, dict):
        raise WoodworkMappingValidationError("mapping root must be an object")
    if not re.fullmatch(r"[0-9a-f]{64}", source_sha256):
        raise WoodworkMappingValidationError("source SHA-256 is invalid")

    errors: list[str] = []
    records = document.get("records")
    if not isinstance(records, list):
        raise WoodworkMappingValidationError("records must be an array")
    if len(records) != expected_record_count:
        _add_error(
            errors,
            f"record count {len(records)} != {expected_record_count}",
        )

    expected_buckets = dict(expected_bucket_counts)
    declared_buckets = document.get("bucket_counts")
    if declared_buckets != expected_buckets:
        _add_error(errors, "declared bucket_counts do not match the contract")
    for section, key in (
        ("input_counts", "total_extracted_rows"),
        ("input_counts", "rows_count"),
        ("quality_gates", "output_records_count"),
        ("quality_gates", "bucket_count_sum"),
    ):
        if _declared_count(document, section, key) != expected_record_count:
            _add_error(errors, f"{section}.{key} does not match record count")

    task_id = document.get("task_id")
    created_at = document.get("created_at")
    if not _nonempty_text(task_id):
        _add_error(errors, "task_id is required")
    if not _nonempty_text(created_at):
        _add_error(errors, "created_at is required")

    actual_buckets = {bucket: 0 for bucket in expected_buckets}
    mapping_ids: set[str] = set()
    row_identities: set[str] = set()
    demolition_conflicts = 0

    for index, record in enumerate(records, 1):
        prefix = f"records[{index}]"
        if not isinstance(record, dict):
            _add_error(errors, f"{prefix} must be an object")
            continue

        mapping_id = record.get("mapping_id")
        if not _nonempty_text(mapping_id):
            _add_error(errors, f"{prefix}.mapping_id is required")
        elif mapping_id in mapping_ids:
            _add_error(errors, f"duplicate mapping_id: {mapping_id}")
        else:
            mapping_ids.add(mapping_id)

        bucket = record.get("bucket")
        if bucket not in expected_buckets:
            _add_error(errors, f"{prefix}.bucket is unsupported")
        else:
            actual_buckets[bucket] += 1

        if record.get("pricing_trigger_policy") != "not_a_pricing_trigger":
            _add_error(
                errors,
                f"{prefix}.pricing_trigger_policy must be not_a_pricing_trigger",
            )

        source_ref = record.get("source_ref")
        if not isinstance(source_ref, dict):
            _add_error(errors, f"{prefix}.source_ref must be an object")
            source_ref = {}
        for field in SOURCE_REF_FIELDS:
            value = source_ref.get(field)
            if field == "source_row_number":
                if not _positive_integer(value):
                    _add_error(errors, f"{prefix}.source_ref.{field} is invalid")
            elif not _nonempty_text(value):
                _add_error(errors, f"{prefix}.source_ref.{field} is required")

        row_identity = source_ref.get("row_identity")
        if _nonempty_text(row_identity):
            if row_identity in row_identities:
                _add_error(errors, f"duplicate row_identity: {row_identity}")
            else:
                row_identities.add(row_identity)

        original_item = record.get("original_item")
        if not isinstance(original_item, dict):
            _add_error(errors, f"{prefix}.original_item must be an object")
            original_item = {}
        item_name = original_item.get("item_name")
        if not _nonempty_text(item_name):
            _add_error(errors, f"{prefix}.original_item.item_name is required")

        candidate_evidence = record.get("candidate_evidence")
        if not isinstance(candidate_evidence, dict):
            _add_error(errors, f"{prefix}.candidate_evidence must be an object")

        grade_fields = record.get("grade_fields")
        if not isinstance(grade_fields, dict):
            _add_error(errors, f"{prefix}.grade_fields must be an object")
            grade_fields = {}
        if grade_fields.get("public_grade_candidate") not in ALLOWED_PUBLIC_GRADES:
            _add_error(
                errors,
                f"{prefix}.public_grade_candidate is not allowed",
            )

        missing_info = record.get("missing_info_items")
        if not isinstance(missing_info, list):
            _add_error(errors, f"{prefix}.missing_info_items must be an array")

        next_use = record.get("next_use")
        if not isinstance(next_use, dict):
            _add_error(errors, f"{prefix}.next_use must be an object")
            next_use = {}
        if next_use.get("direct_pricing_allowed") is not False:
            _add_error(
                errors,
                f"{prefix}.next_use.direct_pricing_allowed must be false",
            )
        for field in (
            "usable_for_later_matching",
            "usable_for_evidence_retrieval",
        ):
            if not isinstance(next_use.get(field), bool):
                _add_error(errors, f"{prefix}.next_use.{field} must be boolean")
        if not _nonempty_text(next_use.get("pricing_trigger_note")):
            _add_error(
                errors,
                f"{prefix}.next_use.pricing_trigger_note is required",
            )

        if (
            bucket == "eligible_candidate_reference"
            and _nonempty_text(item_name)
            and DEMOLITION_PATTERN.search(item_name)
        ):
            demolition_conflicts += 1

    if actual_buckets != expected_buckets:
        _add_error(
            errors,
            f"actual bucket counts {actual_buckets} do not match {expected_buckets}",
        )
    if len(mapping_ids) != expected_record_count:
        _add_error(errors, "mapping_id uniqueness/count validation failed")
    if len(row_identities) != expected_record_count:
        _add_error(errors, "row_identity uniqueness/count validation failed")
    if demolition_conflicts != expected_conflict_count:
        _add_error(
            errors,
            (
                "demolition conflict count "
                f"{demolition_conflicts} != {expected_conflict_count}"
            ),
        )
    if errors:
        raise WoodworkMappingValidationError("; ".join(errors))

    return ValidatedMapping(
        source_path=absolute_source_path(source_path or SOURCE_PATH),
        source_sha256=source_sha256,
        task_id=str(task_id),
        created_at=str(created_at),
        records=tuple(records),
        bucket_counts=actual_buckets,
        demolition_conflict_count=demolition_conflicts,
    )


def load_and_validate_source(
    path: Path = SOURCE_PATH,
    *,
    expected_sha256: str = EXPECTED_SOURCE_SHA256,
    expected_record_count: int = EXPECTED_RECORD_COUNT,
    expected_bucket_counts: Mapping[str, int] = EXPECTED_BUCKET_COUNTS,
    expected_conflict_count: int = EXPECTED_DEMOLITION_CONFLICT_COUNT,
) -> ValidatedMapping:
    source_path = absolute_source_path(path)
    if not source_path.is_file():
        raise WoodworkMappingValidationError(
            f"source mapping does not exist: {source_path}"
        )
    actual_sha256 = file_sha256(source_path)
    if actual_sha256 != expected_sha256:
        raise WoodworkMappingValidationError(
            "source SHA-256 does not match the pinned mapping artifact"
        )
    try:
        with source_path.open("r", encoding="utf-8") as handle:
            document = json.load(handle)
    except (OSError, UnicodeError, json.JSONDecodeError) as error:
        raise WoodworkMappingValidationError(
            "source mapping is not valid UTF-8 JSON"
        ) from error
    return validate_mapping_document(
        document,
        source_sha256=actual_sha256,
        source_path=source_path,
        expected_record_count=expected_record_count,
        expected_bucket_counts=expected_bucket_counts,
        expected_conflict_count=expected_conflict_count,
    )


def _record_source_key(record: dict[str, Any]) -> str:
    return str(record["mapping_id"])


def _source_record(
    record: dict[str, Any],
    source_record_key: str,
) -> dict[str, Any]:
    return {
        "source_key": source_record_key,
        "source_status": "待確認",
        "is_budget_candidate": False,
        "auto_trigger_allowed": False,
        "raw_payload": record,
    }


def _structured_candidate(
    record: dict[str, Any],
    source_record_key: str,
) -> dict[str, Any]:
    source_next_use = record["next_use"]
    next_use = {
        "usable_for_later_matching": source_next_use[
            "usable_for_later_matching"
        ],
        "usable_for_evidence_retrieval": source_next_use[
            "usable_for_evidence_retrieval"
        ],
        "pricing_trigger_note": source_next_use["pricing_trigger_note"],
    }
    next_use.update({flag: False for flag in AUTHORIZATION_FLAGS})
    return {
        "source_record_key": source_record_key,
        "mapping_id": record["mapping_id"],
        "bucket": record["bucket"],
        "pricing_trigger_policy": record["pricing_trigger_policy"],
        "source_ref": copy.deepcopy(record["source_ref"]),
        "original_item": copy.deepcopy(record["original_item"]),
        "candidate_evidence": copy.deepcopy(record["candidate_evidence"]),
        "grade_fields": copy.deepcopy(record["grade_fields"]),
        "evidence_priority_used": record.get("evidence_priority_used"),
        "confidence_grade": record.get("confidence_grade"),
        "review_state_label": record.get("review_state"),
        "review_reason": record.get("review_reason"),
        "missing_info_items": list(record.get("missing_info_items") or []),
        "next_use": next_use,
    }


def _demolition_conflict_issue(
    record: dict[str, Any],
    source_record_key: str,
) -> dict[str, Any] | None:
    item_name = record["original_item"]["item_name"]
    if (
        record["bucket"] != "eligible_candidate_reference"
        or not DEMOLITION_PATTERN.search(item_name)
    ):
        return None
    matched_terms = [
        term for term in DEMOLITION_TERMS if term in item_name
    ]
    return {
        "source_record_key": source_record_key,
        "issue_code": "demolition_candidate_conflict",
        "severity": "warning",
        "description": (
            "項目含拆除類語意但來源 bucket 為可匹配候選，"
            "保留原分類並交由 PCM 覆核。"
        ),
        "evidence": {
            "mapping_id": record["mapping_id"],
            "row_identity": record["source_ref"]["row_identity"],
            "item_name": item_name,
            "source_bucket": record["bucket"],
            "matched_terms": matched_terms,
            "quarantined": True,
        },
        "next_reviewer_role": "pcm",
    }


def _idempotency_key(
    *,
    source_sha256: str,
    batch_size: int,
    chunk_index: int,
    chunk_sha256: str,
) -> str:
    transform_digest = hashlib.sha256(
        TRANSFORM_VERSION.encode("ascii")
    ).hexdigest()
    return (
        f"a5-woodwork:{source_sha256[:24]}:{transform_digest[:12]}:"
        f"b{batch_size}:c{chunk_index:04d}:{chunk_sha256[:16]}"
    )


def iter_envelopes(
    validated: ValidatedMapping,
    *,
    batch_size: int = DEFAULT_BATCH_SIZE,
) -> Iterator[dict[str, Any]]:
    if (
        not isinstance(batch_size, int)
        or isinstance(batch_size, bool)
        or not 1 <= batch_size <= MAX_BATCH_SIZE
    ):
        raise WoodworkMappingValidationError(
            f"batch_size must be between 1 and {MAX_BATCH_SIZE}"
        )

    chunk_count = math.ceil(len(validated.records) / batch_size)
    correlation_key = (
        f"a5-woodwork:{validated.source_sha256[:32]}:"
        f"{TRANSFORM_VERSION.rsplit('.', 1)[-1]}"
    )
    source_locator = str(absolute_source_path(validated.source_path))
    source_file = {
        "source_relative_path": SOURCE_RELATIVE_PATH.as_posix(),
        "file_sha256": validated.source_sha256,
        "source_role": "woodwork_evidence_mapping",
    }

    for offset in range(0, len(validated.records), batch_size):
        chunk_index = offset // batch_size + 1
        raw_records = validated.records[offset : offset + batch_size]
        chunk_sha256 = canonical_sha256(raw_records)
        source_records: list[dict[str, Any]] = []
        candidates: list[dict[str, Any]] = []
        issues: list[dict[str, Any]] = []

        for record in raw_records:
            source_record_key = _record_source_key(record)
            source_records.append(
                _source_record(record, source_record_key)
            )
            candidates.append(
                _structured_candidate(record, source_record_key)
            )
            issue = _demolition_conflict_issue(
                record,
                source_record_key,
            )
            if issue is not None:
                issues.append(issue)

        yield {
            "schema_version": SCHEMA_VERSION,
            "idempotency_key": _idempotency_key(
                source_sha256=validated.source_sha256,
                batch_size=batch_size,
                chunk_index=chunk_index,
                chunk_sha256=chunk_sha256,
            ),
            "correlation_key": correlation_key,
            "source_manifest": {
                "source_kind": "woodwork_mapping",
                "source_locator": source_locator,
                "source_sha256": validated.source_sha256,
                "source_record_count": len(validated.records),
                "chunk_index": chunk_index,
                "chunk_count": chunk_count,
                "notes": (
                    "木作 mapping 單向匯入 staging；不得直接發布、"
                    "建立預算候選或計價。"
                ),
                "generated_at": validated.created_at,
                "summary": {
                    "bucket_counts": validated.bucket_counts,
                    "demolition_candidate_conflicts": (
                        validated.demolition_conflict_count
                    ),
                    "chunk_sha256": chunk_sha256,
                    "transform_version": TRANSFORM_VERSION,
                },
                "files": [source_file],
            },
            "records": source_records,
            "budget_items": [],
            "woodwork_candidates": candidates,
            "quality_issues": issues,
        }


def build_local_manifest(
    validated: ValidatedMapping,
    *,
    batch_size: int = DEFAULT_BATCH_SIZE,
) -> dict[str, Any]:
    descriptors = []
    total_records = 0
    total_candidates = 0
    total_issues = 0
    for envelope in iter_envelopes(validated, batch_size=batch_size):
        record_count = len(envelope["records"])
        candidate_count = len(envelope["woodwork_candidates"])
        issue_count = len(envelope["quality_issues"])
        total_records += record_count
        total_candidates += candidate_count
        total_issues += issue_count
        descriptors.append(
            {
                "idempotency_key": envelope["idempotency_key"],
                "chunk_index": envelope["source_manifest"]["chunk_index"],
                "chunk_count": envelope["source_manifest"]["chunk_count"],
                "chunk_sha256": (
                    envelope["source_manifest"]["summary"]["chunk_sha256"]
                ),
                "record_count": record_count,
                "woodwork_candidate_count": candidate_count,
                "quality_issue_count": issue_count,
                "envelope_sha256": canonical_sha256(envelope),
            }
        )
    return {
        "manifest_version": MANIFEST_VERSION,
        "schema_version": SCHEMA_VERSION,
        "source": {
            "source_kind": "woodwork_mapping",
            "source_locator": str(validated.source_path),
            "source_sha256": validated.source_sha256,
            "record_count": len(validated.records),
            "bucket_counts": validated.bucket_counts,
        },
        "policy": {
            "one_way_to_staging": True,
            "publication_authorized": False,
            "candidate_creation_authorized": False,
            "direct_pricing_allowed": False,
            "auto_trigger_allowed": False,
            "formal_impact": "none",
        },
        "summary": {
            "batch_size": batch_size,
            "envelope_count": len(descriptors),
            "record_count": total_records,
            "woodwork_candidate_count": total_candidates,
            "quality_issue_count": total_issues,
            "demolition_candidate_conflict_count": (
                validated.demolition_conflict_count
            ),
        },
        "envelopes": descriptors,
    }


def _safe_output_path(path: Path, source_path: Path) -> Path:
    output_path = absolute_source_path(path)
    if _path_key(output_path) == _path_key(source_path):
        raise WoodworkMappingValidationError(
            "output must not overwrite the source mapping"
        )
    if output_path.exists():
        raise WoodworkMappingValidationError(
            f"output already exists: {output_path}"
        )
    output_path.parent.mkdir(parents=True, exist_ok=True)
    return output_path


def write_local_manifest(
    manifest: dict[str, Any],
    output_path: Path,
    *,
    source_path: Path,
) -> None:
    target = _safe_output_path(output_path, source_path)
    target.write_text(
        json.dumps(manifest, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )


def write_envelopes_ndjson(
    envelopes: Iterable[dict[str, Any]],
    output_path: Path,
    *,
    source_path: Path,
) -> None:
    target = _safe_output_path(output_path, source_path)
    with target.open("w", encoding="utf-8", newline="\n") as handle:
        for envelope in envelopes:
            handle.write(
                json.dumps(envelope, ensure_ascii=False, separators=(",", ":"))
                + "\n"
            )


def _decode_jwt_payload(token: str) -> dict[str, Any]:
    parts = token.split(".")
    if len(parts) != 3 or not all(parts):
        raise WoodworkMappingValidationError("JWT must use compact format")
    try:
        encoded = parts[1] + "=" * (-len(parts[1]) % 4)
        payload = json.loads(
            base64.urlsafe_b64decode(encoded.encode("ascii")).decode("utf-8")
        )
    except (ValueError, UnicodeError, json.JSONDecodeError) as error:
        raise WoodworkMappingValidationError(
            "JWT payload is not valid JSON"
        ) from error
    if not isinstance(payload, dict):
        raise WoodworkMappingValidationError("JWT payload must be an object")
    return payload


def validate_short_lived_jwt(
    token: str,
    *,
    now: int | None = None,
) -> int:
    payload = _decode_jwt_payload(token)
    issued_at = payload.get("iat")
    expires_at = payload.get("exp")
    if (
        not isinstance(issued_at, int)
        or isinstance(issued_at, bool)
        or not isinstance(expires_at, int)
        or isinstance(expires_at, bool)
    ):
        raise WoodworkMappingValidationError("JWT requires integer iat and exp")
    current_time = int(time.time()) if now is None else now
    if issued_at > current_time + 60:
        raise WoodworkMappingValidationError("JWT iat is in the future")
    if expires_at <= current_time:
        raise WoodworkMappingValidationError("JWT is expired")
    if expires_at - issued_at > MAX_JWT_LIFETIME_SECONDS:
        raise WoodworkMappingValidationError("JWT lifetime is not short-lived")
    if expires_at - current_time > MAX_JWT_LIFETIME_SECONDS:
        raise WoodworkMappingValidationError("JWT expiry is too far away")
    return expires_at


def validate_post_configuration(
    *,
    endpoint: str,
    jwt_environment_variable: str | None,
    publishable_key_environment_variable: str | None,
    environment: Mapping[str, str] = os.environ,
    now: int | None = None,
) -> tuple[str, str]:
    if not endpoint:
        raise WoodworkMappingValidationError("POST endpoint must be explicit")
    parsed = urllib.parse.urlparse(endpoint)
    local_http = parsed.scheme == "http" and parsed.hostname in {
        "127.0.0.1",
        "localhost",
        "::1",
    }
    if parsed.scheme != "https" and not local_http:
        raise WoodworkMappingValidationError(
            "POST endpoint must use HTTPS or local loopback HTTP"
        )
    if not jwt_environment_variable:
        raise WoodworkMappingValidationError(
            "--jwt-env is required with --endpoint"
        )
    token = environment.get(jwt_environment_variable)
    if not token:
        raise WoodworkMappingValidationError(
            f"JWT environment variable is empty: {jwt_environment_variable}"
        )
    if not publishable_key_environment_variable:
        raise WoodworkMappingValidationError(
            "--apikey-env is required with --endpoint"
        )
    publishable_key = environment.get(publishable_key_environment_variable)
    if (
        not publishable_key
        or len(publishable_key) > 4096
        or any(character.isspace() for character in publishable_key)
    ):
        raise WoodworkMappingValidationError(
            "publishable key environment variable is empty or invalid: "
            f"{publishable_key_environment_variable}"
        )
    validate_short_lived_jwt(token, now=now)
    return token, publishable_key


def post_envelopes(
    envelopes: Iterable[dict[str, Any]],
    *,
    endpoint: str,
    token: str,
    publishable_key: str,
) -> dict[str, Any]:
    responses: list[dict[str, Any]] = []
    for envelope in envelopes:
        body = canonical_json_bytes(envelope)
        request = urllib.request.Request(
            endpoint,
            data=body,
            method="POST",
            headers={
                "Authorization": f"Bearer {token}",
                "apikey": publishable_key,
                "Content-Type": "application/json; charset=utf-8",
            },
        )
        try:
            with urllib.request.urlopen(request, timeout=60) as response:
                response_text = response.read().decode("utf-8")
        except urllib.error.HTTPError as error:
            response_text = error.read().decode("utf-8", errors="replace")
            raise WoodworkMappingValidationError(
                (
                    "woodwork staging POST failed for chunk "
                    f"{envelope['source_manifest']['chunk_index']} "
                    f"with HTTP {error.code}: {response_text[:500]}"
                )
            ) from error
        except urllib.error.URLError as error:
            raise WoodworkMappingValidationError(
                "woodwork staging POST transport failed"
            ) from error
        responses.append(
            {
                "chunk_index": envelope["source_manifest"]["chunk_index"],
                "status": response.status,
                "response": json.loads(response_text) if response_text else {},
            }
        )
    return {"batches": responses}


def _argument_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description=(
            "Validate the fixed A1 woodwork mapping and prepare local staging "
            "envelopes. No network request is made by default."
        )
    )
    parser.add_argument(
        "--batch-size",
        type=int,
        default=DEFAULT_BATCH_SIZE,
    )
    parser.add_argument("--manifest-output", type=Path)
    parser.add_argument("--envelopes-output", type=Path)
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--endpoint")
    parser.add_argument(
        "--jwt-env",
        help=(
            "Explicit environment variable containing a short-lived JWT; "
            "required with --endpoint."
        ),
    )
    parser.add_argument(
        "--apikey-env",
        help=(
            "Explicit environment variable containing the project "
            "publishable key; required with --endpoint."
        ),
    )
    return parser


def main(argv: list[str] | None = None) -> int:
    args = _argument_parser().parse_args(argv)
    if args.dry_run and args.endpoint:
        raise WoodworkMappingValidationError(
            "--dry-run cannot be combined with --endpoint"
        )

    token = None
    publishable_key = None
    if args.endpoint:
        token, publishable_key = validate_post_configuration(
            endpoint=args.endpoint,
            jwt_environment_variable=args.jwt_env,
            publishable_key_environment_variable=args.apikey_env,
        )
    elif args.jwt_env or args.apikey_env:
        raise WoodworkMappingValidationError(
            "--jwt-env and --apikey-env are only accepted with --endpoint"
        )

    validated = load_and_validate_source(SOURCE_PATH)
    manifest = build_local_manifest(
        validated,
        batch_size=args.batch_size,
    )

    if args.manifest_output:
        write_local_manifest(
            manifest,
            args.manifest_output,
            source_path=validated.source_path,
        )
    if args.envelopes_output:
        write_envelopes_ndjson(
            iter_envelopes(validated, batch_size=args.batch_size),
            args.envelopes_output,
            source_path=validated.source_path,
        )
    if args.endpoint:
        result = post_envelopes(
            iter_envelopes(validated, batch_size=args.batch_size),
            endpoint=args.endpoint,
            token=str(token),
            publishable_key=str(publishable_key),
        )
        print(json.dumps(result, ensure_ascii=False, indent=2))
    else:
        print(json.dumps(manifest["summary"], ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    try:
        sys.exit(main())
    except WoodworkMappingValidationError as error:
        print(f"validation failed: {error}", file=sys.stderr)
        sys.exit(2)
