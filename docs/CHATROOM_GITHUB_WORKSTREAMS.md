# CHATROOM_GITHUB_WORKSTREAMS.md

## Purpose

Map LaiBE chatrooms to scoped GitHub workstreams.

All construction work should happen on a scoped branch and finish with a PR.

## 網站主流程 / 網頁修改

- 負責什麼：landing、onboarding、header、CTA、routing、page formalization、頁面主流程。
- 不能碰什麼：budget core、plan-puzzle core、payment / escrow / listing fee、未授權新頁面。
- 對應 branch：`site/page-formalization`
- 完成後要開 PR。

## 平面拼圖

- 負責什麼：preview_floor_plan page UI、canvas tool hierarchy、Plancraft+ adapter candidate flow。
- 不能碰什麼：正式估價輸出、Excel / PDF、payment、未授權 production adapter。
- 對應 branch：`plancraft/page-ui`
- 對應 branch：`plancraft/adapter`
- 完成後要開 PR。

## 原物料採購與倉儲

- 負責什麼：RawCatalogSource、RawCatalogItem、Candidate、risk_flags、review queue、handoff proposal。
- 不能碰什麼：formal price、PricingRule、BudgetEstimateLine.unit_price、renderer、frontend、payment。
- 對應 branch：`warehouse/raw-candidate`
- 完成後要開 PR。

## 配件倉庫：工法與規格

- 負責什麼：MethodSpecCatalog、MethodRecipe、MaterialSpec、LaborRule、NoteTemplate、UnitConversion、validators。
- 不能碰什麼：renderer / output、raw warehouse、frontend、formal budget engine changes、payment。
- 對應 branch：`warehouse/method-spec`
- 完成後要開 PR。

## 成品物流：預算表單輸出

- 負責什麼：BudgetOutputSnapshot、RenderedBudgetDocument、customer_view、internal_view、renderer gate、preflight、manifest、dry-run writer。
- 不能碰什麼：pricing decisions、budget engine rerun、material resolver、MethodSpecCatalog changes、frontend、payment。
- 對應 branch：`output/budget-documents`
- 完成後要開 PR。

## 模擬圖生成

- 負責什麼：LAIBE_VISUAL_SIM、AI style preview、prompt preview、sandbox image preview、image API spike governance。
- 不能碰什麼：正式施工圖宣稱、正式設計圖宣稱、真實案例宣稱、報價依據宣稱、完工保證。
- 對應 branch：`visual/simulation-governance`
- 完成後要開 PR。

## laibe_quote_factory

- 負責什麼：PriceRange review decision、manual override audit trail、candidate price stats、audit log、illegal override blocking。
- 不能碰什麼：formal price、PricingRule、BudgetEstimateLine、Supabase、migration、formal quotation。
- 對應 branch：`quote-factory/price-range-governance`
- 完成後要開 PR。

## Codex 指令優化

- 負責什麼：AGENTS.md、AI_RULES、handoff rules、task dispatch rules、Codex operating boundaries。
- 不能碰什麼：頁面施工、產品功能擴張、payment / escrow / listing fee、真 API。
- 對應 branch：`governance/codex-rules`
- 完成後要開 PR。

## LOGO / 品牌資產

- 負責什麼：logo SVG、品牌資產、正式可共用 visual assets。
- 不能碰什麼：頁面 routing、budget core、plan-puzzle core、payment、未授權品牌方向重做。
- 對應 branch：`brand/logo-assets`
- 完成後要開 PR。

## 審查官聊天室

- 負責什麼：審查 Codex 結果、scope compliance、file changes、安全邊界、規則遵守。
- 不能碰什麼：施工、產品方向、頁面重設計、新功能提案、business logic。
- 對應 branch：none
- 說明：只審查 Codex 結果，不施工、不改產品方向。
