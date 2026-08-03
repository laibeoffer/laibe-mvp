const freezeRecord = (record) => Object.freeze({ ...record });

export const PCM_FLOW_GATES = Object.freeze([
  freezeRecord({
    id: "G1_UI_SOURCE",
    label: "介面與路徑來源",
    owner: "A0",
    state: "active",
  }),
  freezeRecord({
    id: "G2_AUTH_RUNTIME",
    label: "身分與角色確認",
    owner: "A6",
    state: "closed",
  }),
  freezeRecord({
    id: "G3_DURABLE_DATA",
    label: "正式資料與案件紀錄",
    owner: "A5 與 canonical producers",
    state: "closed",
  }),
  freezeRecord({
    id: "G4_PRODUCTION",
    label: "正式環境上線",
    owner: "A0 final",
    state: "closed",
  }),
]);

export const PCM_FLOW_NODES = Object.freeze([
  freezeRecord({ id: "home", label: "PCM 公開首頁", role: "一般屋主", owner: "A0", lifecycle: "active", gate: "G1_UI_SOURCE", href: "../public_home/code.html#top" }),
  freezeRecord({ id: "ownerStart", label: "甲方註冊與文件準備", role: "甲方", owner: "A0", lifecycle: "active", gate: "G1_UI_SOURCE", href: "../owner_start/code.html" }),
  freezeRecord({ id: "documentCorrections", label: "文件修正與重新提交", role: "甲方", owner: "A0", lifecycle: "active", gate: "G1_UI_SOURCE", href: "../document_corrections/code.html" }),
  freezeRecord({ id: "basicReport", label: "基本檢討結果", role: "甲方", owner: "A0", lifecycle: "active", gate: "G1_UI_SOURCE", href: "../basic_report/code.html" }),
  freezeRecord({ id: "serviceDecision", label: "是否申請正式 PCM", role: "甲方", owner: "A0", lifecycle: "active", gate: "G1_UI_SOURCE", href: "../account_service_status/code.html" }),
  freezeRecord({ id: "selfServiceArchive", label: "唯讀文件與報告區", role: "暫不申請服務的甲方", owner: "A0", lifecycle: "active", gate: "G1_UI_SOURCE", href: "../self_service_archive/code.html" }),
  freezeRecord({ id: "serviceContract", label: "PCM 服務契約", role: "甲方與受邀乙方", owner: "A0", lifecycle: "active", gate: "G1_UI_SOURCE", href: "../service_contract/code.html" }),
  freezeRecord({ id: "contractPrerequisites", label: "契約待補項目", role: "甲方與受邀乙方", owner: "A0", lifecycle: "active", gate: "G1_UI_SOURCE", href: "../contract_prerequisites/code.html" }),
  freezeRecord({ id: "contractSigning", label: "PCM 契約簽訂", role: "甲方與受邀乙方", owner: "A0", lifecycle: "active", gate: "G1_UI_SOURCE", href: "../contract_signing/code.html" }),
  freezeRecord({ id: "ownerWorkspace", label: "甲方案件工作台", role: "已授權甲方", owner: "A0", lifecycle: "active", gate: "G1_UI_SOURCE", href: "../../client_awarding_dashboard/code.html" }),
  freezeRecord({ id: "accessUnavailable", label: "安全恢復入口", role: "入口使用者", owner: "A0", lifecycle: "active", gate: "G1_UI_SOURCE", href: "../access_unavailable/code.html" }),

  freezeRecord({ id: "vendorInvitation", label: "乙方邀請與成員確認", role: "受邀乙方", owner: "A6", lifecycle: "planned", gate: "G2_AUTH_RUNTIME" }),
  freezeRecord({ id: "vendorWorkspace", label: "乙方案件工作台", role: "已授權乙方", owner: "A6", lifecycle: "planned", gate: "G2_AUTH_RUNTIME" }),
  freezeRecord({ id: "pcmAuthorizedList", label: "PCM 授權案件清單", role: "PCM", owner: "A6", lifecycle: "planned", gate: "G2_AUTH_RUNTIME" }),
  freezeRecord({ id: "pcmCaseWorkspace", label: "PCM 案件工作台", role: "已授權 PCM", owner: "A6", lifecycle: "planned", gate: "G2_AUTH_RUNTIME" }),
  freezeRecord({ id: "internalGovernance", label: "內部治理清單", role: "管理者", owner: "A6", lifecycle: "planned", gate: "G2_AUTH_RUNTIME" }),
  freezeRecord({ id: "caseRecordCenter", label: "案件紀錄中心", role: "案件三方", owner: "A5", lifecycle: "planned", gate: "G3_DURABLE_DATA" }),
  freezeRecord({ id: "caseCloseout", label: "結案與三方確認", role: "案件三方", owner: "A5", lifecycle: "planned", gate: "G3_DURABLE_DATA" }),
  freezeRecord({ id: "readOnlyArchive", label: "案件只讀封存", role: "案件三方", owner: "A5", lifecycle: "planned", gate: "G3_DURABLE_DATA" }),

  freezeRecord({ id: "legacyPcmRoot", label: "舊 PCM 示範案件入口", role: "舊入口使用者", owner: "A0", lifecycle: "retired", gate: "G1_UI_SOURCE", replacement: "home" }),
  freezeRecord({ id: "legacyMarketRoutes", label: "舊市場流程入口", role: "舊入口使用者", owner: "A0", lifecycle: "retired", gate: "G1_UI_SOURCE", replacement: "home" }),
]);

export const PCM_FLOW_EDGES = Object.freeze([
  freezeRecord({ from: "home", to: "ownerStart", kind: "forward", gate: "G1_UI_SOURCE", owner: "A0", action: "查看申請與文件準備" }),
  freezeRecord({ from: "home", to: "basicReport", kind: "forward", gate: "G1_UI_SOURCE", owner: "A0", action: "查看結果格式" }),
  freezeRecord({ from: "ownerStart", to: "documentCorrections", kind: "pending", gate: "G1_UI_SOURCE", owner: "A0", action: "修正文件" }),
  freezeRecord({ from: "documentCorrections", to: "ownerStart", kind: "back", gate: "G1_UI_SOURCE", owner: "A0", action: "返回文件準備" }),
  freezeRecord({ from: "documentCorrections", to: "basicReport", kind: "forward", gate: "G1_UI_SOURCE", owner: "A0", action: "查看基本檢討結果" }),
  freezeRecord({ from: "basicReport", to: "serviceDecision", kind: "forward", gate: "G1_UI_SOURCE", owner: "A0", action: "決定是否申請正式 PCM" }),
  freezeRecord({ from: "serviceDecision", to: "selfServiceArchive", kind: "forward", gate: "G1_UI_SOURCE", owner: "A0", action: "暫不申請並保留報告" }),
  freezeRecord({ from: "serviceDecision", to: "serviceContract", kind: "forward", gate: "G1_UI_SOURCE", owner: "A0", action: "閱讀 PCM 服務契約" }),
  freezeRecord({ from: "serviceContract", to: "contractPrerequisites", kind: "pending", gate: "G1_UI_SOURCE", owner: "A0", action: "補齊契約前提" }),
  freezeRecord({ from: "contractPrerequisites", to: "serviceContract", kind: "back", gate: "G1_UI_SOURCE", owner: "A0", action: "返回服務契約" }),
  freezeRecord({ from: "serviceContract", to: "contractSigning", kind: "forward", gate: "G2_AUTH_RUNTIME", owner: "A6", action: "確認身分後前往簽訂" }),
  freezeRecord({ from: "contractSigning", to: "ownerWorkspace", kind: "pending", gate: "G3_DURABLE_DATA", owner: "A5", action: "完成正式紀錄後進入案件" }),
  freezeRecord({ from: "ownerWorkspace", to: "home", kind: "back", gate: "G1_UI_SOURCE", owner: "A0", action: "返回 PCM 首頁" }),
  freezeRecord({ from: "contractSigning", to: "accessUnavailable", kind: "recovery", gate: "G1_UI_SOURCE", owner: "A0", action: "安全返回" }),
  freezeRecord({ from: "ownerWorkspace", to: "accessUnavailable", kind: "recovery", gate: "G1_UI_SOURCE", owner: "A0", action: "重新確認存取資格" }),
  freezeRecord({ from: "vendorWorkspace", to: "accessUnavailable", kind: "recovery", gate: "G1_UI_SOURCE", owner: "A0", action: "安全返回" }),
  freezeRecord({ from: "pcmCaseWorkspace", to: "accessUnavailable", kind: "recovery", gate: "G1_UI_SOURCE", owner: "A0", action: "安全返回" }),
  freezeRecord({ from: "internalGovernance", to: "accessUnavailable", kind: "recovery", gate: "G1_UI_SOURCE", owner: "A0", action: "安全返回" }),
]);

export const PCM_FLOW_ROUTE_MANIFEST = Object.freeze({
  version: "1.0.0",
  owner: "A0",
  defaultRoute: "accessUnavailable",
  gates: PCM_FLOW_GATES,
  nodes: PCM_FLOW_NODES,
  edges: PCM_FLOW_EDGES,
});

export function getActiveRouteHref(routeKey) {
  const node = PCM_FLOW_NODES.find(
    ({ id, lifecycle }) => id === routeKey && lifecycle === "active",
  );
  return node?.href;
}
