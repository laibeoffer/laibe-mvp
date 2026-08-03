const freezeRecord = (record) => Object.freeze({ ...record });

export const PCM_FLOW_GATES = Object.freeze([
  freezeRecord({ id: "G1_UI_SOURCE", label: "介面與路徑來源", owner: "A0", state: "active" }),
  freezeRecord({ id: "G2_AUTH_RUNTIME", label: "身分與角色確認", owner: "A6", state: "closed" }),
  freezeRecord({ id: "G3_DURABLE_DATA", label: "正式資料與案件紀錄", owner: "A5 與 canonical producers", state: "closed" }),
  freezeRecord({ id: "G4_PRODUCTION", label: "正式環境上線", owner: "A0 final", state: "closed" }),
]);

export const PCM_FLOW_NODES = Object.freeze([
  freezeRecord({ id: "home", publicPath: "/pcm", label: "PCM 公開首頁", role: "一般屋主", owner: "A0", lifecycle: "active", gate: "G1_UI_SOURCE", href: "../public_home/code.html#top" }),
  freezeRecord({ id: "quoteCheck", publicPath: "/pcm/quote-check", label: "報價健檢", role: "甲方", owner: "A0", lifecycle: "planned", gate: "G1_UI_SOURCE", href: null }),
  freezeRecord({ id: "drawingCheck", publicPath: "/pcm/drawing-check", label: "圖說檢討", role: "甲方", owner: "A0", lifecycle: "planned", gate: "G1_UI_SOURCE", href: null }),
  freezeRecord({ id: "accountAccess", publicPath: "/account/access", label: "甲乙方註冊與登入", role: "甲方與乙方", owner: "A0", lifecycle: "planned", gate: "G1_UI_SOURCE", href: null }),
  freezeRecord({ id: "caseSetup", publicPath: "/pcm/case/setup", label: "案件建立與正式 PCM 申請", role: "甲方", owner: "A0", lifecycle: "planned", gate: "G2_AUTH_RUNTIME", href: null }),
  freezeRecord({ id: "serviceContract", publicPath: "/pcm/service-contract", label: "PCM 服務契約", role: "甲方與受邀乙方", owner: "A0", lifecycle: "active", gate: "G1_UI_SOURCE", href: "../service_contract/code.html" }),
  freezeRecord({ id: "contractPrerequisites", publicPath: "/pcm/contract/prerequisites", label: "契約待補項目", role: "甲方與受邀乙方", owner: "A0", lifecycle: "active", gate: "G1_UI_SOURCE", href: "../contract_prerequisites/code.html" }),
  freezeRecord({ id: "contractSigning", publicPath: "/pcm/contract/sign", label: "PCM 契約簽訂", role: "甲方與受邀乙方", owner: "A0", lifecycle: "active", gate: "G1_UI_SOURCE", href: "../contract_signing/code.html" }),
  freezeRecord({ id: "ownerWorkspace", publicPath: "/pcm/owner/workspace", label: "甲方案件工作台", role: "已授權甲方", owner: "A0", lifecycle: "active", gate: "G1_UI_SOURCE", href: "../../client_awarding_dashboard/code.html" }),
  freezeRecord({ id: "vendorInvitation", publicPath: "/pcm/vendor/invitation", label: "乙方邀請與成員確認", role: "受邀乙方", owner: "A6", lifecycle: "planned", gate: "G2_AUTH_RUNTIME", href: null }),
  freezeRecord({ id: "vendorWorkspace", publicPath: "/pcm/vendor/workspace", label: "乙方案件工作台", role: "已授權乙方", owner: "A6", lifecycle: "planned", gate: "G2_AUTH_RUNTIME", href: null }),
  freezeRecord({ id: "pcmAuthorizedList", publicPath: "/pcm/console", label: "PCM 授權案件清單", role: "PCM", owner: "A6", lifecycle: "planned", gate: "G2_AUTH_RUNTIME", href: null }),
  freezeRecord({ id: "pcmCaseWorkspace", publicPath: "/pcm/console/case", label: "PCM 案件工作台", role: "已授權 PCM", owner: "A6", lifecycle: "planned", gate: "G2_AUTH_RUNTIME", href: null }),
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

export const PCM_FLOW_EDGES = Object.freeze([
  freezeRecord({ from: "home", to: "quoteCheck", kind: "forward", gate: "G1_UI_SOURCE", owner: "A0", action: "前往報價健檢", clickable: false }),
  freezeRecord({ from: "home", to: "drawingCheck", kind: "forward", gate: "G1_UI_SOURCE", owner: "A0", action: "前往圖說檢討", clickable: false }),
  freezeRecord({ from: "home", to: "accountAccess", kind: "forward", gate: "G1_UI_SOURCE", owner: "A0", action: "前往註冊或登入", clickable: false }),
  freezeRecord({ from: "quoteCheck", to: "home", kind: "back", gate: "G1_UI_SOURCE", owner: "A0", action: "返回 PCM 首頁", clickable: true }),
  freezeRecord({ from: "drawingCheck", to: "home", kind: "back", gate: "G1_UI_SOURCE", owner: "A0", action: "返回 PCM 首頁", clickable: true }),
  freezeRecord({ from: "accountAccess", to: "home", kind: "back", gate: "G1_UI_SOURCE", owner: "A0", action: "返回 PCM 首頁", clickable: true }),
  freezeRecord({ from: "quoteCheck", to: "drawingCheck", kind: "pending", gate: "G1_UI_SOURCE", owner: "A0", action: "補上圖說檢討", clickable: false }),
  freezeRecord({ from: "drawingCheck", to: "quoteCheck", kind: "pending", gate: "G1_UI_SOURCE", owner: "A0", action: "補上報價健檢", clickable: false }),
  freezeRecord({ from: "quoteCheck", to: "caseSetup", kind: "forward", gate: "G2_AUTH_RUNTIME", owner: "A6", action: "建立案件並關聯文件", clickable: false }),
  freezeRecord({ from: "drawingCheck", to: "caseSetup", kind: "forward", gate: "G2_AUTH_RUNTIME", owner: "A6", action: "建立案件並關聯文件", clickable: false }),
  freezeRecord({ from: "accountAccess", to: "caseSetup", kind: "forward", gate: "G2_AUTH_RUNTIME", owner: "A6", action: "完成身分確認後建立案件", clickable: false }),
  freezeRecord({ from: "caseSetup", to: "serviceContract", kind: "forward", gate: "G2_AUTH_RUNTIME", owner: "A6", action: "申請正式 PCM 並閱讀契約", clickable: false }),
  freezeRecord({ from: "serviceContract", to: "contractPrerequisites", kind: "pending", gate: "G1_UI_SOURCE", owner: "A0", action: "補齊契約前提", clickable: true }),
  freezeRecord({ from: "contractPrerequisites", to: "serviceContract", kind: "back", gate: "G1_UI_SOURCE", owner: "A0", action: "返回服務契約", clickable: true }),
  freezeRecord({ from: "serviceContract", to: "contractSigning", kind: "forward", gate: "G2_AUTH_RUNTIME", owner: "A6", action: "確認身分後前往簽訂", clickable: false }),
  freezeRecord({ from: "contractSigning", to: "ownerWorkspace", kind: "pending", gate: "G3_DURABLE_DATA", owner: "A5", action: "正式紀錄完成後進入案件", clickable: false }),
  freezeRecord({ from: "ownerWorkspace", to: "home", kind: "back", gate: "G1_UI_SOURCE", owner: "A0", action: "返回 PCM 首頁", clickable: true }),
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
    ...(actions ? { actions: Object.freeze([...actions]) } : {}),
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
  PCM_EXITED_READ_ONLY: closedState({ code: "PCM_EXITED_READ_ONLY", reason: "PCM 已退出服務，甲乙方仍可在原工作台查閱既有內容。", nextAction: "依已確認角色返回原工作台，查看文件、決定與既有紀錄。", responsibleRole: "甲方與乙方", returnRoute: "accessUnavailable", recoveryRoute: "accessUnavailable", payloadPolicy: "PRESERVE_EXISTING_CASE_READ_ONLY", actions: [], workspaceByRole: ORIGINAL_CASE_WORKSPACE_BY_ROLE }),
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
  version: "1.1.0",
  owner: "A0",
  defaultRoute: "accessUnavailable",
  gates: PCM_FLOW_GATES,
  nodes: PCM_FLOW_NODES,
  edges: PCM_FLOW_EDGES,
  compatibilityAliases: PCM_FLOW_COMPATIBILITY_ALIASES,
  failureMatrix: PCM_FLOW_FAILURE_MATRIX,
  failureEdges: PCM_FLOW_FAILURE_EDGES,
});

export function getActiveRouteHref(routeKey) {
  const node = PCM_FLOW_NODES.find(({ id }) => id === routeKey);
  return node?.lifecycle === "active" ? node.href : null;
}

export function getCompatibilityRouteHref(aliasKey) {
  return PCM_FLOW_COMPATIBILITY_ALIASES.find(({ id }) => id === aliasKey)
    ?.compatibilityHref ?? null;
}
