(function exposeProjectContractSource(root, factory) {
  "use strict";

  var source = factory();
  root.LaibeProjectContractSource = source;

  if (typeof module === "object" && module.exports) {
    module.exports = source;
  }
})(typeof globalThis !== "undefined" ? globalThis : this, function createProjectContractSource() {
  "use strict";

  var TEMPLATE_VERSION = "v0.2";
  var COMMON_APPENDIX_ID = "COMMON-DRS-PROCEDURE-v0.2";

  function placeholdersIn(body) {
    return Array.from(new Set(body.match(/\{\{[A-Z][A-Z0-9_]*\}\}/g) || []));
  }

  function article(articleId, title, body, sourceType, attachments, required) {
    return {
      articleId: articleId,
      title: title,
      body: body,
      placeholders: placeholdersIn(body),
      required: required !== false,
      sourceType: sourceType,
      attachments: attachments || [],
    };
  }

  function deepFreeze(value) {
    if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
    Object.getOwnPropertyNames(value).forEach(function freezeChild(key) {
      deepFreeze(value[key]);
    });
    return Object.freeze(value);
  }

  var commonMetadataFields = [
    "{{CASE_ID}}",
    "{{PROJECT_CONTRACT_ID}}",
    "{{PROJECT_CONTRACT_TYPE}}",
    "{{PROJECT_CONTRACT_VERSION}}",
    "{{PROJECT_CONTRACT_GENERATED_AT}}",
    "{{OWNER_ID}}",
    "{{OWNER_LEGAL_NAME}}",
    "{{OWNER_ID_NUMBER}}",
    "{{OWNER_PHONE}}",
    "{{OWNER_EMAIL}}",
    "{{OWNER_ADDRESS}}",
    "{{CONTRACTOR_ID}}",
    "{{CONTRACTOR_LEGAL_NAME}}",
    "{{CONTRACTOR_REGISTRATION_NUMBER}}",
    "{{CONTRACTOR_REPRESENTATIVE}}",
    "{{CONTRACTOR_PHONE}}",
    "{{CONTRACTOR_EMAIL}}",
    "{{CONTRACTOR_ADDRESS}}",
    "{{PROJECT_NAME}}",
    "{{PROJECT_ADDRESS}}",
    "{{DRS_ENABLED}}",
    "{{DRS_SERVICE_CONTRACT_ID}}",
    "{{DRS_PROCEDURE_VERSION}}",
    "{{DESIGNATED_COMMUNICATION_CHANNEL}}",
    "{{DRS_FALLBACK_CHANNEL}}",
  ];

  var signedMetadataFields = [
    "{{PROJECT_CONTRACT_SIGNED_AT}}",
    "{{SIGNED_CONTRACT_VERSION}}",
    "{{SIGNED_CONTRACT_SHA256}}",
    "{{SIGNED_PDF_DOCUMENT_ID}}",
  ];

  var designFeeProfile = {
    amountField: "{{TOTAL_DESIGN_FEE}}",
    stages: [
      { stageId: "DESIGN_STAGE_1", trigger: "簽約", rate: 20 },
      { stageId: "DESIGN_STAGE_2", trigger: "3D＋平面／系統圖交付", rate: 10 },
      { stageId: "DESIGN_STAGE_3", trigger: "第一次細部施工圖＋報價單交付", rate: 30 },
      { stageId: "DESIGN_STAGE_4", trigger: "整體設計交付", rate: 40 },
    ],
    totalRate: 100,
    paymentRequiresOwnerDecision: true,
  };

  var worksAmountProfile = {
    amountField: "{{PROJECT_TOTAL_AMOUNT}}",
    signingRate: 5,
    progressPoolRate: 80,
    maxProgressMilestoneRate: 10,
    progressMilestoneCountFixed: false,
    progressMilestoneBasis: ["CONSTRUCTION_SCHEDULE", "QUOTATION_WORK_VALUE"],
    progressMilestoneRateSum: 80,
    finalRate: 15,
    finalPaymentReadiness: {
      prerequisites: ["FINAL_ACCEPTANCE_COMPLETED", "WARRANTY_PLEDGE_SIGNED"],
      drsReview: "DRS_DOCUMENT_AND_PROCEDURE_REVIEW",
      readyStatus: "FINAL_PAYMENT_READY_FOR_OWNER_DECISION",
    },
    finalPaymentDecision: {
      actor: "OWNER",
      explicitDecisionRequired: true,
      approvalValue: "APPROVE",
      paymentAction: "FINAL_PAYMENT_ACTION",
    },
    warrantyDeposit: "NONE",
    paymentRequiresOwnerDecision: true,
  };

  var designArticles = [
    article(
      "DESIGN-01-PARTIES",
      "第一條｜契約當事人",
      "甲方 {{OWNER_LEGAL_NAME}} 為設計需求方，乙方 {{CONTRACTOR_LEGAL_NAME}} 為設計服務提供者。LaiBE DRS 不是本契約的設計服務義務人，僅依契約提供文件核對、版本追蹤、缺漏提示、補件程序、決策輔助與案件留痕。",
      "GOVERNMENT_BASE",
      ["PARTY-IDENTIFICATION"],
    ),
    article(
      "DESIGN-02-SUBJECT",
      "第二條｜案件名稱與設計標的",
      "本案名稱為 {{PROJECT_NAME}}，地址為 {{PROJECT_ADDRESS}}，設計面積為 {{DESIGN_AREA}}，設計標的與範圍以 {{DESIGN_SCOPE}} 為準。",
      "GOVERNMENT_BASE",
      ["DESIGN-SCOPE"],
    ),
    article(
      "DESIGN-03-CONTRACT-DOCUMENTS",
      "第三條｜設計契約文件",
      "正式契約基準包括本契約、設計服務範圍、設計費、需求確認紀錄、設計成果交付 Schedule、設計付款節點表、已確認設計版本、正式變更及 DRS 案件治理程序附件。每份文件均應識別 document_id、version、issued_at、confirmed_by 與 confirmed_at；衝突時應先進入差異釐清與 Owner Decision 程序。",
      "GOVERNMENT_BASE",
      ["DESIGN-SCOPE", "DESIGN-DELIVERABLE-SCHEDULE", "DESIGN-PAYMENT-SCHEDULE", COMMON_APPENDIX_ID],
    ),
    article(
      "DESIGN-04-OWNER-COOPERATION",
      "第四條｜甲方協力義務",
      "甲方應於合理期間提供需求、現況資料、必要尺寸或既有文件、預算條件、必要 Decision 及必要之現場協助；乙方或 DRS 要求補充時，應說明所依據的既有契約義務與實際用途。",
      "GOVERNMENT_BASE",
      ["OWNER-REQUIREMENTS-RECORD"],
    ),
    article(
      "DESIGN-05-SERVICES",
      "第五條｜乙方設計服務",
      "乙方實際應交成果以 {{DESIGN_DELIVERABLE_SCHEDULE}} 為準。DRS 不得自行增加圖說種類、交付期限、修改次數或工作範圍；任何新增義務須依正式變更程序由甲乙雙方確認。",
      "GOVERNMENT_BASE",
      ["DESIGN-DELIVERABLE-SCHEDULE"],
    ),
    article(
      "DESIGN-06-FEE-PAYMENT",
      "第六條｜設計服務費與正式付款節點",
      "設計總價為 {{TOTAL_DESIGN_FEE}}。DESIGN_STAGE_1 簽約為 20%；DESIGN_STAGE_2 之 3D＋平面／系統圖交付為 10%；DESIGN_STAGE_3 之第一次細部施工圖＋報價單交付為 30%；DESIGN_STAGE_4 之整體設計交付為 40%，合計 100%。各節點須先完成約定交付、DRS 文件 Review 與明示 Owner Decision，DRS Review 本身不直接成立付款決定。",
      "LAIBE_OWNER_PROTECTION",
      ["DESIGN-PAYMENT-SCHEDULE"],
    ),
    article(
      "DESIGN-07-DELIVERY",
      "第七條｜設計成果交付",
      "每次正式交付須識別 document_id、document_type、document_name、version、submitted_at、submitted_by 與 design_stage_id。甲方確認須綁定特定版本；甲方沉默不構成確認，也不直接成立付款決定。",
      "LAIBE_OWNER_PROTECTION",
      ["DESIGN-DELIVERY-RECORD"],
    ),
    article(
      "DESIGN-08-DRS-PROCEDURE",
      "第八條｜設計 DRS 程序",
      "乙方應依指定程序提交契約已約定的成果並標明版本。DRS 發現契約範圍內的缺件、矛盾或版本問題時，乙方應補充或說明；新版本不得無痕覆寫舊版本。DRS 只能依主契約既有義務提出補件要求。",
      "DRS_GOVERNANCE",
      [COMMON_APPENDIX_ID],
    ),
    article(
      "DESIGN-09-NO-AESTHETIC-REVIEW",
      "第九條｜DRS 不審美感",
      "DRS 得檢查約定成果是否交付、版本是否一致、需求是否有明顯落差、尺寸與材料或設備資料是否明顯缺漏、3D 與正式圖說是否有明顯差異，以及重要內容是否僅為概念而無正式資料。DRS 不判斷美感、設計感、風格高低、藝術價值、配色優劣或創意能力。",
      "DRS_GOVERNANCE",
      ["DESIGN-REVIEW-BASIS"],
    ),
    article(
      "DESIGN-10-OWNER-DECISION",
      "第十條｜DRS Review 與 Owner Decision",
      "DRS Review 狀態為 READY_FOR_OWNER_DECISION、SUPPLEMENT_REQUIRED、DISCREPANCY_REQUIRES_DECISION、INSUFFICIENT_EVIDENCE 或 EXTERNAL_PROFESSIONAL_REVIEW_REQUIRED。甲方須明示選擇 APPROVE、OBJECT、REQUEST_SUPPLEMENT、APPROVE_WITH_RESERVATION 或 OWNER_OVERRIDE。DRS Review 不等於 Owner Decision，也不等於設計費付款決定。",
      "DRS_GOVERNANCE",
      ["DRS-REVIEW-RECORD", "OWNER-DECISION-RECORD"],
    ),
    article(
      "DESIGN-11-VERSIONS",
      "第十一條｜設計版本",
      "案件應分別建立 DESIGN_VERSION、STAGE_CONFIRMED、DESIGN_CHANGE_REQUEST 與 DESIGN_SCOPE_CHANGE。所有確認都須綁定 document_id 與 version，新版本不得覆寫舊版本，原基準及確認歷史均應保留。",
      "DRS_GOVERNANCE",
      ["DESIGN-VERSION-REGISTER"],
    ),
    article(
      "DESIGN-12-CHANGES",
      "第十二條｜設計變更",
      "甲方要求改變已確認內容時，應先區分一般修改與契約範圍變更。涉及額外設計費或時程時，乙方須於新增工作前說明金額、工期與依據；乙方原應完成的缺漏或錯誤，不得逕列為甲方追加需求。",
      "LAIBE_OWNER_PROTECTION",
      ["DESIGN-CHANGE-REQUEST", "DESIGN-SCOPE-CHANGE"],
    ),
    article(
      "DESIGN-13-INTELLECTUAL-PROPERTY",
      "第十三條｜智慧財產權",
      "著作權、使用權、修改權、施工使用權及第三人接續使用，依甲乙雙方可驗證的約定處理。DRS 僅保存約定版本並提示未決事項，不自行創設或裁判權利歸屬。",
      "GOVERNMENT_BASE",
      ["INTELLECTUAL-PROPERTY-AGREEMENT"],
    ),
    article(
      "DESIGN-14-TERMINATION",
      "第十四條｜終止與結算",
      "終止時應分別核對已完成設計階段、已交付成果、已付款、尚未開始項目及已確認追加設計，並保留正式版本、計算依據、甲乙主張、DRS Review、Owner Decision 與完整案件紀錄。",
      "LAIBE_OWNER_PROTECTION",
      ["DESIGN-TERMINATION-STATEMENT"],
    ),
  ];

  var worksArticles = [
    article(
      "WORKS-01-PARTIES",
      "第一條｜契約當事人",
      "甲方 {{OWNER_LEGAL_NAME}} 為業主，乙方 {{CONTRACTOR_LEGAL_NAME}} 為工程承攬人。DRS 不是本契約當事人、施工人、現場監工、現場驗收人、工程鑑定者、法律裁判者、付款代理人、工程款保管人或施工品質保證人。",
      "GOVERNMENT_BASE",
      ["PARTY-IDENTIFICATION"],
    ),
    article(
      "WORKS-02-SCOPE",
      "第二條｜工程範圍",
      "正式履約基準包括本契約、正式報價單、正式施工圖、材料或設備規格、施工範圍、施工進度預定表、付款節點表、正式 Change Order 及 DRS 程序附件。各基準均須可識別 document_id 與 version。",
      "GOVERNMENT_BASE",
      ["FORMAL-QUOTATION", "FORMAL-CONSTRUCTION-DRAWINGS", "MATERIAL-SPECIFICATIONS", "CONSTRUCTION-SCHEDULE", "WORKS-PAYMENT-MILESTONES", COMMON_APPENDIX_ID],
    ),
    article(
      "WORKS-03-AMOUNT",
      "第三條｜工程總價",
      "工程總價為 {{PROJECT_TOTAL_AMOUNT}}。總價、稅費、排除項目、估價依據及正式變更均應綁定可追溯的報價與契約版本，不得以未確認資料取代正式基準。",
      "GOVERNMENT_BASE",
      ["FORMAL-QUOTATION"],
    ),
    article(
      "WORKS-04-SCHEDULE",
      "第四條｜工程工期",
      "預定開工日為 {{PROJECT_START_AT}}，預定完工日為 {{PROJECT_END_AT}}；施工進度表識別為 {{CONSTRUCTION_SCHEDULE_ID}}、版本為 {{CONSTRUCTION_SCHEDULE_VERSION}}。任何調整均須依工期變更程序留下原版本、原因及影響。",
      "GOVERNMENT_BASE",
      ["CONSTRUCTION-SCHEDULE"],
    ),
    article(
      "WORKS-05-PAYMENT-SYSTEM",
      "第五條｜工程付款制度",
      "簽約款為工程總價 5%；施工進度款池合計為 80%，每一節點不得超過工程總價 10%，期數依施工進度預定表及該節點報價工項工程價值動態產生；尾款為 15%。若一階段工程價值超過 10%，應依合理施工節點拆分。FINAL_ACCEPTANCE_COMPLETED 與 WARRANTY_PLEDGE_SIGNED 均成立後，由 DRS 核對相關文件與程序並形成 FINAL_PAYMENT_READY_FOR_OWNER_DECISION，再由甲方作成明示 Owner Decision；僅甲方決定 APPROVE 後始進入 FINAL_PAYMENT_ACTION。DRS Review 不等於付款決定，且不設任何保固金或保固保證金。",
      "LAIBE_OWNER_PROTECTION",
      ["WORKS-PAYMENT-MILESTONES", "FINAL-ACCEPTANCE-RECORD", "WARRANTY-PLEDGE"],
    ),
    article(
      "WORKS-06-PAYMENT-MILESTONES",
      "第六條｜付款節點內容",
      "每一施工付款節點至少包含 milestone_id、milestone_name、work_scope、quotation_refs、drawing_refs、scheduled_start、scheduled_end、payment_rate、payment_amount、required_evidence、hold_point、drs_review 與 owner_decision；各期合計須回到進度款池 80%。",
      "LAIBE_OWNER_PROTECTION",
      ["WORKS-PAYMENT-MILESTONES"],
    ),
    article(
      "WORKS-07-PAYMENT-APPLICATION",
      "第七條｜乙方請款程序",
      "乙方請款時應完成該節點約定工作、提交契約約定資料、標明相關報價與圖說版本，並揭露尚未完成或保留事項。缺少必要資料時，狀態為 PAYMENT_APPLICATION_PROCEDURALLY_INCOMPLETE，DRS 得依既有契約義務要求補件。",
      "DRS_GOVERNANCE",
      ["PAYMENT-APPLICATION", "MILESTONE-EVIDENCE"],
    ),
    article(
      "WORKS-08-DRS-PAYMENT-REVIEW",
      "第八條｜DRS Review 與工程付款",
      "付款程序依序為 Source Evidence、DRS Review、Owner Decision、Payment Action。DRS 僅核對資料、版本與程序，不自行創設付款義務；甲方應依約在合理期間作成明示 Decision，不得無正當理由無限期擱置。",
      "DRS_GOVERNANCE",
      ["DRS-REVIEW-RECORD", "OWNER-DECISION-RECORD", "PAYMENT-ACTION-RECORD"],
    ),
    article(
      "WORKS-09-HOLD-POINT",
      "第九條｜不可逆工序 Hold Point",
      "防水覆蓋前、水電封閉前、天花封板前、牆體封板前或地坪覆蓋前，得依付款節點表設定 HOLD_POINT=TRUE。乙方須於下一工序前完成契約約定的證據留存；DRS 只核對資料與程序，不作現場查驗或品質保證。",
      "LAIBE_OWNER_PROTECTION",
      ["HOLD-POINT-REGISTER", "CONSTRUCTION-PHOTO-EVIDENCE"],
    ),
    article(
      "WORKS-10-CHANGE-ORDER",
      "第十條｜追加、減作與變更",
      "變更原則上須於施工前建立 CHANGE_REQUEST，記錄變更原因、原契約依據、原報價與圖說、新增或減少工項、價金差異、工期差異及付款節點影響。DRS 得作 baseline comparison；僅在甲方明示確認且甲乙雙方有可驗證意思表示後，方建立 CHANGE_ORDER 並納入正式履約基準。",
      "LAIBE_OWNER_PROTECTION",
      ["CHANGE-REQUEST", "CHANGE-ORDER"],
    ),
    article(
      "WORKS-11-SCHEDULE-CHANGE",
      "第十一條｜工期變更",
      "工期調整須建立 SCHEDULE_CHANGE，記錄原施工進度表、變更原因、責任主張、日期影響、相關文件版本及甲乙確認；不得無痕修改原 Schedule。",
      "LAIBE_OWNER_PROTECTION",
      ["SCHEDULE-CHANGE"],
    ),
    article(
      "WORKS-12-ACCEPTANCE-DEFECTS",
      "第十二條｜驗收及瑕疵改善",
      "甲方依契約、圖說、報價、材料規格、Change Order 與現場狀況進行實際驗收。DRS 文件 Review 不等於現場驗收。缺失須留下內容、責任主張、改善期限、改善紀錄及甲方確認；無法僅靠文件判定者，應標示需要外部專業或現場確認。",
      "LAIBE_OWNER_PROTECTION",
      ["FINAL-ACCEPTANCE-RECORD", "DEFECT-REMEDIATION-REGISTER"],
    ),
    article(
      "WORKS-13-WARRANTY",
      "第十三條｜保固",
      "乙方負 WARRANTY_OBLIGATION，並須於尾款前完成 WARRANTY_PLEDGE_SIGNED。保固切結至少記載保固項目、保固期限、保固起算日、報修方式、合理改善方式及排除事項；本契約不設任何保固金或保固保證金。",
      "LAIBE_OWNER_PROTECTION",
      ["WARRANTY-PLEDGE"],
    ),
    article(
      "WORKS-14-FALLBACK",
      "第十四條｜DRS 不可用替代程序",
      "DRS 暫時不能使用時，甲乙雙方以 {{DRS_FALLBACK_CHANNEL}} 作為替代提交及確認管道，並於服務恢復後補存可驗證的時間、文件、版本及意思表示。不得因 DRS 系統故障使甲乙契約無法履行。",
      "DRS_GOVERNANCE",
      [COMMON_APPENDIX_ID],
    ),
  ];

  var designBuildArticles = [
    article(
      "DESIGN_BUILD-01-DOMAIN-SEPARATION",
      "第一條｜設計與工程分離識別",
      "統包契約同時保有 DESIGN DOMAIN 與 WORKS DOMAIN。設計服務費為 {{TOTAL_DESIGN_FEE}}，工程總價為 {{PROJECT_TOTAL_AMOUNT}}，兩者須分開識別、計價、付款、變更及結算，不得混成用途不明的單一付款百分比。",
      "LAIBE_OWNER_PROTECTION",
      ["DESIGN-SCOPE", "FORMAL-QUOTATION"],
    ),
    article(
      "DESIGN_BUILD-02-DESIGN-PAYMENT",
      "第二條｜設計費付款",
      "設計部分依序為：簽約 20%；3D＋平面／系統圖交付 10%；第一次細部施工圖＋報價單交付 30%；整體設計交付 40%，合計 100%。各節點均須綁定設計成果版本、DRS Review 及明示 Owner Decision。",
      "LAIBE_OWNER_PROTECTION",
      ["DESIGN-PAYMENT-SCHEDULE", "DESIGN-DELIVERY-RECORD"],
    ),
    article(
      "DESIGN_BUILD-03-WORKS-PAYMENT",
      "第三條｜工程款付款",
      "工程部分使用簽約款 5%、施工進度款池 80% 及尾款 15%。每期進度款不得超過工程總價 10%，期數依施工節點工程價值動態產生。FINAL_ACCEPTANCE_COMPLETED 與 WARRANTY_PLEDGE_SIGNED 均成立後，由 DRS 核對相關文件與程序並形成 FINAL_PAYMENT_READY_FOR_OWNER_DECISION，再由甲方作成明示 Owner Decision；僅甲方決定 APPROVE 後始進入 FINAL_PAYMENT_ACTION。DRS Review 不等於付款決定，且不設任何保固金或保固保證金。",
      "LAIBE_OWNER_PROTECTION",
      ["WORKS-PAYMENT-MILESTONES", "FINAL-ACCEPTANCE-RECORD", "WARRANTY-PLEDGE"],
    ),
    article(
      "DESIGN_BUILD-04-RELEASE-GATE",
      "第四條｜Design-to-Construction Gate",
      "正式施工前至少須具備已確認設計基準、正式施工圖、正式工程報價、施工進度預定表及工程付款節點。DRS 核對設計、圖說、報價與施工進度的一致性及缺件，形成 READY_FOR_OWNER_DECISION 後，由甲方明示作成 CONSTRUCTION_RELEASE。DRS Review 不取代甲方決定。",
      "DRS_GOVERNANCE",
      ["CONFIRMED-DESIGN-BASELINE", "FORMAL-CONSTRUCTION-DRAWINGS", "FORMAL-QUOTATION", "CONSTRUCTION-SCHEDULE", "WORKS-PAYMENT-MILESTONES"],
    ),
    article(
      "DESIGN_BUILD-05-EARLY-CONSTRUCTION",
      "第五條｜提前施工",
      "甲方要求於部分設計尚未完成前施工時，須建立 OWNER_EARLY_CONSTRUCTION_OVERRIDE，記錄尚缺資料、提前施工範圍、已知風險、原 DRS Review、甲乙確認狀態、甲方 Decision 及時間；該 Override 不得改寫原 Review。",
      "LAIBE_OWNER_PROTECTION",
      ["EARLY-CONSTRUCTION-OVERRIDE"],
    ),
    article(
      "DESIGN_BUILD-06-CHANGES",
      "第六條｜統包變更",
      "每一變更須辨識為 DESIGN_CHANGE、WORK_CHANGE 或 SCOPE_CHANGE，並分別說明原基準、原因、設計費或工程款差異、工期、版本、付款節點影響及甲乙確認，不得以單一追加欄位混用。",
      "LAIBE_OWNER_PROTECTION",
      ["DESIGN-CHANGE-REQUEST", "WORK-CHANGE-REQUEST", "SCOPE-CHANGE-REQUEST"],
    ),
    article(
      "DESIGN_BUILD-07-TERMINATION",
      "第七條｜統包終止",
      "終止時應分開結算設計已完成部分、工程已完成部分、設計已付款、工程已付款、材料、正式 Change Order 及尚未完成事項，並保留各 domain 的版本、依據、DRS Review、Owner Decision 與案件紀錄。",
      "LAIBE_OWNER_PROTECTION",
      ["DESIGN-BUILD-TERMINATION-STATEMENT"],
    ),
  ];

  var commonArticles = [
    article(
      "COMMON-01-DRS-ROLE",
      "第一條｜DRS 角色",
      "DRS 提供文件核對、版本識別、差異整理、補件、Milestone 程序核對、變更核對、Owner Decision 輔助及 Decision & Record 留痕。DRS 不是甲乙契約當事人，不提供現場監工、現場驗收、工程品質保證、法律裁判、工程鑑定、工程款保管或直接付款決定。",
      "DRS_GOVERNANCE",
      [COMMON_APPENDIX_ID],
    ),
    article(
      "COMMON-02-SUBMISSION",
      "第二條｜資料提交",
      "乙方依主契約已存在的義務提交契約、報價、圖說、進度、照片、材料、變更、請款資料及其他約定 Evidence。DRS 不得自行增加乙方主契約不存在的義務；每次補件要求均須指向契約依據。",
      "DRS_GOVERNANCE",
      ["SUBMISSION-REGISTER"],
    ),
    article(
      "COMMON-03-VERSION",
      "第三條｜版本",
      "重要文件應具有 DOCUMENT_ID、VERSION、SUBMITTED_BY 與 SUBMITTED_AT。新版本不得無痕覆寫舊版本；確認、Review、Decision 與後續變更均須綁定特定文件版本。",
      "DRS_GOVERNANCE",
      ["DOCUMENT-VERSION-REGISTER"],
    ),
    article(
      "COMMON-04-SUPPLEMENT",
      "第四條｜補件",
      "DRS 得就缺件、版本無法確認、契約與報價或圖說的明顯矛盾、請款資料不足、變更資料不足或 Evidence 未提交，要求補充或釐清。要求須有明確原因並對應主契約既有義務。",
      "DRS_GOVERNANCE",
      ["SUPPLEMENT-REQUEST"],
    ),
    article(
      "COMMON-05-REVIEW",
      "第五條｜DRS Review",
      "DRS Review 狀態限於 READY_FOR_OWNER_DECISION、SUPPLEMENT_REQUIRED、DISCREPANCY_REQUIRES_DECISION、INSUFFICIENT_EVIDENCE 及 EXTERNAL_PROFESSIONAL_REVIEW_REQUIRED。Review 須記載使用依據、版本、差異、缺件、理由及下一責任人；Review 不等於 Owner Decision，也不直接成立付款決定。",
      "DRS_GOVERNANCE",
      ["DRS-REVIEW-RECORD"],
    ),
    article(
      "COMMON-06-OWNER-DECISION",
      "第六條｜Owner Decision",
      "甲方為最終 Decision Owner，須就特定 Review 與文件版本明示選擇 APPROVE、OBJECT、REQUEST_SUPPLEMENT、APPROVE_WITH_RESERVATION 或 OWNER_OVERRIDE。沉默不構成 APPROVE；決策須留下 actor、timestamp、依據、版本、結果與下一步。",
      "DRS_GOVERNANCE",
      ["OWNER-DECISION-RECORD"],
    ),
    article(
      "COMMON-07-PARTY-AGREEMENT",
      "第七條｜Party Agreement",
      "只有甲乙雙方均有可驗證意思表示，始得記錄 PARTY_AGREEMENT。只有甲方陳述存在私下約定時，僅得記錄 OWNER_REPORTED_PRIVATE_AGREEMENT，並保持待乙方確認，不得取代雙方合意。",
      "DRS_GOVERNANCE",
      ["PARTY-AGREEMENT-RECORD"],
    ),
    article(
      "COMMON-08-OWNER-OVERRIDE",
      "第八條｜Owner Override",
      "Owner Override 不得改寫原 DRS Review。紀錄必須保留原 Review、甲方理由、相關證據、Decision、actor 與時間，使後續使用者可分辨程序審查與甲方最終決定。",
      "DRS_GOVERNANCE",
      ["OWNER-OVERRIDE-RECORD"],
    ),
    article(
      "COMMON-09-CHANGE",
      "第九條｜Change",
      "正式 Change Order 應保留原基準、原因、金額、工期、文件版本、付款節點影響及甲乙確認。未取得雙方可驗證意思表示前，僅得維持為變更請求或待決策事項，不得無痕改入正式履約基準。",
      "DRS_GOVERNANCE",
      ["CHANGE-REQUEST", "CHANGE-ORDER"],
    ),
    article(
      "COMMON-10-RECORD",
      "第十條｜Record",
      "案件至少保存 actor、timestamp、case、document、version、action、review、decision 與 milestone，並記錄目前狀態、下一責任人及所依據的文件。重要紀錄不得無痕覆寫；更正須保留原值、原因、時間與更正者。",
      "DRS_GOVERNANCE",
      ["CASE-RECORD-REGISTER"],
    ),
  ];

  var source = {
    sourceId: "LAIBE-PROJECT-CONTRACT-SOURCE-v0.2",
    browserGlobal: "LaibeProjectContractSource",
    templateVersion: TEMPLATE_VERSION,
    legalStatus: "LEGAL_REVIEW_REQUIRED",
    legalReviewCompleted: false,
    legalNotice: "本契約文字來源尚須由合格法律專業人員依實際案件、當事人與適用法令完成審查；不得宣稱已完成法律審定。",
    contractTypes: ["DESIGN", "WORKS", "DESIGN_BUILD"],
    legacyContractTypeMap: {
      design: "DESIGN",
      works: "WORKS",
      dt: "DESIGN_BUILD",
    },
    sourceTypes: ["GOVERNMENT_BASE", "LAIBE_OWNER_PROTECTION", "DRS_GOVERNANCE", "CASE_GENERATED", "USER_EDITED"],
    fields: {
      common: commonMetadataFields,
      signed: signedMetadataFields,
      design: ["{{DESIGN_AREA}}", "{{DESIGN_SCOPE}}", "{{DESIGN_DELIVERABLE_SCHEDULE}}", "{{TOTAL_DESIGN_FEE}}"],
      works: ["{{PROJECT_TOTAL_AMOUNT}}", "{{PROJECT_START_AT}}", "{{PROJECT_END_AT}}", "{{CONSTRUCTION_SCHEDULE_ID}}", "{{CONSTRUCTION_SCHEDULE_VERSION}}"],
    },
    governance: {
      decisionOwner: "OWNER",
      drsIsContractingParty: false,
      reviewIsOwnerDecision: false,
      reviewTriggersPayment: false,
      silenceIsApproval: false,
      ownerDecisionOptions: ["APPROVE", "OBJECT", "REQUEST_SUPPLEMENT", "APPROVE_WITH_RESERVATION", "OWNER_OVERRIDE"],
      drsReviewStatuses: ["READY_FOR_OWNER_DECISION", "SUPPLEMENT_REQUIRED", "DISCREPANCY_REQUIRES_DECISION", "INSUFFICIENT_EVIDENCE", "EXTERNAL_PROFESSIONAL_REVIEW_REQUIRED"],
      partyAgreement: {
        status: "PARTY_AGREEMENT",
        requiresVerifiableIntentFromOwnerAndContractor: true,
        ownerOnlyReportStatus: "OWNER_REPORTED_PRIVATE_AGREEMENT",
      },
      ownerOverride: {
        status: "OWNER_OVERRIDE",
        preservesOriginalReview: true,
        requiredRecordFields: ["ORIGINAL_REVIEW", "REASON", "EVIDENCE", "DECISION", "ACTOR", "TIMESTAMP"],
      },
      prohibitedDrsRoles: [
        "CONTRACTING_PARTY",
        "DESIGNER",
        "CONTRACTOR",
        "SITE_SUPERVISOR",
        "SITE_ACCEPTANCE_INSPECTOR",
        "ENGINEERING_APPRAISER",
        "LEGAL_ADJUDICATOR",
        "PAYMENT_AGENT",
        "FUNDS_CUSTODIAN",
        "QUALITY_GUARANTOR",
      ],
    },
    templates: {
      DESIGN: {
        templateVersion: TEMPLATE_VERSION,
        contractType: "DESIGN",
        sourceType: "LAIBE_OWNER_PROTECTION",
        title: "建築物室內裝修委託設計契約",
        required: true,
        placeholders: commonMetadataFields.concat(signedMetadataFields, ["{{DESIGN_AREA}}", "{{DESIGN_SCOPE}}", "{{DESIGN_DELIVERABLE_SCHEDULE}}", "{{TOTAL_DESIGN_FEE}}"]),
        attachments: ["DESIGN-SCOPE", "DESIGN-DELIVERABLE-SCHEDULE", "DESIGN-PAYMENT-SCHEDULE", COMMON_APPENDIX_ID],
        commonAppendixRef: COMMON_APPENDIX_ID,
        amountFields: { designFee: "{{TOTAL_DESIGN_FEE}}" },
        paymentProfiles: { designFee: designFeeProfile },
        articles: designArticles,
      },
      WORKS: {
        templateVersion: TEMPLATE_VERSION,
        contractType: "WORKS",
        sourceType: "LAIBE_OWNER_PROTECTION",
        title: "建築物室內裝修工程承攬契約",
        required: true,
        placeholders: commonMetadataFields.concat(signedMetadataFields, ["{{PROJECT_TOTAL_AMOUNT}}", "{{PROJECT_START_AT}}", "{{PROJECT_END_AT}}", "{{CONSTRUCTION_SCHEDULE_ID}}", "{{CONSTRUCTION_SCHEDULE_VERSION}}"]),
        attachments: ["FORMAL-QUOTATION", "FORMAL-CONSTRUCTION-DRAWINGS", "MATERIAL-SPECIFICATIONS", "CONSTRUCTION-SCHEDULE", "WORKS-PAYMENT-MILESTONES", COMMON_APPENDIX_ID],
        commonAppendixRef: COMMON_APPENDIX_ID,
        amountFields: { worksAmount: "{{PROJECT_TOTAL_AMOUNT}}" },
        paymentProfiles: { worksAmount: worksAmountProfile },
        articles: worksArticles,
      },
      DESIGN_BUILD: {
        templateVersion: TEMPLATE_VERSION,
        contractType: "DESIGN_BUILD",
        sourceType: "LAIBE_OWNER_PROTECTION",
        title: "建築物室內裝修設計委託及工程承攬契約",
        required: true,
        placeholders: commonMetadataFields.concat(signedMetadataFields, ["{{DESIGN_AREA}}", "{{DESIGN_SCOPE}}", "{{DESIGN_DELIVERABLE_SCHEDULE}}", "{{TOTAL_DESIGN_FEE}}", "{{PROJECT_TOTAL_AMOUNT}}", "{{PROJECT_START_AT}}", "{{PROJECT_END_AT}}", "{{CONSTRUCTION_SCHEDULE_ID}}", "{{CONSTRUCTION_SCHEDULE_VERSION}}"]),
        attachments: ["DESIGN-SCOPE", "DESIGN-DELIVERABLE-SCHEDULE", "DESIGN-PAYMENT-SCHEDULE", "FORMAL-QUOTATION", "FORMAL-CONSTRUCTION-DRAWINGS", "CONSTRUCTION-SCHEDULE", "WORKS-PAYMENT-MILESTONES", COMMON_APPENDIX_ID],
        commonAppendixRef: COMMON_APPENDIX_ID,
        amountFields: {
          designFee: "{{TOTAL_DESIGN_FEE}}",
          worksAmount: "{{PROJECT_TOTAL_AMOUNT}}",
        },
        paymentProfiles: {
          designFee: designFeeProfile,
          worksAmount: worksAmountProfile,
        },
        designToConstructionGate: {
          requiredBasis: [
            "CONFIRMED_DESIGN_BASELINE",
            "FORMAL_CONSTRUCTION_DRAWINGS",
            "FORMAL_WORKS_QUOTATION",
            "CONSTRUCTION_SCHEDULE",
            "WORKS_PAYMENT_MILESTONES",
          ],
          drsResult: "READY_FOR_OWNER_DECISION",
          ownerDecision: "CONSTRUCTION_RELEASE",
          earlyOverride: "OWNER_EARLY_CONSTRUCTION_OVERRIDE",
          preservesOriginalReview: true,
        },
        articles: designBuildArticles,
      },
    },
    commonProcedureAppendix: {
      appendixId: COMMON_APPENDIX_ID,
      templateVersion: TEMPLATE_VERSION,
      sourceType: "DRS_GOVERNANCE",
      title: "LaiBE DRS 案件治理程序",
      required: true,
      placeholders: ["{{DRS_PROCEDURE_VERSION}}", "{{DESIGNATED_COMMUNICATION_CHANNEL}}", "{{DRS_FALLBACK_CHANNEL}}"],
      attachments: [],
      articles: commonArticles,
    },
  };

  return deepFreeze(source);
});
