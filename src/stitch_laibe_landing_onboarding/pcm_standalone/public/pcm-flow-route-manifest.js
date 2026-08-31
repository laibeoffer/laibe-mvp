const safeCreate = Object.create;
const safeDefineProperty = Object.defineProperty;
const safeFreeze = Object.freeze;
const safeSetPrototypeOf = Object.setPrototypeOf;
const iteratorKey = Symbol.iterator;

function iteratorResult(done, value) {
  const result = safeCreate(null);
  safeDefineProperty(result, "done", { value: done, enumerable: true });
  safeDefineProperty(result, "value", { value, enumerable: true });
  return safeFreeze(result);
}

function freezeOwnList(...items) {
  const list = [];
  safeSetPrototypeOf(list, null);
  for (let index = 0; index < items.length; index += 1) {
    safeDefineProperty(list, String(index), {
      value: items[index],
      enumerable: true,
    });
  }
  safeDefineProperty(list, iteratorKey, {
    value: () => {
      let index = 0;
      const iterator = safeCreate(null);
      safeDefineProperty(iterator, "next", {
        value: () => index < list.length
          ? iteratorResult(false, list[index++])
          : iteratorResult(true, undefined),
      });
      safeDefineProperty(iterator, iteratorKey, { value: () => iterator });
      return safeFreeze(iterator);
    },
  });
  return safeFreeze(list);
}

const freezeRecord = (record) => safeFreeze({ ...record });
const NO_ACTIONS = freezeOwnList();

export const OWNER_WORKSPACE_NORMAL_ROUTE = "HOLD";

export const PCM_FLOW_GATES = Object.freeze([
  freezeRecord({ id: "G1_UI_SOURCE", label: "介面與路徑來源", owner: "A0", state: "active" }),
  freezeRecord({ id: "G2_AUTH_RUNTIME", label: "身分與角色確認", owner: "A6", state: "closed" }),
  freezeRecord({ id: "G3_DURABLE_DATA", label: "正式資料與案件紀錄", owner: "A5 與 canonical producers", state: "closed" }),
  freezeRecord({ id: "G4_PRODUCTION", label: "正式環境上線", owner: "A0 final", state: "closed" }),
]);

export const PCM_FLOW_NODES = Object.freeze([
  freezeRecord({ id: "preLanding", publicPath: "/", label: "LaiBE DRS 前導頁", role: "所有訪客", owner: "A0", lifecycle: "active", gate: "G1_UI_SOURCE", href: "../pre_landing/code.html" }),
  freezeRecord({ id: "home", publicPath: "/pcm", label: "PCM 公開首頁", role: "一般屋主", owner: "A0", lifecycle: "active", gate: "G1_UI_SOURCE", href: "../public_home/code.html#top" }),
  freezeRecord({ id: "aboutDrs", publicPath: "/pcm/about-drs", label: "關於 DRS", role: "一般屋主", owner: "A0", lifecycle: "active", gate: "G1_UI_SOURCE", href: "../about_drs/code.html" }),
  freezeRecord({ id: "quoteCheck", publicPath: "/pcm/quote-check", label: "報價健檢", role: "甲方", owner: "A0", lifecycle: "active", gate: "G1_UI_SOURCE", href: "../quote_check/code.html" }),
  freezeRecord({ id: "drawingCheck", publicPath: "/pcm/drawing-check", label: "圖說檢討", role: "甲方", owner: "A0", lifecycle: "active", gate: "G1_UI_SOURCE", href: "../drawing_check/code.html" }),
  freezeRecord({ id: "accountAccess", publicPath: "/account/access", label: "甲乙方註冊與登入", role: "甲方與乙方", owner: "A0", lifecycle: "active", gate: "G1_UI_SOURCE", href: "../account_access/code.html" }),
  freezeRecord({ id: "caseSetup", publicPath: "/pcm/case/setup", label: "案件建立與正式 PCM 申請", role: "甲方", owner: "A0", lifecycle: "planned", gate: "G2_AUTH_RUNTIME", href: null }),
  freezeRecord({ id: "serviceContract", publicPath: "/pcm/service-contract", label: "PCM 服務契約", role: "甲方與受邀乙方", owner: "A0", lifecycle: "active", gate: "G1_UI_SOURCE", href: "../service_contract/code.html" }),
  freezeRecord({ id: "contractPrerequisites", publicPath: "/pcm/contract/prerequisites", label: "契約待補項目", role: "甲方與受邀乙方", owner: "A0", lifecycle: "active", gate: "G1_UI_SOURCE", href: "../contract_prerequisites/code.html" }),
  freezeRecord({ id: "contractSigning", publicPath: "/pcm/contract/sign", label: "PCM 契約簽訂", role: "甲方與受邀乙方", owner: "A0", lifecycle: "active", gate: "G1_UI_SOURCE", href: "../contract_signing/code.html" }),
  freezeRecord({ id: "ownerWorkspace", publicPath: "/pcm/owner/workspace", label: "甲方案件工作台", role: "已授權甲方", owner: "A0", lifecycle: "active", gate: "G1_UI_SOURCE", href: "../../client_awarding_dashboard/code.html" }),
  freezeRecord({ id: "vendorInvitation", publicPath: "/pcm/vendor/invitation", label: "乙方邀請與成員確認", role: "受邀乙方", owner: "A6", lifecycle: "planned", gate: "G2_AUTH_RUNTIME", href: null }),
  freezeRecord({ id: "vendorWorkspace", publicPath: "/pcm/vendor/workspace", label: "乙方案件工作台", role: "已授權乙方", owner: "A6", lifecycle: "active", gate: "G1_UI_SOURCE", href: "../vendor_workspace/code.html" }),
  freezeRecord({ id: "reviewerAccess", publicPath: "/pcm/reviewer/access", label: "DRS 審查員帳號入口", role: "DRS 審查員", owner: "A3", lifecycle: "active", gate: "G1_UI_SOURCE", href: "../../drs_standalone/reviewer_access/code.html" }),
  freezeRecord({ id: "pcmAuthorizedList", publicPath: "/pcm/console", label: "DRS 案件審查入口", role: "DRS 專員", owner: "A6", lifecycle: "active", gate: "G2_AUTH_RUNTIME", href: "../../drs_standalone/specialist_workspace/code.html#governance-inbox" }),
  freezeRecord({ id: "pcmCaseWorkspace", publicPath: "/pcm/console/case", label: "DRS 案件文件審查", role: "已授權 DRS 專員", owner: "A6", lifecycle: "active", gate: "G2_AUTH_RUNTIME", href: "../../drs_standalone/specialist_workspace/code.html#case-review-engineering" }),
  freezeRecord({ id: "internalGovernance", publicPath: "/pcm/governance", label: "內部治理清單", role: "管理者", owner: "A6", lifecycle: "planned", gate: "G2_AUTH_RUNTIME", href: null }),
  freezeRecord({ id: "caseRecordCenter", publicPath: "/pcm/case/records", label: "案件紀錄中心", role: "案件三方", owner: "A5", lifecycle: "planned", gate: "G3_DURABLE_DATA", href: null }),
  freezeRecord({ id: "caseCloseout", publicPath: "/pcm/case/closeout", label: "案件取消、結案與三方確認", role: "案件三方", owner: "A5", lifecycle: "planned", gate: "G3_DURABLE_DATA", href: null }),
  freezeRecord({ id: "accessUnavailable", publicPath: "/pcm/access-unavailable", label: "安全恢復入口", role: "入口使用者", owner: "A0", lifecycle: "active", gate: "G1_UI_SOURCE", href: "../access_unavailable/code.html" }),
  freezeRecord({ id: "legacyPcmRoot", publicPath: null, label: "舊 PCM 示範案件入口", role: "舊入口使用者", owner: "A0", lifecycle: "retired", gate: "G1_UI_SOURCE", href: null, replacement: "home" }),
  freezeRecord({ id: "legacyMarketRoutes", publicPath: null, label: "舊市場流程入口", role: "舊入口使用者", owner: "A0", lifecycle: "retired", gate: "G1_UI_SOURCE", href: null, replacement: "home" }),
]);

export const PCM_FLOW_COMPATIBILITY_ALIASES = Object.freeze([
  freezeRecord({ id: "ownerStart", lifecycle: "RETIRED_COMPATIBILITY", canonicalHref: null, compatibilityHref: "../owner_start/code.html", replacementRoute: "accountAccess" }),
  freezeRecord({ id: "documentCorrections", lifecycle: "RETIRED_COMPATIBILITY", canonicalHref: null, compatibilityHref: "../document_corrections/code.html", replacementRoute: "quoteCheck" }),
  freezeRecord({ id: "basicReport", lifecycle: "RETIRED_COMPATIBILITY", canonicalHref: null, compatibilityHref: "../basic_report/code.html", replacementRoute: "quoteCheck" }),
  freezeRecord({ id: "selfServiceArchive", lifecycle: "RETIRED_COMPATIBILITY", canonicalHref: null, compatibilityHref: "../self_service_archive/code.html", replacementRoute: "ownerWorkspace" }),
]);

export const PCM_FLOW_CANONICAL_LINKS = Object.freeze([
  freezeRecord({
    id: "homeServiceConfirmationToOwnerContractManagement",
    fromPage: "home",
    trigger: "前往契約管理",
    toPage: "accountAccess",
    targetAnchor: null,
    relativeHref: "../account_access/code.html?intent=owner-contract-management",
    canonicalHttpUrl: "/account/access?intent=owner-contract-management",
    expectedVisibleState: "帳號入口先說明甲方契約管理目的；正式身分與案件權限確認後才會開放相應工作台。",
    returnRoute: "home",
    routeState: "active",
  }),
  freezeRecord({
    id: "homeHeaderServiceContractToOwnerContractManagement",
    fromPage: "home",
    trigger: "DRS 契約管理",
    toPage: "accountAccess",
    targetAnchor: null,
    relativeHref: "../account_access/code.html?intent=owner-contract-management",
    canonicalHttpUrl: "/account/access?intent=owner-contract-management",
    expectedVisibleState: "帳號入口先說明甲方契約管理目的；正式身分與案件權限確認後才會開放相應工作台。",
    returnRoute: "home",
    routeState: "active",
  }),
  freezeRecord({
    id: "homeHeaderAboutDrsToAboutDrs",
    fromPage: "home",
    trigger: "關於 DRS",
    toPage: "aboutDrs",
    targetAnchor: null,
    relativeHref: "../about_drs/code.html",
    canonicalHttpUrl: "/pcm/about-drs",
    expectedVisibleState: "關於 DRS 頁載入，甲方可理解書面核對、決策責任與案件留痕的服務邊界。",
    returnRoute: "home",
    routeState: "active",
  }),
  freezeRecord({
    id: "homeDecisionQuoteCheckToQuoteCheck",
    fromPage: "home",
    trigger: "報價健檢",
    toPage: "quoteCheck",
    targetAnchor: "#document-workspace",
    relativeHref: "../quote_check/code.html?mode=quote#document-workspace",
    canonicalHttpUrl: "/pcm/quote-check?mode=quote#document-workspace",
    expectedVisibleState: "文件健檢工作台以報價健檢模式載入，顯示報價文件入口、目前狀態與下一步。",
    returnRoute: "home",
    routeState: "active",
  }),
  freezeRecord({
    id: "homeDecisionDrawingCheckToQuoteCheck",
    fromPage: "home",
    trigger: "圖說檢查",
    toPage: "drawingCheck",
    targetAnchor: null,
    relativeHref: "../drawing_check/code.html",
    canonicalHttpUrl: "/pcm/drawing-check",
    expectedVisibleState: "圖說檢討頁載入，顯示施工圖文件入口、目前狀態與下一步。",
    returnRoute: "home",
    routeState: "active",
  }),
  freezeRecord({
    id: "homeDecisionCustomContractToQuoteCheck",
    fromPage: "home",
    trigger: "契約健檢",
    toPage: "quoteCheck",
    targetAnchor: "#document-workspace",
    relativeHref: "../quote_check/code.html?mode=contract#document-workspace",
    canonicalHttpUrl: "/pcm/quote-check?mode=contract#document-workspace",
    expectedVisibleState: "文件健檢工作台以契約健檢模式載入，顯示專案契約文件入口、目前狀態與下一步。",
    returnRoute: "home",
    routeState: "active",
  }),
  freezeRecord({
    id: "accountAccessOwnerLoginToOwnerWorkspace",
    fromPage: "accountAccess",
    trigger: "valid login submit with owner role selected",
    toPage: "ownerWorkspace",
    targetAnchor: null,
    relativeHref: null,
    canonicalHttpUrl: null,
    expectedVisibleState: "正式身分入口尚未完成，甲方案件工作台正常入口仍在等待。",
    returnRoute: "accountAccess",
    routeState: "hold",
  }),
  freezeRecord({
    id: "accountAccessInvitedPartnerLoginToVendorWorkspace",
    fromPage: "accountAccess",
    trigger: "valid login submit with invited-partner role selected",
    toPage: "vendorWorkspace",
    targetAnchor: null,
    relativeHref: "../vendor_workspace/code.html",
    canonicalHttpUrl: "/pcm/vendor/workspace",
    expectedVisibleState: "乙方案件工作台載入；身分與案件範圍未確認時維持零案件資料與安全空狀態。",
    returnRoute: "accountAccess",
    routeState: "active",
  }),
  freezeRecord({
    id: "quoteCheckBrandToHome",
    fromPage: "quoteCheck",
    trigger: "LaiBE DRS 品牌標誌",
    toPage: "home",
    targetAnchor: "#top",
    relativeHref: "../public_home/code.html#top",
    canonicalHttpUrl: "/pcm#top",
    expectedVisibleState: "DRS 公開首頁由頁首載入。",
    returnRoute: "quoteCheck",
    routeState: "active",
  }),
  freezeRecord({
    id: "quoteCheckHeaderHomeToHome",
    fromPage: "quoteCheck",
    trigger: "DRS 首頁",
    toPage: "home",
    targetAnchor: "#top",
    relativeHref: "../public_home/code.html#top",
    canonicalHttpUrl: "/pcm#top",
    expectedVisibleState: "DRS 公開首頁由頁首載入。",
    returnRoute: "quoteCheck",
    routeState: "active",
  }),
  freezeRecord({
    id: "accountAccessBrandToHome",
    fromPage: "accountAccess",
    trigger: "LaiBE DRS 品牌標誌",
    toPage: "home",
    targetAnchor: "#top",
    relativeHref: "../public_home/code.html#top",
    canonicalHttpUrl: "/pcm#top",
    expectedVisibleState: "DRS 公開首頁由頁首載入。",
    returnRoute: "accountAccess",
    routeState: "active",
  }),
  freezeRecord({
    id: "accountAccessHeaderHomeToHome",
    fromPage: "accountAccess",
    trigger: "返回 DRS 首頁",
    toPage: "home",
    targetAnchor: "#top",
    relativeHref: "../public_home/code.html#top",
    canonicalHttpUrl: "/pcm#top",
    expectedVisibleState: "DRS 公開首頁由頁首載入。",
    returnRoute: "accountAccess",
    routeState: "active",
  }),
  freezeRecord({
    id: "accountAccessHeaderStartDocumentCheckToQuoteCheck",
    fromPage: "accountAccess",
    trigger: "開始文件健檢",
    toPage: "quoteCheck",
    targetAnchor: "#document-workspace",
    relativeHref: "../quote_check/code.html?mode=quote#document-workspace",
    canonicalHttpUrl: "/pcm/quote-check?mode=quote#document-workspace",
    expectedVisibleState: "文件健檢工作台以報價健檢模式載入，顯示報價文件入口、目前狀態與下一步。",
    returnRoute: "accountAccess",
    routeState: "active",
  }),
  freezeRecord({
    id: "aboutDrsBrandToHome",
    fromPage: "aboutDrs",
    trigger: "LaiBE DRS 品牌標誌",
    toPage: "home",
    targetAnchor: "#top",
    relativeHref: "../public_home/code.html#top",
    canonicalHttpUrl: "/pcm#top",
    expectedVisibleState: "DRS 公開首頁由頁首載入。",
    returnRoute: "aboutDrs",
    routeState: "active",
  }),
  freezeRecord({
    id: "aboutDrsHeaderHomeToHome",
    fromPage: "aboutDrs",
    trigger: "DRS 首頁",
    toPage: "home",
    targetAnchor: "#top",
    relativeHref: "../public_home/code.html#top",
    canonicalHttpUrl: "/pcm#top",
    expectedVisibleState: "DRS 公開首頁由頁首載入。",
    returnRoute: "aboutDrs",
    routeState: "active",
  }),
  freezeRecord({
    id: "aboutDrsHeaderStartDocumentCheckToQuoteCheck",
    fromPage: "aboutDrs",
    trigger: "開始文件健檢",
    toPage: "quoteCheck",
    targetAnchor: "#document-workspace",
    relativeHref: "../quote_check/code.html?mode=quote#document-workspace",
    canonicalHttpUrl: "/pcm/quote-check?mode=quote#document-workspace",
    expectedVisibleState: "文件健檢工作台以報價健檢模式載入，顯示報價文件入口、目前狀態與下一步。",
    returnRoute: "aboutDrs",
    routeState: "active",
  }),
  freezeRecord({
    id: "serviceContractBrandToHome",
    fromPage: "serviceContract",
    trigger: "LaiBE DRS 品牌標誌",
    toPage: "home",
    targetAnchor: "#top",
    relativeHref: "../public_home/code.html#top",
    canonicalHttpUrl: "/pcm#top",
    expectedVisibleState: "未帶可信甲方契約管理來源時，DRS 公開首頁由頁首載入。",
    returnRoute: "serviceContract",
    routeState: "active",
  }),
  freezeRecord({
    id: "serviceContractHeaderHomeToHome",
    fromPage: "serviceContract",
    trigger: "返回 DRS 首頁",
    toPage: "home",
    targetAnchor: "#top",
    relativeHref: "../public_home/code.html#top",
    canonicalHttpUrl: "/pcm#top",
    expectedVisibleState: "未帶可信甲方契約管理來源時，DRS 公開首頁由頁首載入。",
    returnRoute: "serviceContract",
    routeState: "active",
  }),
  freezeRecord({
    id: "serviceContractTrustedOwnerReturnToOwnerContractManagement",
    fromPage: "serviceContract",
    trigger: "returnTo=owner-contract",
    toPage: "ownerWorkspace",
    targetAnchor: "#owner-dashboard-panel-contract",
    relativeHref: "../../client_awarding_dashboard/code.html#owner-dashboard-panel-contract",
    canonicalHttpUrl: "/pcm/owner/workspace#owner-dashboard-panel-contract",
    expectedVisibleState: "可信甲方契約管理來源返回甲方工作台，並選取「契約管理」主分頁。",
    returnRoute: "serviceContract",
    routeState: "conditional",
  }),
  freezeRecord({
    id: "ownerWorkspaceBrandToHome",
    fromPage: "ownerWorkspace",
    trigger: "LaiBE DRS 品牌標誌",
    toPage: "home",
    targetAnchor: "#top",
    relativeHref: "../public_home/code.html#top",
    canonicalHttpUrl: "/pcm#top",
    expectedVisibleState: "DRS 公開首頁由頁首載入。",
    returnRoute: "ownerWorkspace",
    routeState: "active",
  }),
  freezeRecord({
    id: "ownerWorkspaceContractManagementToServiceContract",
    fromPage: "ownerWorkspace",
    trigger: "了解並確認 DRS 服務契約",
    toPage: "serviceContract",
    targetAnchor: "#full-contract",
    relativeHref: "../pcm_standalone/service_contract/code.html?returnTo=owner-contract#full-contract",
    canonicalHttpUrl: "/pcm/service-contract?returnTo=owner-contract#full-contract",
    expectedVisibleState: "從甲方工作台契約管理進入 DRS 服務契約完整內容；服務契約頁可返回甲方契約管理。",
    returnRoute: "ownerWorkspace",
    routeState: "active",
  }),
  freezeRecord({
    id: "vendorWorkspaceBrandToHome",
    fromPage: "vendorWorkspace",
    trigger: "LaiBE DRS 品牌標誌",
    toPage: "home",
    targetAnchor: "#top",
    relativeHref: "../public_home/code.html#top",
    canonicalHttpUrl: "/pcm#top",
    expectedVisibleState: "DRS 公開首頁由頁首載入。",
    returnRoute: "vendorWorkspace",
    routeState: "active",
  }),
  freezeRecord({
    id: "vendorWorkspaceAccessRecoveryToAccountAccess",
    fromPage: "vendorWorkspace",
    trigger: "返回登入／帳號入口",
    toPage: "accountAccess",
    targetAnchor: "#top",
    relativeHref: "../account_access/code.html#top",
    canonicalHttpUrl: "/account/access#top",
    expectedVisibleState: "使用者回到帳號入口選擇或確認角色，不帶入任何案件資料。",
    returnRoute: "vendorWorkspace",
    routeState: "active",
  }),
]);

export const PCM_FLOW_EDGES = Object.freeze([
  freezeRecord({ from: "home", to: "aboutDrs", kind: "forward", gate: "G1_UI_SOURCE", owner: "A0", action: "了解 DRS", clickable: true }),
  freezeRecord({ from: "home", to: "quoteCheck", kind: "forward", gate: "G1_UI_SOURCE", owner: "A0", action: "前往報價健檢", clickable: true }),
  freezeRecord({ from: "home", to: "drawingCheck", kind: "forward", gate: "G1_UI_SOURCE", owner: "A0", action: "前往圖說檢討", clickable: true }),
  freezeRecord({ from: "home", to: "accountAccess", kind: "forward", gate: "G1_UI_SOURCE", owner: "A0", action: "前往註冊或登入", clickable: true }),
  freezeRecord({ from: "quoteCheck", to: "home", kind: "back", gate: "G1_UI_SOURCE", owner: "A0", action: "返回 PCM 首頁", clickable: true }),
  freezeRecord({ from: "aboutDrs", to: "home", kind: "back", gate: "G1_UI_SOURCE", owner: "A0", action: "返回 PCM 首頁", clickable: true }),
  freezeRecord({ from: "aboutDrs", to: "quoteCheck", kind: "forward", gate: "G1_UI_SOURCE", owner: "A0", action: "開始文件健檢", clickable: true }),
  freezeRecord({ from: "drawingCheck", to: "home", kind: "back", gate: "G1_UI_SOURCE", owner: "A0", action: "返回 PCM 首頁", clickable: true }),
  freezeRecord({ from: "accountAccess", to: "home", kind: "back", gate: "G1_UI_SOURCE", owner: "A0", action: "返回 PCM 首頁", clickable: true }),
  freezeRecord({ from: "accountAccess", to: "quoteCheck", kind: "forward", gate: "G1_UI_SOURCE", owner: "A0", action: "開始文件健檢", clickable: true }),
  freezeRecord({ from: "quoteCheck", to: "drawingCheck", kind: "pending", gate: "G1_UI_SOURCE", owner: "A0", action: "補上圖說檢討", clickable: true }),
  freezeRecord({ from: "drawingCheck", to: "quoteCheck", kind: "pending", gate: "G1_UI_SOURCE", owner: "A0", action: "補上報價健檢", clickable: true }),
  freezeRecord({ from: "quoteCheck", to: "caseSetup", kind: "forward", gate: "G2_AUTH_RUNTIME", owner: "A6", action: "建立案件並關聯文件", clickable: false }),
  freezeRecord({ from: "drawingCheck", to: "caseSetup", kind: "forward", gate: "G2_AUTH_RUNTIME", owner: "A6", action: "建立案件並關聯文件", clickable: false }),
  freezeRecord({ from: "accountAccess", to: "caseSetup", kind: "forward", gate: "G2_AUTH_RUNTIME", owner: "A6", action: "完成身分確認後建立案件", clickable: false }),
  freezeRecord({ from: "caseSetup", to: "serviceContract", kind: "forward", gate: "G2_AUTH_RUNTIME", owner: "A6", action: "申請正式 PCM 並閱讀契約", clickable: false }),
  freezeRecord({ from: "serviceContract", to: "contractPrerequisites", kind: "pending", gate: "G1_UI_SOURCE", owner: "A0", action: "補齊契約前提", clickable: true }),
  freezeRecord({ from: "serviceContract", to: "home", kind: "back", gate: "G1_UI_SOURCE", owner: "A0", action: "返回 PCM 首頁", clickable: true }),
  freezeRecord({ from: "contractPrerequisites", to: "serviceContract", kind: "back", gate: "G1_UI_SOURCE", owner: "A0", action: "返回服務契約", clickable: true }),
  freezeRecord({ from: "serviceContract", to: "contractSigning", kind: "forward", gate: "G2_AUTH_RUNTIME", owner: "A6", action: "確認身分後前往簽訂", clickable: false }),
  freezeRecord({ from: "contractSigning", to: "ownerWorkspace", kind: "pending", gate: "G3_DURABLE_DATA", owner: "A5", action: "正式紀錄完成後進入案件", clickable: false }),
  freezeRecord({ from: "ownerWorkspace", to: "home", kind: "back", gate: "G1_UI_SOURCE", owner: "A0", action: "返回 PCM 首頁", clickable: true }),
  freezeRecord({ from: "vendorWorkspace", to: "home", kind: "back", gate: "G1_UI_SOURCE", owner: "A0", action: "返回 PCM 首頁", clickable: true }),
  freezeRecord({ from: "contractSigning", to: "accessUnavailable", kind: "recovery", gate: "G1_UI_SOURCE", owner: "A0", action: "安全返回", clickable: true }),
  freezeRecord({ from: "ownerWorkspace", to: "accessUnavailable", kind: "recovery", gate: "G1_UI_SOURCE", owner: "A0", action: "重新確認存取資格", clickable: true }),
  freezeRecord({ from: "vendorWorkspace", to: "accessUnavailable", kind: "recovery", gate: "G1_UI_SOURCE", owner: "A0", action: "安全返回", clickable: true }),
  freezeRecord({ from: "pcmCaseWorkspace", to: "accessUnavailable", kind: "recovery", gate: "G1_UI_SOURCE", owner: "A0", action: "安全返回", clickable: true }),
  freezeRecord({ from: "internalGovernance", to: "accessUnavailable", kind: "recovery", gate: "G1_UI_SOURCE", owner: "A0", action: "安全返回", clickable: true }),
]);

const ORIGINAL_CASE_WORKSPACE_BY_ROLE = freezeRecord({
  owner: "ownerWorkspace",
  vendor: "vendorWorkspace",
});
const BILATERAL_CONTINUATION_RESOURCES = freezeOwnList(
  "workspaces",
  "contract",
  "documents",
  "messages",
  "schedules",
  "evidence",
  "acceptance",
  "changes",
  "addenda",
  "caseRecords",
);

const closedState = ({
  code,
  reason,
  nextAction,
  responsibleRole,
  returnRoute,
  recoveryRoute,
  payloadPolicy,
  actions,
  workspaceByRole,
}) =>
  freezeRecord({
    code,
    type: "CLOSED",
    reason,
    nextAction,
    responsibleRole,
    responsibleActor: responsibleRole,
    returnRoute,
    recoveryRoute,
    payloadPolicy,
    mutationAllowed: false,
    ...(workspaceByRole ? { workspaceByRole } : {}),
    ...(actions ? { actions: freezeOwnList(...actions) } : {}),
  });

const bilateralContinuationState = ({
  code,
  reason,
  nextAction,
  responsibleRole,
  returnRoute,
  recoveryRoute,
}) =>
  freezeRecord({
    code,
    type: "CONTINUATION",
    reason,
    nextAction,
    responsibleRole,
    responsibleActor: responsibleRole,
    returnRoute,
    recoveryRoute,
    payloadPolicy: "PRESERVE_BILATERAL_CASE_CONTINUATION",
    mutationAllowed: false,
    actions: NO_ACTIONS,
    workspaceByRole: ORIGINAL_CASE_WORKSPACE_BY_ROLE,
    caseMode: "BILATERAL_CONTINUATION",
    pcmMode: "HISTORICAL_READ_ONLY",
    caseClosed: false,
    caseArchived: false,
    bilateralContinuationAllowed: true,
    newPcmOperationsAllowed: false,
    rejoinRequiresNewAuthorization: true,
    preserveResources: BILATERAL_CONTINUATION_RESOURCES,
  });

export const PCM_FLOW_FAILURE_MATRIX = Object.freeze({
  VENDOR_INVITATION_DECLINED: closedState({ code: "VENDOR_INVITATION_DECLINED", reason: "乙方已婉拒本次案件邀請。", nextAction: "由甲方確認是否改邀其他乙方，或先保留目前案件。", responsibleRole: "甲方", returnRoute: "vendorInvitation", recoveryRoute: "accountAccess", payloadPolicy: "ZERO_CASE_DATA" }),
  VENDOR_INVITATION_EXPIRED: closedState({ code: "VENDOR_INVITATION_EXPIRED", reason: "這份案件邀請已超過可使用期間。", nextAction: "請甲方重新確認合作對象並送出新邀請。", responsibleRole: "甲方", returnRoute: "vendorInvitation", recoveryRoute: "accountAccess", payloadPolicy: "ZERO_CASE_DATA" }),
  VENDOR_INVITATION_WITHDRAWN: closedState({ code: "VENDOR_INVITATION_WITHDRAWN", reason: "甲方已收回這份案件邀請。", nextAction: "由甲方決定是否重新邀請，乙方目前不需處理。", responsibleRole: "甲方", returnRoute: "vendorInvitation", recoveryRoute: "accountAccess", payloadPolicy: "ZERO_CASE_DATA" }),
  VENDOR_INVITATION_RESEND_REQUIRED: closedState({ code: "VENDOR_INVITATION_RESEND_REQUIRED", reason: "原邀請資料無法繼續使用，需要重新送出。", nextAction: "請甲方確認乙方資料後重新寄送案件邀請。", responsibleRole: "甲方", returnRoute: "vendorInvitation", recoveryRoute: "accountAccess", payloadPolicy: "ZERO_CASE_DATA" }),
  QUOTE_ONLY_DRAWING_MISSING: closedState({ code: "QUOTE_ONLY_DRAWING_MISSING", reason: "目前只有報價文件，尚未有可供核對的施工圖。", nextAction: "取得至少包含平面圖的施工圖 PDF，再進行圖說檢討。", responsibleRole: "甲方", returnRoute: "quoteCheck", recoveryRoute: "drawingCheck", payloadPolicy: "SUBMISSION_REFERENCE_ONLY" }),
  DRAWING_ONLY_QUOTE_MISSING: closedState({ code: "DRAWING_ONLY_QUOTE_MISSING", reason: "目前只有施工圖，尚未有可供核對的報價文件。", nextAction: "取得乙方報價 PDF，再進行報價健檢。", responsibleRole: "甲方", returnRoute: "drawingCheck", recoveryRoute: "quoteCheck", payloadPolicy: "SUBMISSION_REFERENCE_ONLY" }),
  FILE_FORMAT_INVALID: closedState({ code: "FILE_FORMAT_INVALID", reason: "這份文件不是目前可檢查的 PDF 格式。", nextAction: "回到原檢查頁，重新選擇 PDF 文件。", responsibleRole: "文件提交者", returnRoute: "home", recoveryRoute: "quoteCheck", payloadPolicy: "FILE_METADATA_ONLY" }),
  FILE_TOO_LARGE: closedState({ code: "FILE_TOO_LARGE", reason: "這份文件超過目前可接收的檔案大小。", nextAction: "壓縮或拆分文件後，再回到原檢查頁重新提交。", responsibleRole: "文件提交者", returnRoute: "home", recoveryRoute: "quoteCheck", payloadPolicy: "FILE_METADATA_ONLY" }),
  PAGE_COUNT_INVALID: closedState({ code: "PAGE_COUNT_INVALID", reason: "這份文件的頁數不符合本次檢查範圍。", nextAction: "保留需要檢查的頁面後，再回到原檢查頁重新提交。", responsibleRole: "文件提交者", returnRoute: "home", recoveryRoute: "quoteCheck", payloadPolicy: "FILE_METADATA_ONLY" }),
  FILE_UNREADABLE: closedState({ code: "FILE_UNREADABLE", reason: "文件內容過於模糊，目前無法可靠辨識。", nextAction: "取得清楚版本或重新掃描，再回到原檢查頁提交。", responsibleRole: "文件提交者", returnRoute: "home", recoveryRoute: "drawingCheck", payloadPolicy: "FILE_METADATA_ONLY" }),
  FILE_CORRUPTED: closedState({ code: "FILE_CORRUPTED", reason: "文件內容不完整或無法正常開啟。", nextAction: "重新匯出 PDF，確認可開啟後再提交。", responsibleRole: "文件提交者", returnRoute: "home", recoveryRoute: "quoteCheck", payloadPolicy: "FILE_METADATA_ONLY" }),
  DUPLICATE_SUBMISSION: closedState({ code: "DUPLICATE_SUBMISSION", reason: "相同版本已經提交，不需要重複送出。", nextAction: "確認要沿用既有版本，或改選更新後的文件。", responsibleRole: "文件提交者", returnRoute: "home", recoveryRoute: "quoteCheck", payloadPolicy: "SUBMISSION_REFERENCE_ONLY" }),
  VERSION_CONFLICT: closedState({ code: "VERSION_CONFLICT", reason: "目前選擇的文件版本與既有確認版本不一致。", nextAction: "先確認要採用的單一版本，再重新提交。", responsibleRole: "甲方", returnRoute: "home", recoveryRoute: "quoteCheck", payloadPolicy: "VERSION_REFERENCE_ONLY" }),
  CONTRACT_PREREQUISITES_MISSING: closedState({ code: "CONTRACT_PREREQUISITES_MISSING", reason: "正式契約所需的身分或文件前提尚未齊備。", nextAction: "查看待補項目，依責任人逐項補齊。", responsibleRole: "待補項目責任人", returnRoute: "serviceContract", recoveryRoute: "contractPrerequisites", payloadPolicy: "CONTRACT_REFERENCE_ONLY" }),
  CONTRACT_VERSION_NOT_MUTUALLY_ACCEPTED: closedState({ code: "CONTRACT_VERSION_NOT_MUTUALLY_ACCEPTED", reason: "甲乙雙方尚未確認同一份契約版本。", nextAction: "返回契約頁確認版本，完成雙方一致確認後再繼續。", responsibleRole: "甲方與乙方", returnRoute: "contractSigning", recoveryRoute: "serviceContract", payloadPolicy: "CONTRACT_REFERENCE_ONLY" }),
  IDENTITY_UNCONFIRMED: closedState({ code: "IDENTITY_UNCONFIRMED", reason: "目前無法確認使用者身分。", nextAction: "回到共用註冊與登入入口，完成身分確認。", responsibleRole: "目前使用者", returnRoute: "accessUnavailable", recoveryRoute: "accountAccess", payloadPolicy: "ZERO_CASE_DATA" }),
  MEMBERSHIP_UNCONFIRMED: closedState({ code: "MEMBERSHIP_UNCONFIRMED", reason: "目前無法確認你是否為這個案件的成員。", nextAction: "確認登入帳號與案件邀請是否一致。", responsibleRole: "目前使用者", returnRoute: "accessUnavailable", recoveryRoute: "accountAccess", payloadPolicy: "ZERO_CASE_DATA" }),
  ACCESS_UNCONFIRMED: closedState({ code: "ACCESS_UNCONFIRMED", reason: "目前無法確認你是否能查看這個案件。", nextAction: "安全返回，再由案件邀請或已確認入口重新進入。", responsibleRole: "目前使用者", returnRoute: "accessUnavailable", recoveryRoute: "accessUnavailable", payloadPolicy: "ZERO_CASE_DATA" }),
  SUPPLEMENT_OVERDUE: closedState({ code: "SUPPLEMENT_OVERDUE", reason: "待補文件已超過原訂處理時間。", nextAction: "查看待補內容與責任人；需要確認處理時間時，請聯絡待補責任人或返回原工作台。", responsibleRole: "待補項目責任人", returnRoute: "ownerWorkspace", recoveryRoute: "ownerWorkspace", payloadPolicy: "PRESERVE_EXISTING_CASE_READ_ONLY" }),
  CASE_CANCELLED: closedState({ code: "CASE_CANCELLED", reason: "案件已取消，目前不再接受新的處理動作。", nextAction: "依已確認角色返回原工作台，查看取消依據與既有紀錄。", responsibleRole: "案件三方", returnRoute: "accessUnavailable", recoveryRoute: "accessUnavailable", payloadPolicy: "PRESERVE_EXISTING_CASE_READ_ONLY", actions: [], workspaceByRole: ORIGINAL_CASE_WORKSPACE_BY_ROLE }),
  PCM_EXITED_BILATERAL_CONTINUATION: bilateralContinuationState({ code: "PCM_EXITED_BILATERAL_CONTINUATION", reason: "PCM 已退出服務；甲乙雙方仍在原工作台延續文件、協商、排程、驗收、變更、附約與案件紀錄。", nextAction: "依已確認角色返回原工作台繼續案件；新的 PCM 審查與補件要求已停止。", responsibleRole: "甲方與乙方", returnRoute: "accessUnavailable", recoveryRoute: "accessUnavailable" }),
  CASE_CLOSED_READ_ONLY: closedState({ code: "CASE_CLOSED_READ_ONLY", reason: "案件已結案，原工作台保留完整內容供三方查閱。", nextAction: "依已確認角色返回原工作台，查看結案依據、三方確認與既有紀錄。", responsibleRole: "案件三方", returnRoute: "accessUnavailable", recoveryRoute: "accessUnavailable", payloadPolicy: "PRESERVE_EXISTING_CASE_READ_ONLY", actions: [], workspaceByRole: ORIGINAL_CASE_WORKSPACE_BY_ROLE }),
});

export const PCM_FLOW_FAILURE_EDGES = Object.freeze(
  Object.values(PCM_FLOW_FAILURE_MATRIX).map((state) =>
    freezeRecord({
      stateCode: state.code,
      from: state.returnRoute,
      to: state.recoveryRoute,
      kind: "recovery",
      gate: "G1_UI_SOURCE",
      owner: "A0",
      mutationAllowed: false,
    }),
  ),
);

export const PCM_FLOW_ROUTE_MANIFEST = Object.freeze({
  version: "1.9.1",
  owner: "A0",
  defaultRoute: "accessUnavailable",
  gates: PCM_FLOW_GATES,
  nodes: PCM_FLOW_NODES,
  canonicalLinks: PCM_FLOW_CANONICAL_LINKS,
  edges: PCM_FLOW_EDGES,
  compatibilityAliases: PCM_FLOW_COMPATIBILITY_ALIASES,
  failureMatrix: PCM_FLOW_FAILURE_MATRIX,
  failureEdges: PCM_FLOW_FAILURE_EDGES,
});

const FLOW_NODE_COUNT = PCM_FLOW_NODES.length;
const CANONICAL_LINK_COUNT = PCM_FLOW_CANONICAL_LINKS.length;
const COMPATIBILITY_ALIAS_COUNT = PCM_FLOW_COMPATIBILITY_ALIASES.length;

function findExactRecordById(records, count, recordId) {
  for (let index = 0; index < count; index += 1) {
    const record = records[index];
    if (record.id === recordId) {
      return record;
    }
  }
  return null;
}

export function getActiveRouteHref(routeKey) {
  const node = findExactRecordById(PCM_FLOW_NODES, FLOW_NODE_COUNT, routeKey);
  return node?.lifecycle === "active" ? node.href : null;
}

export function getActiveCanonicalLinkHref(linkKey, trigger = null) {
  const link = findExactRecordById(
    PCM_FLOW_CANONICAL_LINKS,
    CANONICAL_LINK_COUNT,
    linkKey,
  );
  if (link?.routeState === "conditional") {
    return link.trigger === trigger ? link.relativeHref : null;
  }
  return link?.routeState === "active" ? link.relativeHref : null;
}

export function getCompatibilityRouteHref(aliasKey) {
  const alias = findExactRecordById(
    PCM_FLOW_COMPATIBILITY_ALIASES,
    COMPATIBILITY_ALIAS_COUNT,
    aliasKey,
  );
  return alias?.compatibilityHref ?? null;
}
