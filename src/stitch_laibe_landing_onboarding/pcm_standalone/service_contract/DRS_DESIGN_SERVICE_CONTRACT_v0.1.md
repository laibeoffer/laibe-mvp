# 萊比 DRS 設計案件治理資訊服務契約

版本：v0.1 候選草案

法務狀態：`LAWYER_FINAL_REVIEW_REQUIRED`

商業政策狀態：設計費變更後之未開始階段計價方式為 `OWNER_POLICY_CONFIRMATION_REQUIRED`

> 本文件為設計案件專用候選契約。完成律師、消費者保護、個人資料、電子簽章及室內裝修專業資格審閱前，不得作為可直接簽署之法律定稿。

案件編號：`{{CASE_ID}}`

DRS 服務契約編號：`{{DRS_SERVICE_CONTRACT_ID}}`

DRS 服務契約版本：`{{DRS_SERVICE_CONTRACT_VERSION}}`

契約產生時間：`{{DRS_CONTRACT_GENERATED_AT}}`

---

## 第一條　契約當事人

立契約人如下：

### 一、甲方：業主／設計需求方

- 甲方識別碼：`{{OWNER_ID}}`
- 姓名／名稱：`{{OWNER_LEGAL_NAME}}`
- 身分證字號／統一編號：`{{OWNER_ID_NUMBER}}`
- 聯絡電話：`{{OWNER_PHONE}}`
- 電子郵件：`{{OWNER_EMAIL}}`
- 地址：`{{OWNER_ADDRESS}}`
- 本次交易身分：`{{OWNER_TRANSACTION_CAPACITY}}`（`CONSUMER`／`BUSINESS`／`UNRESOLVED`）

以下稱「甲方」。

甲方是否屬消費者，依其交易目的及適用法令判斷，不因欄位選擇、帳號類型或本契約文字而被預先排除。若為消費關係，甲方依法享有之強制性權利不受影響。

### 二、服務方：LaiBE DRS 服務方

- 服務方識別碼：`{{SERVICE_PROVIDER_ID}}`
- 正式名稱：`{{SERVICE_PROVIDER_LEGAL_NAME}}`
- 締約主體類型：`{{SERVICE_PROVIDER_ENTITY_TYPE}}`
- 統一編號／登記號碼：`{{SERVICE_PROVIDER_REGISTRATION_NUMBER}}`
- 負責人／代表人：`{{SERVICE_PROVIDER_REPRESENTATIVE}}`
- 聯絡電話：`{{SERVICE_PROVIDER_PHONE}}`
- 電子郵件：`{{SERVICE_PROVIDER_EMAIL}}`
- 地址：`{{SERVICE_PROVIDER_ADDRESS}}`

以下稱「服務方」。

### 三、案件設計方：不是本契約當事人

- 設計方識別碼：`{{DESIGNER_ID}}`
- 正式名稱：`{{DESIGNER_LEGAL_NAME}}`
- 登記／資格資料：`{{DESIGNER_REGISTRATION_NUMBER}}`
- 負責人／代表人：`{{DESIGNER_REPRESENTATIVE}}`

「案件設計方」指與甲方締結室內設計、空間設計或其他設計服務契約之設計服務提供者。案件設計方不是本 DRS 服務契約當然之契約當事人。

本契約不直接對案件設計方創設交稿、修改、時程、智慧財產權讓與、設計費請求或違約責任，也不直接變更甲方與案件設計方間契約。案件設計方之權利義務，以專案設計契約、其有效變更文件、三方協議或案件設計方另行作成之有效意思表示為準。

---

## 第二條　名詞定義

一、「DRS」：指 LaiBE Decision & Record System／裝潢決策系統，以 AI 輔助分析、服務方人工書面覆核、甲方最終決策及不可無痕覆蓋之案件紀錄，協助設計案件進行文件審查、差異整理、缺漏提示、版本追蹤與決策留痕。

二、「專案設計契約」：指由 `{{DESIGN_SERVICE_CONTRACT_ID}}`、`{{DESIGN_SERVICE_CONTRACT_VERSION}}`、`{{DESIGN_SERVICE_CONTRACT_SIGNED_AT}}` 及 `{{DESIGN_SERVICE_CONTRACT_SHA256}}` 共同識別，並由甲方與案件設計方正式成立之設計服務契約及其有效變更文件。

三、「SOURCE_EVIDENCE」：指可識別來源、版本及時間之專案設計契約、需求紀錄、圖說、3D 表現、材料／設備資訊、報價或預算資料、丈量資料、平台操作、指定通訊紀錄及其他合法可供審查資料。

四、「AI_PRELIMINARY」：指 AI 對 SOURCE_EVIDENCE 進行辨識、摘要、文件關聯、差異候選、缺件候選、矛盾候選或風險候選之初步分析；其本身不是正式 DRS 審查結果。

五、「HUMAN_REVIEW」：指服務方授權人工審查人員依可供審查資料，對 AI_PRELIMINARY、文件版本、明顯差異、缺漏、不明確事項及待確認事項所為之書面覆核。

六、「DRS_REVIEWED」或「DRS 正式書面審查結果」：指服務方依可供審查資料，完成 AI_PRELIMINARY 及 HUMAN_REVIEW 後形成之正式版本化書面紀錄。其結果得為 `PASSED_FOR_OWNER_DECISION`、`SUPPLEMENT_REQUIRED`、`NOT_PASSED`、`DISPUTED`、`INSUFFICIENT_EVIDENCE` 或 `EXTERNAL_PROFESSIONAL_REVIEW_REQUIRED`。

七、「程序與文件品質審查」：指就設計服務範圍、交付資料、版本、提交時間、已確認需求之對應、文件間明顯差異或矛盾、工程理解所需資訊之明顯缺漏、待補件事項及待甲方決策事項所為之書面審查與留痕。

八、「TOTAL_DESIGN_FEE」：指甲方與案件設計方依專案設計契約正式確認之設計服務總價。本案數值為 `{{TOTAL_DESIGN_FEE}}`。

九、「DRS_TOTAL_REVIEW_FEE」：指本契約之 DRS 設計審查總服務費，計算式為 `TOTAL_DESIGN_FEE × 10%`。本案數值為 `{{DRS_TOTAL_REVIEW_FEE}}`。

十、「DESIGN_DELIVERABLE_SCHEDULE」：指專案設計契約或其有效附件所定之本案實際設計階段、應交成果、格式、版本、時間及必要資訊清單，本案綁定值為 `{{DESIGN_DELIVERABLE_SCHEDULE}}`。

十一、「DESIGN_VERSION」：指可識別文件身分、類型、版本、發行時間、提交者、審查狀態、甲方確認及被取代版本之設計成果版本紀錄。

十二、「STAGE_CONFIRMED」：指甲方確認特定 DESIGN_VERSION 作為後續設計之目前基準，不表示不得依法或依約提出修改、異議或新版本，也不表示 DRS 已對設計品質、法規或可施工性作成保證。

十三、「DESIGN_CHANGE_REQUEST」：指甲方或依法／依約有權者針對已確認基準提出之修改請求；應另建案件事件，不得覆寫原確認紀錄。

十四、「DESIGN_SCOPE_CHANGE」：指設計空間、已確認配置、應交成果或其他專案設計契約範圍之重大變更；是否成立、費用及時程影響由甲方與案件設計方另行確認。

十五、「OWNER_OBJECTION」：指甲方就 DRS 正式書面審查結果提出具體異議、理由及可供檢視之佐證；原 DRS Review 不因異議而刪除或改寫。

十六、「OWNER_OVERRIDE」：指 DRS 結果不是 `PASSED_FOR_OWNER_DECISION` 時，甲方基於自身判斷，明示理由及風險後決定進入下一程序之單方決策；不表示案件設計方同意，亦不得改寫原 DRS 結果。

十七、「PARTY_AGREEMENT_OVERRIDE」：指甲方及案件設計方均有可驗證意思表示時成立之另行協議。僅有甲方陳述者，只能記為 `OWNER_REPORTED_PRIVATE_AGREEMENT`。

---

## 第三條　契約目的與 DRS 服務定位

甲方委託服務方提供設計案件之 DRS 案件治理資訊服務。本服務以專案設計契約、甲方需求紀錄、已確認設計版本、設計成果、報價或預算資料、平台紀錄及其他可供審查之書面證據為基礎，由 AI 輔助分析並經服務方人工覆核，提供設計階段之書面文件審查、差異整理、缺漏提示、版本追蹤、決策輔助及案件紀錄。

正式工作鏈為：

```text
SOURCE_EVIDENCE
→ AI_PRELIMINARY
→ HUMAN_REVIEW
→ DRS_REVIEWED
→ OWNER_DECISION
→ APPEND-ONLY RECORD
```

DRS 之核心責任為程序與文件品質審查，不是設計認證、現場服務或專業簽證。

本服務不提供設計業者媒合、採購競價、最低價排序或承攬機會分配，也不以價格或排名替甲方選定案件設計方。

永久判斷原則為：

```text
DRS DESIGN REVIEW
=
工程要怎麼做，有沒有足夠而一致的資料？
```

而不是判斷設計是否好看。

---

## 第四條　設計案件與資料基準

一、本案程序與文件審查之主要 source of truth 為專案設計契約及其有效變更文件。本 DRS 契約不得以平台欄位、甲方單方紀錄、服務方報告或 AI output 替代、改寫或擴張專案設計契約。

二、本案應綁定專案設計契約之 ID、版本、簽署時間與 SHA-256。任一必要識別值未解析、互相不一致或無法驗證時，服務方應標示 `CONTRACT_BINDING_INCOMPLETE`，不得將其當作已確認契約基準。

三、甲方與案件設計方之實際應交成果，以 `{{DESIGN_DELIVERABLE_SCHEDULE}}` 為準。DRS 不得自行增加圖說、格式、修改次數、交付期限或其他案件設計方義務。

四、同一事項存在多份資料時，服務方應保存各版本及來源，辨識目前有效版本與尚待確認之差異，不得無痕覆蓋舊版本。

五、平台外口頭、私訊、圖片或概念如未形成可驗證紀錄，只能標示為待確認或甲方陳述，不得假定案件設計方已同意。

---

## 第五條　DRS 設計審查服務內容

### 一、審查核心

DRS 不判斷設計成果之美感或藝術價值，而係依甲方與案件設計方已確認之設計需求、專案設計契約、圖說、版本、材料／設備資訊及其他可供審查文件，檢視設計成果是否已形成足供後續工程理解與執行之書面資訊，並就可能缺漏、矛盾、不明確或尚待確認之事項提出報告。

服務方主要檢視：

1. 是否存在約定資料及交付成果；
2. 資料是否完整且可識別來源、日期及版本；
3. 圖說與其他文件是否存在明顯不一致；
4. 目前有效版本是否清楚；
5. 已確認需求是否有對應資料；
6. 尺寸、材料、設備、安裝條件、工法或 detail 是否存在明顯空缺；
7. 3D 表現與正式圖說、材料表或其他工程依據間是否有需釐清差異；
8. 某項內容是否仍停留於口頭、圖片或概念階段；
9. 哪些修改、差異或未決事項需要甲方作成決策；
10. 哪些事項需要外部專業人員確認。

### 二、不提供美感或主觀設計判斷

DRS 不審查、評分或判斷：美不美、好不好看、高不高級、有沒有設計感、風格是否漂亮、配色是否美觀、比例是否符合個人審美、造型是否有創意、氛圍是否符合流行、材質搭配是否具有美感、案件設計方之藝術表現是否優秀，或甲方是否應該喜歡某一設計。

DRS 不產生美感評分、設計風格評分、AI 審美分數、設計師能力排名或美學優劣判斷；亦不取代甲方之個人審美決策、案件設計方之創作判斷或設計專業中的美學表現。

### 三、報告語言

DRS 報告應使用「可能不完整」、「待補充」、「待確認」、「資料不足」、「文件可能不一致」或「需外部專業確認」等程序及文件語言。得提出例如：

- 可能缺少施工細節；
- 目前圖說資訊不足；
- 需要補充尺寸、材料規格、設備型號或安裝條件；
- 需要補充節點圖；
- 不同圖面內容可能不一致；
- 目前版本與先前確認內容存在差異；
- 目前只有 3D 表現，尚未看到對應施工圖說；
- 資料不足，無法確認工程如何實際理解或執行。

DRS 不得以「不好看」、「比例不好」、「顏色不適合」、「造型不夠高級」、「設計不專業」或「建議改成另一種風格」作為審查結論。

本責任邊界為服務方在後續契約條文、對外介面說明、AI Prompt、人工審查及審查報告模板共同遵循之最低邊界；不得以產品文案、模型輸出、評分欄位或報告格式弱化或迴避。

### 四、不保證工程可執行性

DRS 僅依可供審查之書面資料，辨識可能影響工程理解、後續施工或案件決策之資訊缺漏、矛盾、不明確或待確認事項。DRS 不宣稱一定可以施工、工法正確、結構安全、符合法規、專業設計無誤或已取得必要簽證／許可。

---

## 第六條　AI 輔助與人工審查

一、AI 得進行 OCR、內容辨識、摘要、版本關聯、缺件候選、差異候選、矛盾候選與風險候選；AI_PRELIMINARY 必須標示資料來源、不確定性及待人工確認事項。

二、AI_PRELIMINARY 不得單獨形成正式 DRS 審查通過、甲方付款建議、專業核定、美感判斷或法律意見。

三、服務方授權人工審查人員應依可供審查資料覆核 AI_PRELIMINARY，形成具有 Review ID、版本、來源、結果、完成時間及可稽核審查人員紀錄之 DRS_REVIEWED。

四、服務方應區分 AI 初步分析、HUMAN_REVIEW、DRS_REVIEWED、案件設計方陳述及甲方決策，不得將各層混同。

五、DRS_REVIEWED 只表示目前書面資料與程序之審查結果；甲方仍保有最終決策權。

---

## 第七條　設計階段與交付成果

本案 DRS 設計審查分為下列四階段：

1. Stage 1：設計簽約；
2. Stage 2：3D 確認；
3. Stage 3：平面／系統圖交付；
4. Stage 4：細部圖交付。

各階段之名稱只作為 DRS 計價與審查節點。案件設計方在各階段實際應交成果、格式、日期與修改規則，仍以專案設計契約及 `{{DESIGN_DELIVERABLE_SCHEDULE}}` 為準。

各階段開始前，服務方應提供該階段之 DRS 審查費金額、最低必要審查資料及預定審查範圍。階段服務狀態應區分：

```text
DRS_STAGE_REVIEW_FEE_PAID
MINIMUM_REVIEW_MATERIAL_AVAILABLE
DRS_REVIEW_STARTED
DRS_REVIEW_COMPLETED
```

付費、資料可供審查、審查開始與審查完成是不同事件，不得混同。

---

## 第八條　設計費、DRS 審查費及付款方式

### 一、設計費比例

TOTAL_DESIGN_FEE 由甲方與案件設計方確認。本案設計費階段比例固定為：

| 階段 | 設計費比例 |
|---|---:|
| 設計簽約 | 20% |
| 3D 確認 | 20% |
| 平面／系統圖交付 | 20% |
| 細部圖交付 | 40% |
| 合計 | 100% |

對應 binding values 為：

```text
DESIGN_FEE_STAGE_1_RATE = 20%
DESIGN_FEE_STAGE_2_RATE = 20%
DESIGN_FEE_STAGE_3_RATE = 20%
DESIGN_FEE_STAGE_4_RATE = 40%
```

### 二、DRS 設計審查總服務費

DRS 設計審查總服務費率固定為 TOTAL_DESIGN_FEE 之 10%：

```text
DRS_DESIGN_REVIEW_RATE = 10%
DRS_TOTAL_REVIEW_FEE = TOTAL_DESIGN_FEE × 10%
```

### 三、各階段 DRS 審查費

各階段 DRS 審查費依設計費階段比例分配，並於服務方開始該階段正式審查前預收：

```text
Stage 1 = DRS_TOTAL_REVIEW_FEE × 20% = TOTAL_DESIGN_FEE × 2%
Stage 2 = DRS_TOTAL_REVIEW_FEE × 20% = TOTAL_DESIGN_FEE × 2%
Stage 3 = DRS_TOTAL_REVIEW_FEE × 20% = TOTAL_DESIGN_FEE × 2%
Stage 4 = DRS_TOTAL_REVIEW_FEE × 40% = TOTAL_DESIGN_FEE × 4%
```

```text
2% + 2% + 2% + 4% = TOTAL_DESIGN_FEE × 10%
```

服務方不得就相同階段及相同審查範圍重複計費。

### 四、先付費、後審查

每階段只有在 `DRS_STAGE_REVIEW_FEE_PAID` 與 `MINIMUM_REVIEW_MATERIAL_AVAILABLE` 均成立，且服務方建立開始紀錄後，才進入 DRS_REVIEW_START。服務方完成 AI_PRELIMINARY、HUMAN_REVIEW 及正式 DRS Review Record 後，始為 DRS_STAGE_SERVICE_COMPLETED。

### 五、設計費與 DRS 審查費分離

```text
DESIGN_FEE != DRS_REVIEW_FEE
```

設計費由甲方依專案設計契約支付案件設計方；DRS 審查費由甲方依本契約支付服務方。服務方不代收、不保管、不轉付、不控制、不扣留、不阻止或執行設計費。

### 六、設計費版本變更

甲方與案件設計方如正式調整 TOTAL_DESIGN_FEE，應建立 `DESIGN_FEE_VERSION`，保存原金額、新金額、生效時間、雙方確認及相關文件。

本 v0.1 所列候選政策為：「已完成階段不追溯重算；尚未開始階段依最新正式設計費版本計算，除甲方與服務方另有書面約定。」本政策須於 `{{DESIGN_FEE_ADJUSTMENT_POLICY_ACCEPTED_AT}}` 解析後始得納入可簽署版本；在此之前標示 `OWNER_POLICY_CONFIRMATION_REQUIRED`。

---

## 第九條　簽約階段審查

Stage 1 至少審查下列文件與程序事項：

1. 設計服務標的、範圍、案件地址、設計面積或計價基準；
2. TOTAL_DESIGN_FEE、設計費付款比例及付款條件；
3. 設計階段、預定交付成果及預定時程；
4. 雙方聯絡與確認方式；
5. 設計修改規則、包含之修改範圍及次數；
6. 額外修改或重大變更之處理方式；
7. 丈量、現況資料及尺寸基準責任；
8. 圖說版本、命名及交付格式；
9. 智慧財產權與設計成果使用權是否有約定；
10. 中止、終止、解除、已履行費用及退費約定；
11. 依法應由具資格專業人員處理之事項；
12. 其他明顯缺漏、矛盾或待確認事項。

DRS 只檢視相關條款是否存在、是否可識別及是否有明顯矛盾，不替甲方與案件設計方決定商業條件，也不替案件設計方新增義務。

---

## 第十條　3D 確認階段審查

Stage 2 以已確認需求、已確認平面配置、專案設計契約及目前 3D 版本為主要比對依據。

DRS 對 3D 的目的為：確認 3D 所呈現之重要設計內容，是否與甲方已確認之需求、空間配置及其他正式設計資料存在明顯差異；並辨識 3D 中已表達之重要工程內容，是否尚未在後續正式圖說、材料表或其他施工依據中形成清楚紀錄。

DRS 不審查 3D 之美感、風格、漂亮程度、藝術性、流行程度或創意優劣。

例如 3D 呈現整面懸浮電視櫃時，DRS 不評論懸浮效果是否漂亮；DRS 得檢視後續資料是否包含該櫃體之尺寸、位置、結構／固定相關資訊或必要 detail。

例如 3D 呈現特殊造型天花時，DRS 不評論其是否具有設計感；DRS 得指出尚未看到對應尺寸、標高、燈具位置或細部施工資料。

3D 原則上是設計溝通與視覺表達成果。是否可作為施工依據，以專案設計契約及正式圖說為準；DRS 不得將 3D 自動視為正式施工圖。

---

## 第十一條　平面／系統圖交付階段審查

Stage 3 依 `{{DESIGN_DELIVERABLE_SCHEDULE}}` 檢視本案實際約定之圖說，不自行假定固定清單。

DRS 檢視：

1. 約定圖說是否交付；
2. 圖號、圖名、版本及日期是否可識別；
3. 依約應有之主要尺寸是否標示；
4. 圖面間是否存在明顯版本衝突；
5. 已確認需求是否有對應；
6. 哪些圖說尚缺、哪些事項待確認；
7. 不同資料是否有明顯矛盾。

可能項目包括平面配置、隔間、天花、地坪、燈具／照明、插座／開關、給排水、空調及系統配置；只有專案設計契約或其有效附件列入者，才屬本案必要交付。

---

## 第十二條　細部圖交付階段審查

Stage 4 同樣依 `{{DESIGN_DELIVERABLE_SCHEDULE}}` 檢視實際約定成果。

可能項目包括立面、櫃體、天花細節、收邊、節點、材質、廚具、衛浴、系統櫃、木作、門窗及其他 detail drawings；DRS 不得自動假定每案皆須全部交付。

本階段主要比對：

```text
約定要交什麼 vs 實際交了什麼
目前有效版本 vs 前階段已確認內容
```

若某項重要內容只有概念名稱、3D 表現或材料名稱，而缺少依約應有之尺寸、規格、型號、安裝條件、節點或其他工程理解資訊，DRS 可以記為可能不完整或待補充；不得直接判定設計不專業或工程必然無法施工。

---

## 第十三條　設計版本與階段確認

每一重要設計成果至少應保存：

```text
document_id
document_type
version
issued_at
submitted_by
review_status
owner_confirmation
superseded_version
```

一、服務方不得無痕覆蓋舊 DESIGN_VERSION。更正、補充或新版本應以新增紀錄方式建立，並關聯被取代版本。

二、STAGE_CONFIRMED 只表示特定版本成為後續設計之目前基準。甲方如後續要求修改，應建立 DESIGN_CHANGE_REQUEST，不得改寫原確認時間或內容。

三、階段確認不表示甲方拋棄依法或依專案設計契約得主張之權利，也不表示 DRS 已對美感、專業適法性、結構安全、工法、品質或可施工性作成保證。

四、同一階段重新提交資料時，應形成新的 DRS Review 版本；原 Review、Objection、Override 及甲方決策均應保留。

---

## 第十四條　設計修改與範圍變更

一、本案包含之修改規則及次數，分別綁定 `{{INCLUDED_REVISION_RULE}}` 與 `{{INCLUDED_REVISION_COUNT}}`。DRS 不得自行固定所有設計案件之修改次數。

二、甲方提出 DESIGN_CHANGE_REQUEST 時，DRS 得記錄提出者、修改內容、提出時間、影響之版本、是否可能涉及追加設計費、是否可能影響時程及雙方確認狀態；DRS 不自行決定追加設計費或時程。

三、已確認格局大幅改變、新增設計空間、新增原契約未包含成果、已完成後要求重新設計，或其他實質範圍改變，可以記為 DESIGN_SCOPE_CHANGE。其是否成立及法律效果，仍由甲方與案件設計方依專案設計契約另行確認。

四、DESIGN_CHANGE_REQUEST、DESIGN_SCOPE_CHANGE 及另行協議均應新增案件紀錄，不得覆寫原契約、原版本或原確認。

---

## 第十五條　DRS Review、甲方異議及補件

一、DRS_REVIEWED 為 `PASSED_FOR_OWNER_DECISION` 時，只表示目前可供審查之文件、版本及程序，已達可供甲方作成該設計階段確認或付款決策之程度，不表示設計成果完全合格、設計費自動屆期或 DRS 命令甲方付款。

二、甲方同意 DRS 結果時，建立 `OWNER_DECISION = APPROVE`。甲方仍依專案設計契約及自身判斷決定是否確認設計階段或支付設計費。

三、甲方不同意 DRS 結果並提出少圖、版本不符、需求未反映、承諾未完成、交付格式問題或其他具體差異及佐證時，應建立 OWNER_OBJECTION。服務方得依情形標示 `NEEDS_RESPONSE`、`NEEDS_SUPPLEMENT`、`NEEDS_REVIEW` 或 `DISPUTED`；原 DRS Review 不得刪除或改寫。

四、DRS 結果為 `SUPPLEMENT_REQUIRED`、`NOT_PASSED`、`INSUFFICIENT_EVIDENCE` 或 `EXTERNAL_PROFESSIONAL_REVIEW_REQUIRED` 時，服務方應記載理由、缺漏、資料來源及下一步。補件後應建立新版本 Review，不得將原結果無痕改為通過。

五、DRS 已完成正式書面審查並通知結果後，甲方明示拒絕採用程序，且經合理提醒仍未提出具體理由或佐證者，僅表示 DRS 程序合作基礎可能失效。服務方或甲方得依本契約終止 DRS 設計案件治理服務；此結果不是設計成果自動確認，也不使設計費自動應付款。

---

## 第十六條　Owner Override 與雙方另行協議

一、甲方得就非 `PASSED_FOR_OWNER_DECISION` 之 DRS 結果建立 OWNER_OVERRIDE。每一 OWNER_OVERRIDE 應保存：

```text
DRS REVIEW: {{ORIGINAL_DRS_REVIEW_RESULT}}
OWNER DECISION: OVERRIDE
OWNER REASON: {{OWNER_OVERRIDE_REASON}}
OWNER EVIDENCE: {{OWNER_OVERRIDE_EVIDENCE}}
OVERRIDE_AT: {{OWNER_OVERRIDE_AT}}
```

二、OWNER_OVERRIDE 不表示案件設計方同意，不免除依法或依約應取得之專業確認，亦不得把原 DRS 結果改成 PASS。

三、只有甲方與案件設計方均有可驗證意思表示，才可建立 PARTY_AGREEMENT_OVERRIDE。僅有甲方陳述而無案件設計方之有效確認時，只能記為 OWNER_REPORTED_PRIVATE_AGREEMENT。

四、每一 Override 應關聯原 Review ID、版本及結果，保存作成人、理由、證據及時間；後續補件或新 Review 仍以新事件附加。

---

## 第十七條　設計費付款決策與責任邊界

```text
DRS REVIEW PASSED != DESIGN PAYMENT AUTOMATICALLY DUE
```

一、DRS Review 通過，只表示就目前可供審查文件、版本及程序而言，已達可供甲方作成該設計階段確認／付款決策之程度。

二、甲方是否應支付設計費、付款金額、期限、扣減、延後、提前或其他付款安排，依專案設計契約、有效變更文件及甲方最終決策辦理。

三、甲方提前付款、延後付款、少付、多付、私下調整付款方式或未等待 DRS Review 即付款，均屬甲方與案件設計方間之契約履行。服務方不控制、代付、阻止、保管或保證設計費。

四、前項責任分離不免除服務方就自身違反本契約、故意、重大過失、個人資料事件或依法不得排除之責任。

---

## 第十八條　丈量、現場與施工責任邊界

一、DRS 得檢視是否存在丈量資料、圖面是否標示尺寸、版本是否一致，以及文件間是否有明顯矛盾。

二、DRS 不到場丈量、不驗證隱蔽現況、不保證尺寸百分之百正確，也不保證圖說尺寸與現場完全一致。現場尺寸與設計基準資料之責任，依專案設計契約及實際提供資料認定。

三、DRS 不保證 3D 示意與完工成果完全一致，不保證材料實品與螢幕／圖片完全相同，不保證施工方依圖施工，也不保證實際施工品質、價格或工期。

四、設計圖與日後施工成果存在差異時，DRS 得整理設計版本、施工文件、變更、確認者及照片；不得直接判定案件設計方或施工服務提供者之法律責任。責任應依契約、專業鑑定或法律程序認定。

---

## 第十九條　法規及專業資格事項

一、一般設計溝通成果，與依法應由具資格專業人員執行之室內裝修設計、審查、簽證、申請、監造或其他法定業務，必須明確區分。

二、涉及結構安全、消防、建築法規、室內裝修法規、機電專業、防水工法、專業工程計算、依法應簽證事項或主管機關許可時，DRS 應標示 `EXTERNAL_PROFESSIONAL_REVIEW_REQUIRED`。

三、DRS 不自稱建築師、室內裝修業、專業設計技術人員、技師、法規審查機構、設計人或專業簽證者，也不取代依法具資格人員之責任。

四、DRS 對法規或專業資格之提示，只表示目前資料可能需要外部專業確認；不得自行作成適法性、結構安全、工法正確或主管機關核准之結論。

---

## 第二十條　案件紀錄與證據鏈

一、下列事項應以 append-only 方式形成 Case Event：設計成果提交、3D 提交／確認、圖說提交／審查、細部圖提交、甲方異議、OWNER_OVERRIDE、DESIGN_CHANGE_REQUEST、DESIGN_SCOPE_CHANGE、設計費付款狀態及其他重大事件。

二、每一事件至少保存：actor、time、case ID、action、source document、source version、current state、next owner/action，並關聯 `DESIGN_SERVICE_CONTRACT_ID`、`DRS_SERVICE_CONTRACT_ID` 及 `DESIGN_VERSION`。

三、一般留言、詢問、討論、草稿、未確認事項或 AI_PRELIMINARY，不當然構成正式確認、修改同意、設計費付款義務或其他法律效果。

四、在不牴觸個人資料依法更正、停止處理／利用、刪除或去識別化要求之範圍內，紀錄更正應以新增補充、版本或爭議註記處理，不得倒填或無痕覆寫原紀錄。依法必須刪除、限制處理或去識別化時，服務方應執行該處理；如法令允許且確有履約或法律保全必要，只保留不含已刪個資之最小處理紀錄，不得以 `APPEND_ONLY` 或 `SIGNED_CONTRACT_IMMUTABLE` 否定法定權利。

五、甲方或案件設計方對紀錄有異議時，得提出更正、補充或爭議註記。案件設計方未有效確認之甲方單方回填，只能作為甲方提供之案件資料。

---

## 第二十一條　電子文件及電子簽署

一、甲方與服務方同意以電子文件及實際選用之電子同意或電子簽章方式締結本契約，並同意於可識別簽署人、完整保存及日後取出查驗之範圍內，將電子紀錄作為意思表示及契約證明。

二、服務方應於採用電子形式前，以合理期間及方式提供甲方反對機會，並告知未反對之效果。採用電子形式之同意時間、反對方式及後續停止管道應分別保存為 `{{ELECTRONIC_FORM_CONSENT_AT}}`、`{{ELECTRONIC_FORM_OBJECTION_CHANNEL}}` 及 `{{ELECTRONIC_FORM_STOP_CHANNEL}}`。甲方通知停止後續採電子形式時，不影響停止前已依法完成之電子法律行為；實際法律效果仍依適用法令認定。

三、「電子方式表示同意」、「電子簽章」及符合電子簽章法特定要件而具有法定推定效力之「數位簽章」應分別記載。實際方法應綁定 `{{SIGNATURE_METHOD}}` 及 `{{DIGITAL_SIGNATURE_STATUTORY_PRESUMPTION_APPLICABLE}}`；未符合數位簽章法定要件者，不得宣稱具有本人親簽之法定推定效力。

四、契約出示、審閱、開啟、下載、接受與簽署應各自保存真實事件時間。不存在之事件應記為 `NONE` 或 `NOT_APPLICABLE`，不得虛構。

五、完成簽署之靜態契約應保存 `{{SIGNED_CONTRACT_VERSION}}`、`{{SIGNED_CONTRACT_SHA256}}` 及 `{{SIGNED_PDF_DOCUMENT_ID}}`。

```text
SIGNED_CONTRACT_IMMUTABLE = TRUE
```

六、簽署完成後，不得因 3D 確認、圖面交付、設計版本更新、DRS Review、Owner Override、費用付款或其他後續事件回頭改寫 signed contract。後續事項只能以 append-only Case Event 保存並 reference 本契約。

七、任何必要欄位未解析時，狀態為 `CONTRACT_BINDING_INCOMPLETE`，不得產生可正式簽署版本。正式簽署文件不得顯示未解析 placeholder、虛構資料或空白底線。

八、`{{DESIGN_STAGE_ID}}`、`{{DRS_REVIEW_RESULT}}`、`{{OWNER_DECISION}}` 等後續 runtime event 不硬寫入已簽署 PDF；其資料結構列於附件七，並以案件事件與已簽契約建立引用關係。

---

## 第二十二條　個人資料

一、服務方為提供本契約服務，得於必要範圍內蒐集、處理及利用甲方提供或案件中產生之基本識別、聯絡、案件地址、設計需求、圖說、3D、材料／設備、報價／預算、丈量、平台操作、通訊、簽署、付款狀態及其他案件資料。

二、正式簽署前，服務方應以附件或獨立告知事項明確揭露：蒐集者、特定目的、個人資料類別、利用期間、地區、對象、方式、當事人得行使之權利、行使方式及不提供資料之影響。相關 binding fields 為 `{{PRIVACY_NOTICE_VERSION}}`、`{{PRIVACY_NOTICE_PRESENTED_AT}}` 及 `{{PRIVACY_CONTACT_CHANNEL}}`。

三、服務方在各項處理活動中是個人資料蒐集／利用主體、受託處理者或其他角色，應以 `{{DATA_CONTROLLER_PROCESSOR_ROLE_MAP_VERSION}}` 逐項揭露，不得以契約名稱或概括免責取代其實際法律角色。

四、服務方授權人工審查人員及受託技術服務商，僅得在履行服務之最小必要範圍處理資料，並應受保密、目的限制、權限控管及資料安全義務拘束。

五、第三方技術服務、AI 服務、雲端儲存及可能之跨境處理，應以 `{{THIRD_PARTY_PROCESSOR_LIST_VERSION}}` 與 `{{CROSS_BORDER_PROCESSING_NOTICE_VERSION}}` 揭露實際服務商、資料類別、處理地區、目的及保存方式。

六、未經甲方另行有效同意，服務方不得將可識別甲方、案件設計方或特定案件之資料，作為公開模型或第三方通用模型之一般訓練資料。去識別化資料之使用仍應採取合理措施避免重新識別。

七、甲方得依法請求查詢、閱覽、製給複製本、補充、更正、停止蒐集／處理／利用或刪除個人資料。但履行契約、保存交易／簽署證明、處理爭議、維護資訊安全或遵守法令所必要者，服務方得於必要範圍及期間內依法保存或限制處理。

八、服務方應透過 `{{DATA_SUBJECT_REQUEST_CHANNEL}}` 受理前項請求，保存身分驗證、受理、期限、延長通知、拒絕理由及處理結果，並依請求時有效法令辦理；不得只提供無法追蹤之一般客服信箱。

九、服務方知悉個人資料遭未授權存取、竊取、竄改、毀損、滅失、洩漏或其他事故時，應依適用法令及其事件處理程序採取必要措施並通知受影響者。

---

## 第二十三條　保密

一、甲方與服務方就因本契約知悉之非公開資料負保密義務，包括設計需求、費用、契約、圖說、3D、材料／設備、現況資料、通訊、DRS 報告、設計版本及其他依性質應保密資料。

二、已合法公開、依法令或主管機關要求提供、為履行本契約必要、為爭議處理或權利主張必要、經權利人同意，或合法去識別化後使用之資料，不受前項限制。

三、服務方使用雲端、AI、儲存、電子簽章、資訊安全或其他受託服務商時，應以契約或其他適當方式要求相當之保密與安全義務。

四、契約終止不影響依其性質應繼續有效之保密義務。

---

## 第二十四條　設計成果智慧財產權之 DRS 邊界

一、本契約不替甲方與案件設計方創設著作權移轉、授權或其他智慧財產權安排。

二、設計成果之著作權、使用權、修改權、重製權、施工使用、第三人交付及 portfolio 使用，均依專案設計契約、有效變更文件及適用法令認定。

三、DRS 僅得在履行本契約必要範圍內保存版本、保存確認、保存相關條款、提醒條款是否存在及標示明顯缺漏。服務方不得因保存或審查設計成果而主張取得超出本契約必要範圍之權利。

四、甲方應確保其提供之第三人設計成果、圖片或其他資料具有合法來源或必要授權；有疑義時，DRS 應標示待確認，不得自行判定權利歸屬。

五、服務方既有之平台、通用模板、欄位結構、方法及工具，其權利不因本契約移轉。DRS 報告、人工標註及案件治理輸出之使用範圍應綁定 `{{DRS_REPORT_LICENSE_SCOPE}}`；在未經律師確認且欄位未解析前，不得推定為全部讓與或無限制授權。

六、服務方為提供本服務而取得之甲方或案件設計方內容授權，僅限必要之儲存、備份、轉檔、審查及案件內授權分享。公開展示、行銷案例、跨案件分析或可識別資料之模型訓練，應另有清楚且可證明之合法依據或同意。

---

## 第二十五條　服務中止與終止

一、甲方或服務方得以可保存之書面或電子通知終止本契約；終止時間及是否需改善期間，依通知、適用法令及本契約約定認定。

二、甲方未支付某階段 DRS 審查費時，服務方得不啟動或暫停該階段審查，但不得因此控制、扣留或阻止甲方支付案件設計方之設計費。

三、甲方提供重大不實資料、要求偽造或無痕竄改紀錄、侵害第三人權利、重大妨害服務、疑似違法或有資安風險時，服務方得於必要範圍暫停服務並以可保存方式通知理由。

四、專案設計契約中途終止時，不代表 DRS 全額服務費立即到期。服務方應停止尚未開始之後續階段，並依第二十六條結算。

五、DRS 服務終止不當然終止甲方之其他平台帳戶或非 DRS 功能；其權限依終止時有效的平台條款與方案辦理。

六、終止前已成立之 Contract、Decision、Record、Review、Objection、Override、timestamp 及 DESIGN_VERSION 應依保存規則留存，不得因終止而刪除或改寫。

---

## 第二十六條　服務費結算與退費原則

一、尚未支付且尚未開始之 DRS 階段，不計費。

二、已支付但尚未符合最低資料條件、尚未建立 DRS_REVIEW_STARTED 之階段，應依實際未履行部分、支付工具費用及適用法令辦理退費或結算，不得以「已付款」逕稱服務完成。

三、服務方已完成 AI_PRELIMINARY、HUMAN_REVIEW 並交付該階段 DRS_REVIEWED 者，該階段服務原則上視為已履行；已履行部分原則上不因甲方其後之設計費決策、案件設計方回應或 DRS 服務終止而當然退還。

四、重複付款、計算錯誤、服務方未履行、依法應退費或其他不得排除之消費者權利，不受前項限制。不得約定任何情況均不退費。

五、如本服務依法適用通訊交易解除權、定型化契約規範或其他消費者保護規定，從其規定。甲方要求在法定期間內開始服務，不當然等於其已有效拋棄不得預先拋棄之權利。

六、服務方應於終止後 `{{TERMINATION_SETTLEMENT_DAYS}}` 日內提供階段履行與結算明細；依法或依結算結果應退金額，於 `{{REFUND_PROCESSING_DAYS}}` 日內依約定方式退還。

七、本契約如屬通訊交易且消費者保護法第十九條解除權適用，甲方得於接受服務後七日內，以可保存之書面通知至 `{{DISTANCE_TRANSACTION_RESCISSION_CHANNEL}}` 解除契約，無須說明理由或負擔費用／對價；法定期間、起算及效果仍以適用法令為準。服務方應在簽署前清楚揭露行使方式，不得以建立案件、登入、上傳資料、付款或要求開始服務當然取代該告知。

八、服務方僅得在服務確實符合通訊交易解除權合理例外、已於個別服務處清楚告知，且已取得法令要求之事前同意時，記載 `{{DISTANCE_TRANSACTION_RESCISSION_EXCEPTION}}`；不得只因服務具有客製內容或透過網路提供，就一律排除解除權。例外是否適用應經律師按實際服務流程確認。

九、甲方依法解除服務契約時，服務方應依適用法令返還對價；消費者保護法第十九條之二適用時，應於收到解除服務契約通知之次日起十五日內返還。`{{REFUND_PROCESSING_DAYS}}` 不得長於強制法定期限。

---

## 第二十七條　責任限制

一、服務方因可歸責事由致甲方受有損害者，應依法負責。

二、DRS 不保證：設計美感符合甲方主觀期待、設計方案一定可以施工、現場尺寸百分之百正確、3D 與完工成果完全一致、材料實品與圖片完全相同、圖說符合全部法規、已取得必要簽證或許可、施工方依圖施工、實際施工品質、工程價格或工期。

三、服務方不對未提供資料、無法合理發現之隱蔽現況、第三人故意隱匿／偽造／變造／冒用／不實陳述，或依法應由外部專業人員判斷之事項負結果保證責任；但服務方明知或因重大過失未處理可供審查資料中之明顯重大矛盾、缺漏或錯誤提示者，仍應依法負責。

四、任何責任上限、間接損害排除或其他限制，僅於適用法律允許且不構成不公平定型化契約條款之範圍內適用。`{{LIABILITY_LIMIT_POLICY}}` 必須經律師完成個案與定型化契約審閱後，才得解析進可簽署版本；服務方之故意、重大過失、個人資料責任、人身損害及依法不得限制之責任不得預先排除。

---

## 第二十八條　資料保存與下載

一、服務方應於服務期間保存履約必要之契約、設計版本、DRS Review、決策、異議、Override、通知、付款狀態及案件事件。

二、資料保存年限應按資料類型、服務目的、契約／交易證明、個人資料目的、爭議處理及法定義務分別設定：案件資料 `{{CASE_DATA_RETENTION_YEARS}}` 年；契約／簽署／交易紀錄 `{{TRANSACTION_RECORD_RETENTION_YEARS}}` 年；爭議資料於爭議終結後 `{{DISPUTE_RECORD_RETENTION_YEARS}}` 年。無明確法律依據時不得捏造統一年限。

三、服務終止或結案後，服務方應提供不少於 `{{DATA_DOWNLOAD_PERIOD_DAYS}}` 日之合理下載期間，使甲方取得其依法及依約得取得之契約、文件清單、版本紀錄、DRS Review 與案件紀錄包。

四、保存目的消滅或期限屆滿後，服務方應依適用法令與公開政策刪除、匿名化或依法封存；因法令、爭議、交易證明、資安事件或權利防禦必要者，得在必要範圍內限制處理並保存。

---

## 第二十九條　爭議處理

一、甲方與案件設計方之設計服務爭議，依專案設計契約及合法程序處理。服務方得協助輸出案件時間軸、版本、文件清單、DRS Review、Objection、Override 及其他可供使用之紀錄，但不作具法律拘束力之責任判斷。

二、甲方與服務方因本 DRS 契約發生爭議時，應先透過服務／申訴窗口協商。服務窗口為 `{{SERVICE_SUPPORT_CHANNEL}}`；消費申訴窗口為 `{{CONSUMER_COMPLAINT_CHANNEL}}`。

三、協商不成時，雙方得依法申請消費爭議申訴、調解、其他法定程序或提起訴訟。本契約不限制甲方依法可利用之申訴、調解或救濟。

四、甲方為消費者時，服務方對消費申訴之處理期限不得長於適用法令；消費者保護法第四十三條適用時，應自申訴日起十五日內妥適處理。

---

## 第三十條　契約審閱

一、服務方應於簽署前向甲方完整出示本契約及附件，提供合理審閱期間，並保存 `{{CONTRACT_PRESENTED_AT}}`、`{{CONTRACT_REVIEW_PERIOD_STARTED_AT}}`、`{{CONTRACT_REVIEW_PERIOD_EXPIRES_AT}}`、`{{CONTRACT_OPENED_AT}}`、`{{CONTRACT_DOWNLOADED_AT}}` 及 `{{CONTRACT_ACCEPTED_AT}}`。

二、審閱期間日數為 `{{CONTRACT_REVIEW_PERIOD_DAYS}}`，應由律師依本服務是否屬主管機關公告之特定定型化契約、交易方式及消費者保護法要求確認，不得以未解析值產生可簽署契約。

三、甲方確認已理解服務內容、AI 與人工覆核、費率、先付費後審查、設計費分離、美感審查排除、專業資格邊界、終止／退費、資料處理、電子簽署及案件紀錄規則。

四、如以網際網路或其他通訊方式締約，服務方應以清楚方式揭露締約主體、服務內容、對價、付款、履行、解除／終止、申訴及依法應揭露事項，並提供可保存之契約全文。任何依法不得預先拋棄之消費者權利，不因勾選或接受本契約而當然消滅。

五、通訊交易之簽署前資訊應綁定服務交付日／方式、付款日／方式、解除權行使期限／方式、合理例外是否適用及消費申訴方式；其 binding fields 至少包括 `{{SERVICE_DELIVERY_TIMING}}`、`{{SERVICE_DELIVERY_METHOD}}`、`{{PAYMENT_DUE_AND_METHOD}}`、`{{DISTANCE_TRANSACTION_RESCISSION_CHANNEL}}`、`{{DISTANCE_TRANSACTION_RESCISSION_EXCEPTION}}` 及 `{{CONSUMER_COMPLAINT_CHANNEL}}`。任何必要欄位未解析時，不得產生可正式簽署版本。

---

## 第三十一條　準據法與管轄

本契約以中華民國法律為準據法。

因本契約所生爭議，以依法有管轄權之臺灣法院為第一審法院。甲方為消費者時，本條不得排除其依強制規定得主張之管轄、申訴、調解或其他救濟權利。

---

## 第三十二條　附件

下列附件為本契約之一部分：

1. 附件一｜DRS 設計審查服務範圍；
2. 附件二｜設計費與 DRS 審查費階段表；
3. 附件三｜設計成果交付 Schedule；
4. 附件四｜設計版本／確認規則；
5. 附件五｜Owner Objection／Override 規則；
6. 附件六｜DRS 設計服務責任邊界；
7. 附件七｜電子簽署及資料綁定欄位。

附件與本文牴觸時，應先依本契約目的、專案設計契約之 source of truth、甲方與服務方之有效意思表示及適用法令判斷；不得以附件單方面替案件設計方創設義務。

---

## 第三十三條　簽署

### 甲方

- 簽署人帳號：`{{OWNER_SIGNER_ACCOUNT_ID}}`
- 電子簽署時間：`{{OWNER_SIGNED_AT}}`
- 電子簽章識別碼：`{{OWNER_SIGNATURE_ID}}`

### 服務方

- 簽署人帳號：`{{SERVICE_PROVIDER_SIGNER_ACCOUNT_ID}}`
- 電子簽署時間：`{{SERVICE_PROVIDER_SIGNED_AT}}`
- 電子簽章識別碼：`{{SERVICE_PROVIDER_SIGNATURE_ID}}`

### 簽署文件識別

- 電子簽署交易識別碼：`{{E_SIGN_TRANSACTION_ID}}`
- 簽署契約版本：`{{SIGNED_CONTRACT_VERSION}}`
- 簽署契約 SHA-256：`{{SIGNED_CONTRACT_SHA256}}`
- 簽署 PDF 文件識別碼：`{{SIGNED_PDF_DOCUMENT_ID}}`

---

# 附件一｜DRS 設計審查服務範圍

| 項目 | DRS 得提供 | DRS 不提供 |
|---|---|---|
| 設計契約 | 條款存在、版本、缺漏、明顯矛盾及待確認事項整理 | 替案件設計方新增義務、法律定稿或法律意見 |
| 需求與版本 | 已確認需求對應、差異、被取代版本及決策留痕 | 替甲方作最終設計決策 |
| 3D | 與已確認需求／配置之明顯差異；重要內容是否有後續書面依據 | 美感、風格、流行、藝術性或創意評分 |
| 平面／系統圖 | 依 Schedule 檢查交付、版本、尺寸標示及明顯矛盾 | 自行增加應交圖說或保證符合全部專業規範 |
| 細部圖 | 依 Schedule 比對約定與實交、前後版本及明顯缺件 | 保證工法、結構、法規、品質或一定可施工 |
| 材料／設備 | 名稱、規格、型號、尺寸、安裝條件是否有資料 | 保證實品色差、性能、適用性或供貨 |
| 案件紀錄 | Review、Objection、Override、決策、版本及時間線 | 無痕刪改原始紀錄或替第三人表示同意 |

正式 DRS 設計審查結果必須經 AI_PRELIMINARY 與 HUMAN_REVIEW，不得只以 AI output 形成。

---

# 附件二｜設計費與 DRS 審查費階段表

| 階段 | 設計費比例 | DRS 審查費占總 DRS 費比例 | DRS 審查費占設計費比例 |
|---|---:|---:|---:|
| 簽約 | 20% | 20% | 2% |
| 3D 確認 | 20% | 20% | 2% |
| 平面／系統圖 | 20% | 20% | 2% |
| 細部圖 | 40% | 40% | 4% |
| 合計 | 100% | 100% | 10% |

驗算：

```text
2% + 2% + 2% + 4% = 10%
DRS_TOTAL_REVIEW_FEE = TOTAL_DESIGN_FEE × 10%
```

各階段均採 DRS 審查費先入帳、最低必要資料可供審查後，服務方再開始正式審查。設計費與 DRS 審查費分別支付案件設計方及服務方，不得混同或重複計費。

---

# 附件三｜設計成果交付 Schedule

本附件只綁定專案設計契約中已存在之交付義務，不新增案件設計方義務。

- Schedule 識別碼：`{{DESIGN_DELIVERABLE_SCHEDULE_ID}}`
- Schedule 版本：`{{DESIGN_DELIVERABLE_SCHEDULE_VERSION}}`
- Source 契約 ID：`{{DESIGN_SERVICE_CONTRACT_ID}}`
- Source 契約版本：`{{DESIGN_SERVICE_CONTRACT_VERSION}}`
- Source 契約 SHA-256：`{{DESIGN_SERVICE_CONTRACT_SHA256}}`

| 階段 | 約定成果 | 格式 | 約定日期 | 必要資訊 | 備註 |
|---|---|---|---|---|---|
| Stage 1 | `{{STAGE_1_DESIGN_DELIVERABLES}}` | `{{STAGE_1_DELIVERY_FORMAT}}` | `{{STAGE_1_DUE_AT}}` | `{{STAGE_1_REQUIRED_INFORMATION}}` | `{{STAGE_1_NOTES}}` |
| Stage 2 | `{{STAGE_2_DESIGN_DELIVERABLES}}` | `{{STAGE_2_DELIVERY_FORMAT}}` | `{{STAGE_2_DUE_AT}}` | `{{STAGE_2_REQUIRED_INFORMATION}}` | `{{STAGE_2_NOTES}}` |
| Stage 3 | `{{STAGE_3_DESIGN_DELIVERABLES}}` | `{{STAGE_3_DELIVERY_FORMAT}}` | `{{STAGE_3_DUE_AT}}` | `{{STAGE_3_REQUIRED_INFORMATION}}` | `{{STAGE_3_NOTES}}` |
| Stage 4 | `{{STAGE_4_DESIGN_DELIVERABLES}}` | `{{STAGE_4_DELIVERY_FORMAT}}` | `{{STAGE_4_DUE_AT}}` | `{{STAGE_4_REQUIRED_INFORMATION}}` | `{{STAGE_4_NOTES}}` |

包含之修改規則：`{{INCLUDED_REVISION_RULE}}`

包含之修改次數：`{{INCLUDED_REVISION_COUNT}}`

---

# 附件四｜設計版本／確認規則

一、每一 DESIGN_VERSION 至少記錄 document_id、document_type、version、issued_at、submitted_by、review_status、owner_confirmation 及 superseded_version。

二、新版本不得覆寫舊版本。被取代版本應保留並標示其 successor version。

三、STAGE_CONFIRMED 表示該版本為後續設計之目前基準，不表示永遠不得修改，也不表示甲方放棄依法或依約權利。

四、確認後之修改使用 DESIGN_CHANGE_REQUEST；實質範圍變更使用 DESIGN_SCOPE_CHANGE。兩者均以新事件附加。

五、甲方確認、案件設計方陳述、DRS Review、Objection 及 Override 必須分欄保存，不得相互取代。

六、後續新版本應 reference 原版本、變更原因、提出人、雙方確認狀態及可能之費用／時程影響；DRS 不自行決定該影響。

---

# 附件五｜Owner Objection／Override 規則

## 一、OWNER_OBJECTION

甲方對 DRS Review 有具體異議時，應保存：

- 原 Review ID／version／result；
- 異議內容；
- 異議理由；
- 佐證文件及版本；
- 建立者及時間；
- 下一處理人及期限。

## 二、OWNER_OVERRIDE

OWNER_OVERRIDE 應保存原 Review、甲方理由、甲方證據、決策時間及風險提示。原 Review 不得改成 PASS。

## 三、PARTY_AGREEMENT_OVERRIDE

只有甲方及案件設計方皆有可驗證意思表示時成立。僅有甲方陳述者，標示 OWNER_REPORTED_PRIVATE_AGREEMENT。

## 四、程序合作基礎失效

甲方在 DRS 已完成正式書面審查、通知結果並經合理提醒後，仍拒絕採用程序且不提出具體理由或佐證者，甲方或服務方得終止 DRS 服務；不得因此推定設計成果已確認或設計費應付款。

---

# 附件六｜DRS 設計服務責任邊界

```text
DRS REPORT
=
POSSIBLE INCOMPLETENESS
+ DOCUMENT CONFLICT
+ MISSING EXECUTION INFORMATION
+ UNRESOLVED DECISION
```

DRS REPORT 不等於 AESTHETIC JUDGMENT。

一、DRS 不審查美感、藝術價值、風格優劣、色彩喜好、造型創意或其他高度主觀之設計判斷。

二、DRS 依可供審查之書面資料辨識可能缺漏、矛盾、不明確、版本不一致或待確認事項；不保證一定可施工、工法正確、結構安全、法規符合、專業設計無誤或工程品質。

三、3D 審查只比對已確認需求、空間配置及其他正式資料，並辨識重要工程內容是否有後續書面依據；不評論 3D 是否漂亮。

四、涉及結構、消防、建築／室內裝修法規、機電、防水、專業計算、法定簽證或主管機關申請者，標示 EXTERNAL_PROFESSIONAL_REVIEW_REQUIRED。

五、丈量、現場隱蔽狀況、施工行為及完工成果不在 DRS 書面資料審查可直接保證之範圍。

六、DRS 不替甲方或案件設計方作法律責任、著作權歸屬、追加設計費、履約或損害判斷。

---

# 附件七｜電子簽署及資料綁定欄位

## 一、契約與當事人

```text
{{CASE_ID}}
{{DRS_SERVICE_CONTRACT_ID}}
{{DRS_SERVICE_CONTRACT_VERSION}}

{{OWNER_ID}}
{{OWNER_LEGAL_NAME}}
{{OWNER_TRANSACTION_CAPACITY}}

{{DESIGNER_ID}}
{{DESIGNER_LEGAL_NAME}}
{{DESIGNER_REGISTRATION_NUMBER}}
{{DESIGNER_REPRESENTATIVE}}

{{DESIGN_SERVICE_CONTRACT_ID}}
{{DESIGN_SERVICE_CONTRACT_VERSION}}
{{DESIGN_SERVICE_CONTRACT_SIGNED_AT}}
{{DESIGN_SERVICE_CONTRACT_SHA256}}
```

## 二、費率與 Schedule

```text
{{TOTAL_DESIGN_FEE}}

{{DESIGN_FEE_STAGE_1_RATE}}
{{DESIGN_FEE_STAGE_2_RATE}}
{{DESIGN_FEE_STAGE_3_RATE}}
{{DESIGN_FEE_STAGE_4_RATE}}

{{DRS_DESIGN_REVIEW_RATE}}
{{DRS_TOTAL_REVIEW_FEE}}

{{DESIGN_DELIVERABLE_SCHEDULE}}
{{INCLUDED_REVISION_RULE}}
{{INCLUDED_REVISION_COUNT}}
```

固定值：

```text
DESIGN_FEE_STAGE_1_RATE = 20%
DESIGN_FEE_STAGE_2_RATE = 20%
DESIGN_FEE_STAGE_3_RATE = 20%
DESIGN_FEE_STAGE_4_RATE = 40%
DRS_DESIGN_REVIEW_RATE = 10%
```

## 三、電子簽署

```text
{{E_SIGN_TRANSACTION_ID}}
{{ELECTRONIC_FORM_CONSENT_AT}}
{{ELECTRONIC_FORM_OBJECTION_CHANNEL}}
{{ELECTRONIC_FORM_STOP_CHANNEL}}
{{SIGNATURE_METHOD}}
{{DIGITAL_SIGNATURE_STATUTORY_PRESUMPTION_APPLICABLE}}

{{CONTRACT_PRESENTED_AT}}
{{CONTRACT_REVIEW_PERIOD_STARTED_AT}}
{{CONTRACT_REVIEW_PERIOD_EXPIRES_AT}}
{{CONTRACT_OPENED_AT}}
{{CONTRACT_DOWNLOADED_AT}}
{{CONTRACT_ACCEPTED_AT}}

{{OWNER_SIGNER_ACCOUNT_ID}}
{{OWNER_SIGNED_AT}}
{{OWNER_SIGNATURE_ID}}

{{SERVICE_PROVIDER_SIGNER_ACCOUNT_ID}}
{{SERVICE_PROVIDER_SIGNED_AT}}
{{SERVICE_PROVIDER_SIGNATURE_ID}}

{{SIGNED_CONTRACT_VERSION}}
{{SIGNED_CONTRACT_SHA256}}
{{SIGNED_PDF_DOCUMENT_ID}}
```

## 四、通訊交易及資料處理

```text
{{SERVICE_DELIVERY_TIMING}}
{{SERVICE_DELIVERY_METHOD}}
{{PAYMENT_DUE_AND_METHOD}}
{{DISTANCE_TRANSACTION_RESCISSION_CHANNEL}}
{{DISTANCE_TRANSACTION_RESCISSION_EXCEPTION}}
{{CONSUMER_COMPLAINT_CHANNEL}}

{{PRIVACY_NOTICE_VERSION}}
{{PRIVACY_NOTICE_PRESENTED_AT}}
{{PRIVACY_CONTACT_CHANNEL}}
{{DATA_CONTROLLER_PROCESSOR_ROLE_MAP_VERSION}}
{{DATA_SUBJECT_REQUEST_CHANNEL}}
{{THIRD_PARTY_PROCESSOR_LIST_VERSION}}
{{CROSS_BORDER_PROCESSING_NOTICE_VERSION}}
{{DRS_REPORT_LICENSE_SCOPE}}
```

## 五、Stage Runtime Events

下列欄位不硬寫入已簽 PDF；應以 append-only Case Event 保存並 reference 本契約：

```text
{{DESIGN_STAGE_ID}}
{{DESIGN_STAGE_NAME}}
{{DESIGN_STAGE_DESIGN_FEE_AMOUNT}}
{{DRS_STAGE_REVIEW_FEE_AMOUNT}}
{{DESIGN_STAGE_DELIVERABLES}}
{{DESIGN_STAGE_SUBMITTED_AT}}
{{DRS_REVIEW_STARTED_AT}}
{{DRS_REVIEW_COMPLETED_AT}}
{{DRS_REVIEW_RESULT}}
{{OWNER_DECISION}}
{{OWNER_DECISION_AT}}
```

## 六、簽署前完整性

任何必要欄位未解析時，狀態為 CONTRACT_BINDING_INCOMPLETE。正式簽署版本不得含未解析 placeholder；簽署後之 document bytes、version、SHA-256 及 PDF document ID 必須保持不變。
