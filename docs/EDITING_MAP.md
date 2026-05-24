# EDITING_MAP.md

## Purpose

This is the short map for entering LaiBE MVP page edits quickly. It replaces long historical reports for day-to-day Codex work.

## Current Project Shape

- Root has no `package.json`; there is no confirmed root `npm run dev` app.
- Static MVP preview is served with `python -m http.server 8000` from `C:\laibe_project`.
- Main static pages live in `src/stitch_laibe_landing_onboarding/*/code.html`.
- Shared logo asset: `assets/logo/laibe_header.png`.
- Next / React portal prototype files live in `app/` and `components/`, but are not currently confirmed as the active runtime app.

## Primary Static MVP Flow

| Step | Page | File |
|---|---|---|
| Public landing | LaiBE landing | `src/stitch_laibe_landing_onboarding/laibe_landing_desktop/code.html` |
| Optional pre-entry | Start project | `src/stitch_laibe_landing_onboarding/start_project_entry/code.html` |
| Owner intake | AI onboarding | `src/stitch_laibe_landing_onboarding/onboard_ai_agent/code.html` |
| Floor plan | PlanCraft preview | `src/stitch_laibe_landing_onboarding/preview_floor_plan/code.html` |
| Budget draft | Budget generation | `src/stitch_laibe_landing_onboarding/preview_budget/code.html` |
| Budget edit | Budget finalization | `src/stitch_laibe_landing_onboarding/client_step_4_budget_finalization/code.html` |
| Budget document | Generated budget preview | `src/stitch_laibe_landing_onboarding/budget_document_preview/code.html` |
| Tender setup | Generated tender setting | `src/stitch_laibe_landing_onboarding/tender_setting/code.html` |
| Tender notice | Generated tender notice | `src/stitch_laibe_landing_onboarding/tender_notice/code.html` |
| Optional bid/award | Bid comparison | `src/stitch_laibe_landing_onboarding/bid_comparison_and_ai_summary/code.html` |

## Generator-Owned Outputs

Edit the generator first if the change should persist.

| Generator | Output |
|---|---|
| `generate_budget_preview.py` | `src/stitch_laibe_landing_onboarding/budget_document_preview/code.html` |
| `generate_client_doc_preview.py` | `src/stitch_laibe_landing_onboarding/client_document_selection/code.html` |
| `generate_payment.py` | `src/stitch_laibe_landing_onboarding/listing_fee_payment_unlock/code.html` |
| `generate_tender_notice.py` | `src/stitch_laibe_landing_onboarding/tender_notice/code.html` |
| `generate_tender_setting.py` | `src/stitch_laibe_landing_onboarding/tender_setting/code.html` |

## Next / React Prototype Areas

| Area | Files |
|---|---|
| Owner portal | `app/owner/*`, `components/layout/OwnerLayout.tsx`, owner sidebar/topbar/cards/forms |
| Vendor portal | `app/vendor/*`, `components/layout/VendorLayout.tsx`, vendor sidebar/topbar |
| PCM portal | `app/pcm/*`, `components/layout/PcmLayout.tsx`, PCM sidebar/topbar |
| Shared components | `components/*`, `src/services/*`, `src/lib/*`, `layout/globals.css` |

## Archived Reference

- Historical reports and long context are in `docs/archive_md/`.
- Old demos, backups, exports, and tools are in `_archive/cleanup_20260520/`.

