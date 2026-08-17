(function exposeProjectContractPreview(root, factory) {
  "use strict";

  var api = factory(root);
  root.LaibeProjectContractPreview = api;
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root.document) api.bootstrap(root.document);
})(typeof globalThis !== "undefined" ? globalThis : this, function createProjectContractPreview(root) {
  "use strict";

  var CONTRACT_TYPES = ["DESIGN", "WORKS", "DESIGN_BUILD"];
  var PREVIEW_ROUTE = "/site/standard_contract_editor/code.html";
  var RETURN_TARGETS = Object.freeze({
    owner: Object.freeze({
      label: "回甲方工作台繼續填寫",
      href: "../../src/stitch_laibe_landing_onboarding/client_awarding_dashboard/code.html#owner-contract-view-panel-facts",
    }),
    vendor: Object.freeze({
      label: "回乙方工作台繼續回覆",
      href: "../../src/stitch_laibe_landing_onboarding/pcm_standalone/vendor_workspace/code.html#vendor-contract-view-panel-reply",
    }),
  });
  var TYPE_LABELS = {
    DESIGN: "設計契約",
    WORKS: "工程承攬契約",
    DESIGN_BUILD: "設計委託＋工程承攬契約",
  };
  var ROLE_LABELS = {
    OWNER: "甲方（業主）",
    CONTRACTOR: "乙方（承攬方）",
    VENDOR: "乙方（設計師／統包）",
    DESIGNER: "乙方（設計師）",
    PCM: "案件協作人員（PCM）",
    ADMIN: "案件管理者",
  };
  var PREVIEW_ROLES = Object.freeze(Object.keys(ROLE_LABELS));
  var ATTACHMENT_LABELS = {
    "DESIGN-SCOPE": "設計服務範圍",
    "DESIGN-DELIVERABLE-SCHEDULE": "設計成果交付時程",
    "DESIGN-PAYMENT-SCHEDULE": "設計付款節點表",
    "FORMAL-QUOTATION": "正式工程報價單",
    "FORMAL-CONSTRUCTION-DRAWINGS": "正式施工圖",
    "MATERIAL-SPECIFICATIONS": "材料規格文件",
    "CONSTRUCTION-SCHEDULE": "施工進度表",
    "WORKS-PAYMENT-MILESTONES": "工程付款節點表",
    "COMMON-DRS-PROCEDURE-v0.2": "LaiBE DRS 案件治理程序",
    CONFIRMED_DESIGN_BASELINE: "已確認設計基準",
    FORMAL_WORKS_QUOTATION: "正式工程報價單",
    WORKS_PAYMENT_MILESTONES: "工程付款節點表",
  };
  var PROCEDURE_STATUS_LABELS = {
    DRAFT: "契約草案尚待雙方確認",
    PROCEDURAL_INCOMPLETE: "案件依據尚未完整帶入",
  };
  var LEGAL_STATUS_LABELS = {
    LEGAL_REVIEW_REQUIRED: "法務審閱待完成",
    LEGAL_REVIEW_COMPLETED: "法務審閱已完成",
  };
  var VISIBLE_CONTRACT_TERM_LABELS = Object.freeze({
    APPROVE: "同意",
    APPROVE_WITH_RESERVATION: "保留條件同意",
    CHANGE_ORDER: "正式變更單",
    CHANGE_REQUEST: "變更請求",
    CONSTRUCTION_RELEASE: "工程放行決策",
    CONSTRUCTION_SCHEDULE_ID: "施工進度表識別",
    CONSTRUCTION_SCHEDULE_VERSION: "施工進度表版本",
    CONTRACTOR_LEGAL_NAME: "承攬方法定名稱",
    DESIGN_AREA: "設計範圍面積",
    DESIGN_CHANGE: "設計變更",
    DESIGN_CHANGE_REQUEST: "設計變更請求",
    DESIGN_DELIVERABLE_SCHEDULE: "設計成果交付時程",
    DESIGN_SCOPE: "設計服務範圍",
    DESIGN_SCOPE_CHANGE: "設計範圍變更",
    DESIGN_STAGE_1: "設計第一階段",
    DESIGN_STAGE_2: "設計第二階段",
    DESIGN_STAGE_3: "設計第三階段",
    DESIGN_STAGE_4: "設計第四階段",
    DESIGN_VERSION: "設計版本",
    DISCREPANCY_REQUIRES_DECISION: "文件差異待甲方決策",
    DOCUMENT_ID: "文件識別",
    DRS_FALLBACK_CHANNEL: "DRS 備援聯絡管道",
    EXTERNAL_PROFESSIONAL_REVIEW_REQUIRED: "需要外部專業審閱",
    FINAL_ACCEPTANCE_COMPLETED: "最終驗收已完成",
    FINAL_PAYMENT_ACTION: "尾款付款程序",
    FINAL_PAYMENT_READY_FOR_OWNER_DECISION: "尾款資料已整理，可交由甲方決策",
    HOLD_POINT: "查驗停留點",
    INSUFFICIENT_EVIDENCE: "依據不足",
    OBJECT: "不同意",
    OWNER_EARLY_CONSTRUCTION_OVERRIDE: "甲方提前施工例外決策",
    OWNER_LEGAL_NAME: "業主法定名稱",
    OWNER_OVERRIDE: "甲方例外決策",
    OWNER_REPORTED_PRIVATE_AGREEMENT: "甲方回報的私下約定",
    PARTY_AGREEMENT: "雙方合意",
    PAYMENT_APPLICATION_PROCEDURALLY_INCOMPLETE: "付款申請程序資料尚未完整",
    PROJECT_ADDRESS: "專案地址",
    PROJECT_END_AT: "預定完工時間",
    PROJECT_NAME: "專案名稱",
    PROJECT_START_AT: "預定開工時間",
    PROJECT_TOTAL_AMOUNT: "工程總價",
    READY_FOR_OWNER_DECISION: "資料已整理，可交由甲方決策",
    REQUEST_SUPPLEMENT: "要求補件",
    SCHEDULE_CHANGE: "進度變更",
    SCOPE_CHANGE: "範圍變更",
    STAGE_CONFIRMED: "階段已確認",
    SUBMITTED_AT: "提交時間",
    SUBMITTED_BY: "提交人",
    SUPPLEMENT_REQUIRED: "仍需補件",
    TOTAL_DESIGN_FEE: "設計服務總價",
    WARRANTY_OBLIGATION: "保固義務",
    WARRANTY_PLEDGE_SIGNED: "保固承諾已簽認",
    WORK_CHANGE: "工程變更",
    confirmed_at: "確認時間",
    confirmed_by: "確認人",
    design_stage_id: "設計階段識別",
    document_id: "文件識別",
    document_name: "文件名稱",
    document_type: "文件類型",
    drawing_refs: "圖面依據",
    drs_review: "DRS 文件審閱",
    hold_point: "查驗停留點",
    issued_at: "發布時間",
    milestone_id: "里程碑識別",
    milestone_name: "里程碑名稱",
    owner_decision: "甲方決策",
    payment_amount: "付款金額",
    payment_rate: "付款比例",
    quotation_refs: "報價依據",
    required_evidence: "必要依據",
    scheduled_end: "預定結束時間",
    scheduled_start: "預定開始時間",
    submitted_at: "提交時間",
    submitted_by: "提交人",
    work_scope: "工程範圍",
  });
  var VISIBLE_CONTRACT_PHRASE_LABELS = Object.freeze([
    ["Design-to-Construction Gate", "設計轉工程放行關卡"],
    ["Owner Reported Private Agreement", "甲方回報的私下約定"],
    ["Decision & Record", "決策與紀錄"],
    ["正式 Change Order", "正式變更單"],
    ["設計成果交付 Schedule", "設計成果交付時程"],
    ["Milestone 程序核對", "里程碑程序核對"],
    ["各 domain 的版本", "各契約範圍的版本"],
    ["正式 CHANGE_ORDER", "正式變更單"],
    ["Hold Point=TRUE", "查驗停留點＝是"],
    ["DRS 文件 Review", "DRS 文件審閱"],
    ["baseline comparison", "基準版本比對"],
    ["Owner Decision", "甲方決策"],
    ["Decision Owner", "決策負責人"],
    ["Party Agreement", "雙方合意"],
    ["Owner Override", "甲方例外決策"],
    ["Source Evidence", "來源依據"],
    ["Payment Action", "付款程序"],
    ["Change Order", "正式變更單"],
    ["Hold Point", "查驗停留點"],
    ["DESIGN DOMAIN", "設計契約範圍"],
    ["WORKS DOMAIN", "工程契約範圍"],
    ["DRS Review", "DRS 文件審閱"],
    ["Milestone", "里程碑"],
    ["Schedule", "時程"],
    ["Override", "例外決策"],
    ["Decision", "決策"],
    ["Review", "審閱"],
    ["domain", "契約範圍"],
    ["actor", "執行角色"],
    ["timestamp", "記錄時間"],
    ["milestone", "里程碑"],
    ["document", "文件"],
    ["decision", "決策"],
    ["Evidence", "依據"],
    ["VERSION", "版本"],
    ["version", "版本"],
    ["Change", "變更"],
    ["Record", "紀錄"],
    ["review", "審閱"],
    ["action", "行動"],
    ["case", "案件"],
    ["TRUE", "是"],
    ["APPROVE", "同意"],
    ["OBJECT", "不同意"],
  ]);

  function normalizePreviewContractType(value) {
    return CONTRACT_TYPES.indexOf(value) >= 0 ? value : "DESIGN";
  }

  function normalizePreviewReturnTarget(value) {
    return value === "owner" || value === "vendor" ? value : null;
  }

  function isOrdinaryRecord(candidate) {
    if (!candidate || typeof candidate !== "object") return false;
    try {
      if (Object.getOwnPropertyDescriptor(candidate, Symbol.toStringTag)) return false;
      var prototype = Object.getPrototypeOf(candidate);
      if (prototype === null || prototype === Object.prototype) return true;
      if (Object.getPrototypeOf(prototype) !== null) return false;
      var constructorDescriptor = Object.getOwnPropertyDescriptor(prototype, "constructor");
      var hasOwnDescriptor = Object.getOwnPropertyDescriptor(prototype, "hasOwnProperty");
      return Boolean(
        constructorDescriptor && typeof constructorDescriptor.value === "function" &&
        hasOwnDescriptor && typeof hasOwnDescriptor.value === "function"
      );
    } catch (error) {
      return false;
    }
  }

  function ownDataValue(candidate, field) {
    try {
      var descriptor = Object.getOwnPropertyDescriptor(candidate, field);
      return descriptor && Object.prototype.hasOwnProperty.call(descriptor, "value") ? descriptor.value : undefined;
    } catch (error) {
      return undefined;
    }
  }

  function exactNonEmptyString(candidate, field) {
    var value = ownDataValue(candidate, field);
    return typeof value === "string" && Boolean(value) && value === value.trim() && !/\s/.test(value) ? value : null;
  }

  function resolveProjectContractPreviewContext(candidate) {
    if (!isOrdinaryRecord(candidate)) return null;
    var caseId = exactNonEmptyString(candidate, "caseId");
    var contractId = exactNonEmptyString(candidate, "contractId");
    var version = exactNonEmptyString(candidate, "version");
    var contractType = exactNonEmptyString(candidate, "contractType");
    var role = exactNonEmptyString(candidate, "role");
    if (!caseId || !contractId || !version || CONTRACT_TYPES.indexOf(contractType) < 0 || PREVIEW_ROLES.indexOf(role) < 0) return null;
    if (ownDataValue(candidate, "readOnly") !== true) return null;
    return Object.freeze({
      caseId: caseId,
      contractId: contractId,
      version: version,
      contractType: contractType,
      role: role,
      readOnly: true,
    });
  }

  function buildProjectContractPreviewHref(contractType, returnTarget) {
    var href = PREVIEW_ROUTE + "?contractType=" + encodeURIComponent(normalizePreviewContractType(contractType));
    var normalizedReturnTarget = normalizePreviewReturnTarget(returnTarget);
    return normalizedReturnTarget
      ? href + "&returnTo=" + encodeURIComponent(normalizedReturnTarget)
      : href;
  }

  function assembleProjectContractPreview(engine, contractType, context) {
    var normalizedType = engine.normalizeContractType(contractType);
    if (CONTRACT_TYPES.indexOf(normalizedType) < 0) throw new Error("CONTRACT_PREVIEW_TYPE_UNAVAILABLE");
    var options = { contractType: normalizedType };
    if (context && context.contractType === normalizedType) {
      options.caseData = { caseId: context.caseId, contractId: context.contractId };
      options.versionMetadata = { versionId: context.version };
    }
    return engine.assembleProjectContract(options);
  }

  function escapeRegularExpression(value) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  function replaceExactVisiblePhrase(value, sourcePhrase, visiblePhrase) {
    var startsWithWord = /^[A-Za-z0-9]/.test(sourcePhrase);
    var endsWithWord = /[A-Za-z0-9]$/.test(sourcePhrase);
    var pattern = (startsWithWord ? "\\b" : "") + escapeRegularExpression(sourcePhrase) + (endsWithWord ? "\\b" : "");
    return value.replace(new RegExp(pattern, "g"), visiblePhrase);
  }

  function localizeProjectContractVisibleText(value) {
    var visible = String(value || "").replace(/\{\{([A-Z][A-Z0-9_]*)\}\}/g, function replacePlaceholder(match, term) {
      var label = VISIBLE_CONTRACT_TERM_LABELS[term] || "案件欄位";
      return "（" + label + "將在授權案件版本中顯示）";
    });
    Object.keys(ATTACHMENT_LABELS).forEach(function replaceAttachmentReference(attachmentId) {
      visible = replaceExactVisiblePhrase(visible, attachmentId, ATTACHMENT_LABELS[attachmentId]);
    });
    VISIBLE_CONTRACT_PHRASE_LABELS.forEach(function replacePhrase(pair) {
      visible = replaceExactVisiblePhrase(visible, pair[0], pair[1]);
    });
    visible = visible.replace(/\b[A-Za-z][A-Za-z0-9]*(?:_[A-Za-z0-9]+)+\b/g, function replaceCanonicalTerm(term) {
      return VISIBLE_CONTRACT_TERM_LABELS[term] || "案件程序欄位";
    });
    visible = visible.replace(/([\p{Script=Han}）])\s+(?=[\p{Script=Han}（])/gu, "$1");
    return visible;
  }

  function visibleContractText(value) {
    return localizeProjectContractVisibleText(value);
  }

  function attachmentLabel(attachmentId) {
    return ATTACHMENT_LABELS[attachmentId] || "契約附件（名稱待案件版本確認）";
  }

  function validSource(candidate) {
    return Boolean(candidate && typeof candidate === "object");
  }

  function validEngine(candidate, source) {
    return Boolean(
      candidate &&
      candidate.source === source &&
      typeof candidate.normalizeContractType === "function" &&
      typeof candidate.assembleProjectContract === "function"
    );
  }

  function bootstrap(document) {
    var source = root.LaibeProjectContractSource;
    var engine = root.LaibeProjectContractEngine;
    var refs = {};
    var state = {
      selectedType: "DESIGN",
      selectedVersion: "",
      contract: null,
      context: resolveProjectContractPreviewContext(root.LaibeProjectContractPreviewContext),
      contextAllowed: false,
      returnTarget: null,
    };

    function byId(id) {
      return document.getElementById(id);
    }

    function el(tag, className, text) {
      var node = document.createElement(tag);
      if (className) node.className = className;
      if (text !== undefined) node.textContent = text;
      return node;
    }

    function collectRefs() {
      [
        "source-state", "preview-status-strip", "contract-book", "legal-status", "template-version",
        "status-contract-title", "contract-state-name", "contract-state-detail", "contract-title",
        "contract-type-label", "contract-version-label", "contract-preview-label", "party-project-facts",
        "payment-render-root", "articles-render-root", "article-count", "appendix-render-root",
        "attachment-list", "review-status-list", "next-action-title", "next-action-detail",
        "mobile-next-action-label", "preview-context-kind", "preview-role", "preview-version",
        "preview-status", "preview-next-owner", "return-to-workspace", "reader-return-to-workspace",
        "mobile-return-to-workspace",
      ].forEach(function collect(id) { refs[id] = byId(id); });
    }

    function renderReturnNavigation() {
      var config = state.returnTarget ? RETURN_TARGETS[state.returnTarget] : null;
      [
        refs["return-to-workspace"],
        refs["reader-return-to-workspace"],
        refs["mobile-return-to-workspace"],
      ].forEach(function update(link) {
        if (!link) return;
        link.hidden = !config;
        if (config) {
          link.href = config.href;
          link.textContent = config.label;
        }
      });
    }

    function roleLabel(role) {
      return ROLE_LABELS[role] || "案件參與者";
    }

    function contextForType(context, type) {
      return state.contextAllowed && context && context.contractType === type ? context : null;
    }

    function renderFact(label, value) {
      var fact = el("div", "fact");
      fact.append(el("span", "", label), el("strong", "fact-value", value));
      refs["party-project-facts"].append(fact);
    }

    function renderContext(type) {
      var context = contextForType(state.context, type);
      var currentRole = context ? roleLabel(context.role) : "未帶入案件角色";
      var currentVersion = context ? context.version : state.contract.templateVersion;
      state.selectedVersion = currentVersion;
      document.documentElement.dataset.caseContext = context ? "trusted-read-only" : "neutral-template";

      refs["preview-context-kind"].textContent = context ? "案件唯讀預覽" : "中性範本預覽";
      refs["preview-role"].textContent = currentRole;
      refs["preview-version"].textContent = currentVersion;
      refs["preview-status"].textContent = context ? "唯讀檢視中" : "未連結案件";
      refs["preview-next-owner"].textContent = context
        ? "目前由" + currentRole + "檢視；下一步等待甲方決策、乙方回應或雙方合意。"
        : "若要檢視案件版本，請從有授權的案件入口開啟。";

      refs["party-project-facts"].replaceChildren();
      if (context) {
        renderFact("案件編號", context.caseId);
        renderFact("專案契約編號", context.contractId);
        renderFact("目前檢視角色", currentRole);
        renderFact("案件契約版本", context.version);
      } else {
        renderFact("預覽模式", "未連結案件的中性範本");
        renderFact("目前檢視角色", "未帶入案件角色");
        renderFact("條文來源版本", state.contract.templateVersion);
        renderFact("案件資料", "未顯示；僅提供契約結構檢視");
      }

      refs["contract-version-label"].textContent = "目前版本 " + currentVersion;
      refs["contract-preview-label"].textContent = context ? "案件唯讀預覽" : "中性範本預覽";
      refs["contract-state-name"].textContent = context ? "案件唯讀檢視中" : "中性範本預覽";
      refs["contract-state-detail"].textContent = context
        ? "已核對唯讀案件脈絡；本頁不提供修改、儲存、簽署或付款操作。"
        : "目前未連結案件，不顯示任何案件識別；本頁只供檢視契約結構。";
      refs["next-action-title"].textContent = context ? "下一步：依角色完成案件檢視" : "下一步：從授權案件入口開啟";
      refs["next-action-detail"].textContent = context
        ? "請依目前角色核對條文、付款依據與附件。DRS 文件審閱可整理差異；甲方決策、乙方回應與雙方合意仍須各自留下紀錄。"
        : "這是中性範本，不代表任何案件已建立契約；切換只切換範本，不會修改案件。需要案件版本時，請回到有權限的案件頁進入。";
      refs["mobile-next-action-label"].textContent = context ? "依目前角色完成案件檢視" : "從授權案件入口開啟";
      return context;
    }

    function renderPaymentProcedure() {
      var rootNode = refs["payment-render-root"];
      var contract = state.contract;
      var paymentArticles = contract.articles.filter(function paymentArticle(article) {
        return /付款|價金|費用|報酬/.test(article.title + " " + article.body);
      });
      var status = PROCEDURE_STATUS_LABELS[contract.status] || "程序狀態待授權案件確認";
      var unresolvedCount = Array.isArray(contract.unresolvedBindings) ? contract.unresolvedBindings.length : 0;
      rootNode.replaceChildren();

      var summary = el("section", "payment-profile");
      var head = el("header", "payment-profile__head");
      var copy = el("div");
      copy.append(el("h4", "", "付款依據檢視"), el("p", "", "付款條件完整文字請以本冊契約條文為準。"));
      head.append(copy, el("div", "payment-profile__amount", status));
      summary.append(head);

      var stages = el("div", "payment-stages");
      if (paymentArticles.length) {
        paymentArticles.forEach(function renderPaymentReference(article, index) {
          var row = el("div", "payment-stage");
          row.append(el("span", "payment-stage__number", String(index + 1).padStart(2, "0")));
          var detail = el("div");
          detail.append(el("strong", "", visibleContractText(article.title)), el("small", "", "請至「契約條文」分冊核對完整內容"));
          row.append(detail, el("span", "payment-stage__rate", "唯讀"));
          stages.append(row);
        });
      } else {
        stages.append(el("p", "document-note", "目前版本未列出可獨立辨識的付款條文；請核對完整契約條文。"));
      }
      summary.append(stages);
      summary.append(el("p", "engine-note", "付款條件是契約描述，不是付款操作。DRS 文件審閱、甲方決策、乙方回應、雙方合意與付款必須分開留下紀錄。"));
      if (unresolvedCount) {
        summary.append(el("p", "document-note", "目前仍有 " + unresolvedCount + " 項程序依據待授權案件補齊；本頁不會自行補值或成立付款條件。"));
      }
      rootNode.append(summary);
    }

    function articleDetails(article, index, appendix) {
      var details = el("details", "article");
      details.setAttribute("data-article-id", article.articleId);
      details.dataset.sourceType = article.sourceType;
      details.dataset.required = String(article.required);
      if (index === 0 && !appendix) details.open = true;
      details.append(el("summary", "", visibleContractText(article.title)));

      var content = el("div", "article__content");
      var identity = el("div", "article__identity");
      identity.append(
        el("span", "", appendix ? "共同程序條文 " + String(index + 1).padStart(2, "0") : "契約條文 " + String(index + 1).padStart(2, "0")),
        el("span", "", "由目前契約版本組成"),
        el("span", "", article.required ? "必要條文" : "選用條文")
      );
      content.append(identity, el("div", "article-body", visibleContractText(article.body)));
      if (article.placeholders.length) {
        var placeholders = el("div", "article__refs");
        placeholders.append(document.createTextNode("此條文有 " + article.placeholders.length + " 項案件欄位，將在授權案件版本中顯示。"));
        content.append(placeholders);
      }
      if (article.attachments.length) {
        content.append(el("div", "article__refs", "引用附件：" + article.attachments.map(function attachmentLabel(item) {
          return ATTACHMENT_LABELS[item] || "契約附件（名稱待案件版本確認）";
        }).join("、")));
      }
      details.append(content);
      return details;
    }

    function renderArticles() {
      refs["articles-render-root"].replaceChildren();
      state.contract.articles.forEach(function renderArticle(article, index) {
        refs["articles-render-root"].append(articleDetails(article, index, false));
      });
      refs["article-count"].textContent = state.contract.articles.length + " 條契約條文・唯讀預覽";
    }

    function renderAppendix() {
      var appendix = state.contract.commonAppendix;
      var shell = el("section", "appendix");
      shell.append(
        el("h4", "", visibleContractText(appendix.definition.title)),
        el("p", "", "共同程序附件由目前契約版本組成，供本契約引用；本頁不建立第二份內容。")
      );
      var articles = el("div", "articles");
      appendix.renderedArticles.forEach(function renderAppendixArticle(article, index) {
        articles.append(articleDetails(article, index, true));
      });
      shell.append(articles);
      refs["appendix-render-root"].replaceChildren(shell);
    }

    function renderAttachments() {
      refs["attachment-list"].replaceChildren();
      state.contract.attachmentRefs.forEach(function renderAttachment(attachmentId) {
        var item = el("li");
        item.append(document.createTextNode(attachmentLabel(attachmentId)), el("small", "", "目前契約版本的唯讀引用"));
        refs["attachment-list"].append(item);
      });
    }

    function renderReviews() {
      refs["review-status-list"].replaceChildren();
      var procedureStatus = PROCEDURE_STATUS_LABELS[state.contract.status] || "程序狀態待授權案件確認";
      var unresolvedCount = Array.isArray(state.contract.unresolvedBindings) ? state.contract.unresolvedBindings.length : 0;
      refs["review-status-list"].append(
        el("li", "", "目前程序狀態：" + procedureStatus),
        el("li", "", unresolvedCount ? "尚有 " + unresolvedCount + " 項案件依據待補齊" : "目前契約版本未標示待補程序依據"),
        el("li", "", "DRS 文件審閱只整理依據，不代替甲方決策"),
        el("li", "", "乙方回應與雙方合意必須分別留下紀錄")
      );
    }

    function updateActiveType(type, context) {
      document.querySelectorAll("[data-contract-type]").forEach(function update(button) {
        button.setAttribute("aria-pressed", String(button.dataset.contractType === type));
        button.disabled = Boolean(context && button.dataset.contractType !== context.contractType);
      });
    }

    function renderTemplate(type, updateUrl, allowContext) {
      var requestedType = normalizePreviewContractType(type);
      var trustedContext = allowContext && state.context && state.context.contractType === requestedType ? state.context : null;
      var contract;
      try {
        contract = assembleProjectContractPreview(engine, requestedType, trustedContext);
      } catch (error) {
        renderUnavailable();
        return;
      }
      var selectedType = normalizePreviewContractType(contract.contractType);
      state.selectedType = selectedType;
      state.contract = contract;
      state.contextAllowed = Boolean(allowContext);
      updateActiveType(selectedType, trustedContext);
      renderContext(selectedType);
      refs["status-contract-title"].textContent = visibleContractText(state.contract.title);
      refs["contract-title"].textContent = visibleContractText(state.contract.title);
      refs["contract-type-label"].textContent = TYPE_LABELS[selectedType];
      refs["template-version"].textContent = state.contract.templateVersion;
      refs["legal-status"].textContent = LEGAL_STATUS_LABELS[state.contract.metadata && state.contract.metadata.legalStatus] || "法務審閱狀態待確認";
      refs["source-state"].hidden = true;
      refs["preview-status-strip"].hidden = false;
      refs["contract-book"].hidden = false;
      document.title = "LaiBE｜" + TYPE_LABELS[selectedType] + "唯讀預覽 · " + state.selectedVersion;
      renderPaymentProcedure();
      renderArticles();
      renderAppendix();
      renderAttachments();
      renderReviews();
      if (updateUrl) root.history.replaceState({}, "", buildProjectContractPreviewHref(selectedType, state.returnTarget));
    }

    function renderUnavailable() {
      refs["source-state"].hidden = false;
      refs["source-state"].textContent = "契約內容暫時無法顯示。請稍後再試，或回到案件頁重新開啟；既有文件不受影響。";
      refs["preview-context-kind"].textContent = "預覽暫停";
      refs["preview-role"].textContent = "尚未顯示";
      refs["preview-version"].textContent = "尚未顯示";
      refs["preview-status"].textContent = "內容暫時無法顯示";
      refs["preview-next-owner"].textContent = "請稍後再試，或回到案件頁重新開啟。";
      refs["contract-book"].hidden = true;
      document.querySelectorAll("[data-contract-type]").forEach(function disable(button) { button.disabled = true; });
    }

    function preparePrintPreview() {
      document.querySelectorAll("details.article").forEach(function open(details) { details.open = true; });
      document.documentElement.dataset.printContractType = state.selectedType;
      document.documentElement.dataset.printContractVersion = state.selectedVersion;
    }

    function activateTab(tab, updateHash) {
      var targetId = tab.getAttribute("href").slice(1);
      var target = byId(targetId);
      var deck = document.querySelector(".contract-page-deck");
      document.querySelectorAll(".contract-page-tab").forEach(function update(candidate) {
        if (candidate === tab) candidate.setAttribute("aria-current", "page");
        else candidate.removeAttribute("aria-current");
      });
      if (target && deck) deck.scrollTo({ top: Math.max(0, target.offsetTop - 104), behavior: "smooth" });
      if (updateHash) root.history.replaceState({}, "", root.location.pathname + root.location.search + "#" + targetId);
    }

    function bindEvents() {
      document.querySelectorAll("[data-contract-type]").forEach(function bindType(button) {
        button.addEventListener("click", function selectType() {
          renderTemplate(button.dataset.contractType, true, false);
        });
      });
      byId("expand-articles-action").addEventListener("click", function expandArticles() {
        document.querySelectorAll("details.article").forEach(function open(details) { details.open = true; });
        activateTab(document.querySelector('.contract-page-tab[href="#contract-articles"]'), true);
      });
      byId("print-preview").addEventListener("click", function printPreview() {
        preparePrintPreview();
        root.print();
      });
      root.addEventListener("beforeprint", preparePrintPreview);

      var tabs = Array.from(document.querySelectorAll(".contract-page-tab"));
      tabs.forEach(function bindTab(tab, index) {
        tab.addEventListener("click", function selectSection(event) {
          event.preventDefault();
          activateTab(tab, true);
        });
        tab.addEventListener("keydown", function navigateSections(event) {
          var nextIndex = null;
          if (event.key === "ArrowRight" || event.key === "ArrowDown") nextIndex = (index + 1) % tabs.length;
          if (event.key === "ArrowLeft" || event.key === "ArrowUp") nextIndex = (index - 1 + tabs.length) % tabs.length;
          if (event.key === "Home") nextIndex = 0;
          if (event.key === "End") nextIndex = tabs.length - 1;
          if (nextIndex === null) return;
          event.preventDefault();
          tabs[nextIndex].focus();
          activateTab(tabs[nextIndex], true);
        });
      });
    }

    collectRefs();
    if (!validSource(source) || !validEngine(engine, source)) {
      renderUnavailable();
      return;
    }
    bindEvents();
    var previewQuery = new URLSearchParams(root.location.search);
    var requestedType = previewQuery.get("contractType");
    state.returnTarget = normalizePreviewReturnTarget(previewQuery.get("returnTo"));
    renderReturnNavigation();
    var exactQueryType = CONTRACT_TYPES.indexOf(requestedType) >= 0;
    var initialType = normalizePreviewContractType(requestedType);
    var initialContextAllowed = Boolean(exactQueryType && state.context && state.context.contractType === initialType);
    renderTemplate(initialType, false, initialContextAllowed);
  }

  return Object.freeze({
    normalizePreviewContractType: normalizePreviewContractType,
    normalizePreviewReturnTarget: normalizePreviewReturnTarget,
    resolveProjectContractPreviewContext: resolveProjectContractPreviewContext,
    buildProjectContractPreviewHref: buildProjectContractPreviewHref,
    assembleProjectContractPreview: assembleProjectContractPreview,
    localizeProjectContractVisibleText: localizeProjectContractVisibleText,
    bootstrap: bootstrap,
  });
});
