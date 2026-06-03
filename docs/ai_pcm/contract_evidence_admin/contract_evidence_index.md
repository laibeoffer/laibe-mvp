# Contract Evidence Index

## Purpose

本索引用於登錄 AI PCM 合約與證據資料。它只描述證據資料的來源、狀態、關聯與使用限制，不修改合約內容，也不作法律裁決。

## Current Initialization State

目前尚未登錄任何 verified 專案證據。

本初始化只建立索引欄位與狀態規則；不得把此文件視為已有正式證據。

## Required Fields

| Field | Required | Description |
|---|---:|---|
| `evidence_id` | Yes | 全域唯一證據 ID。 |
| `evidence_type` | Yes | 合約主文、附件、預算單、報價單、LINE 訊息等類型。 |
| `title` | Yes | 人類可讀標題。 |
| `status` | Yes | 僅允許七種 evidence status。 |
| `source_uri` | Yes when linked or verified | 來源位置或 GitHub / 檔案追溯路徑。 |
| `source_of_truth` | Yes | GitHub main / PR / commit SHA 或 LOCAL_STATE 說明。 |
| `contract_reference` | When applicable | 對應合約條款、附件、頁碼或版本。 |
| `party_confirmation` | When applicable | 雙方確認狀態。 |
| `verification_summary` | Yes when verified | 驗證摘要。 |
| `formal_use_allowed` | Yes | 是否可作正式依據。 |
| `supersedes` | Optional | 被本證據取代的證據 ID。 |
| `superseded_by` | Optional | 取代本證據的證據 ID。 |
| `dispute_reason` | When disputed | 爭議原因。 |
| `void_reason` | When voided | 作廢原因。 |
| `unavailable_reason` | When unavailable | 無法取得原因。 |

## Evidence Type Registry

| Evidence Type | Description | Can Be Formal Basis |
|---|---|---:|
| `contract_main_text` | 合約主文。 | Yes, only if verified. |
| `contract_attachment` | 合約附件。 | Yes, only if verified. |
| `budget_sheet` | 預算單。 | Yes, only if verified and contract-linked. |
| `quotation` | 報價單。 | Yes, only if verified and accepted or contract-linked. |
| `work_item_detail` | 工項明細。 | Yes, only if verified. |
| `material_spec` | 材料規格。 | Yes, only if verified. |
| `method_scope` | 工法範圍。 | Yes, only if verified. |
| `exclusion` | 不包含項目。 | Yes, only if verified. |
| `assumption` | 假設條件。 | Yes, only if verified and not contradicted. |
| `plan_svg_quantity` | 平面圖、SVG、量體。 | Yes, only if verified. |
| `site_photo` | 現況照片。 | Support only unless contract-linked and verified. |
| `change_order` | 變更單。 | Yes, only if verified. |
| `acceptance_record` | 驗收紀錄。 | Yes, only if verified. |
| `payment_milestone` | 付款節點紀錄。 | Yes, only if verified; this Agent does not create payment. |
| `line_message` | LINE 訊息。 | No standalone contract authority. |
| `platform_message` | 平台訊息。 | Support only unless verified as bilateral confirmation. |
| `bilateral_confirmation` | 雙方確認紀錄。 | Yes, only if verified. |

## Initial Index

No project-specific evidence records have been registered during initialization.

Do not treat this policy pack as a verified contract fact. The first real evidence record must use the required fields above and must not be formal basis unless its status is `verified`.
