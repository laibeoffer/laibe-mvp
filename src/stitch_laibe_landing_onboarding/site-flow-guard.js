(function () {
  "use strict";

  const STORAGE = {
    ownerGuideReady: "laibe.ownerGuideReady",
    planPuzzleReady: "laibe.planPuzzleToolCatalogReady",
    budgetPreviewReady: "laibe.budgetPreviewReady",
    budgetFinalized: "laibe.budgetFinalized"
  };

  const ROUTES = {
    landing: "../laibe_landing_desktop/code.html",
    ownerGuide: "../onboard_ai_agent/code.html",
    planPuzzle: "../preview_floor_plan/code.html",
    budgetPreview: "../preview_budget/code.html",
    budgetFinalization: "../client_step_4_budget_finalization/code.html",
    documentPreview: "../budget_document_preview/code.html",
    dashboardCandidate: "../client_awarding_dashboard/code.html",
    tenderCandidate: "../tender_notice/code.html",
    pcmCandidate: "../project_timeline_and_governance/code.html",
    vendorPrototype: "../pro_dashboard/code.html"
  };

  function pageName() {
    const parts = window.location.pathname.split("/").filter(Boolean);
    return parts.length >= 2 ? parts[parts.length - 2] : "";
  }

  function isReady(key) {
    return window.localStorage.getItem(key) === "true";
  }

  function markReady(key, value) {
    window.localStorage.setItem(key, value || "true");
    updateFlowStatus();
  }

  function addStyles() {
    if (document.getElementById("laibe-site-flow-style")) return;
    const style = document.createElement("style");
    style.id = "laibe-site-flow-style";
    style.textContent = `
      .laibe-flow-banner,
      .laibe-flow-panel,
      .laibe-flow-toast {
        font-family: Inter, "Noto Sans TC", "Microsoft JhengHei", system-ui, sans-serif;
      }

      .laibe-flow-banner {
        margin: 12px auto;
        width: min(calc(100% - 32px), 1180px);
        border: 1px solid rgba(173, 90, 90, 0.30);
        border-radius: 14px;
        background: #fff8f4;
        color: #3b2f2f;
        padding: 12px 14px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        box-shadow: 0 8px 24px rgba(20, 24, 28, 0.08);
      }

      .laibe-flow-banner strong {
        display: block;
        font-size: 13px;
        letter-spacing: 0;
      }

      .laibe-flow-banner span {
        display: block;
        margin-top: 3px;
        color: rgba(59, 47, 47, 0.72);
        font-size: 12px;
        line-height: 1.5;
      }

      .laibe-flow-banner a,
      .laibe-flow-banner button,
      .laibe-flow-panel a,
      .laibe-flow-panel button {
        border: 0;
        border-radius: 10px;
        background: #ad5a5a;
        color: #fff;
        padding: 9px 12px;
        font-size: 12px;
        font-weight: 800;
        text-decoration: none;
        cursor: pointer;
        white-space: nowrap;
      }

      .laibe-flow-panel {
        margin: 16px auto;
        width: min(calc(100% - 32px), 1180px);
        border: 1px solid rgba(31, 31, 31, 0.12);
        border-radius: 16px;
        background: #ffffff;
        color: #1f1f1f;
        padding: 16px;
        box-shadow: 0 10px 30px rgba(31, 31, 31, 0.08);
      }

      .laibe-flow-panel h2 {
        margin: 0 0 8px;
        font-size: 16px;
        letter-spacing: 0;
      }

      .laibe-flow-panel p {
        margin: 0 0 12px;
        color: rgba(31, 31, 31, 0.68);
        font-size: 13px;
        line-height: 1.65;
      }

      .laibe-flow-actions {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
      }

      .laibe-flow-actions a.secondary,
      .laibe-flow-actions button.secondary {
        background: #f3f0eb;
        color: #1f1f1f;
      }

      .laibe-flow-status {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
        margin-top: 10px;
      }

      .laibe-flow-status span {
        border-radius: 999px;
        background: #f3f0eb;
        color: #594f4a;
        padding: 6px 9px;
        font-size: 11px;
        font-weight: 800;
      }

      .laibe-flow-status .ready {
        background: #e7f8ef;
        color: #17633d;
      }

      .laibe-flow-status .pending {
        background: #fff1df;
        color: #87510d;
      }

      .laibe-flow-toast {
        position: fixed;
        left: 50%;
        bottom: 22px;
        z-index: 9999;
        max-width: min(460px, calc(100% - 32px));
        transform: translate(-50%, 16px);
        opacity: 0;
        pointer-events: none;
        border: 1px solid rgba(173, 90, 90, 0.28);
        border-radius: 14px;
        background: rgba(255, 255, 255, 0.96);
        color: #1f1f1f;
        padding: 12px 14px;
        box-shadow: 0 16px 40px rgba(0, 0, 0, 0.18);
        transition: opacity 160ms ease, transform 160ms ease;
        font-size: 13px;
        line-height: 1.5;
      }

      .laibe-flow-toast.show {
        transform: translate(-50%, 0);
        opacity: 1;
      }
    `;
    document.head.appendChild(style);
  }

  function showToast(message) {
    let toast = document.getElementById("laibe-flow-toast");
    if (!toast) {
      toast = document.createElement("div");
      toast.id = "laibe-flow-toast";
      toast.className = "laibe-flow-toast";
      toast.setAttribute("role", "status");
      toast.setAttribute("aria-live", "polite");
      document.body.appendChild(toast);
    }
    toast.textContent = message;
    toast.classList.add("show");
    window.clearTimeout(showToast.timer);
    showToast.timer = window.setTimeout(() => toast.classList.remove("show"), 3200);
  }

  function insertAfterHeader(node) {
    const header = document.querySelector("header");
    if (header && header.parentNode) {
      header.parentNode.insertBefore(node, header.nextSibling);
      return;
    }
    document.body.insertBefore(node, document.body.firstChild);
  }

  function addBanner(id, title, body, actionText, actionHref) {
    if (document.getElementById(id)) return;
    const banner = document.createElement("div");
    banner.id = id;
    banner.className = "laibe-flow-banner";
    banner.innerHTML = `
      <div>
        <strong>${title}</strong>
        <span>${body}</span>
      </div>
      ${actionHref ? `<a href="${actionHref}">${actionText || "前往"}</a>` : ""}
    `;
    insertAfterHeader(banner);
  }

  function addPanel(id, title, body, actions) {
    if (document.getElementById(id)) return;
    const panel = document.createElement("section");
    panel.id = id;
    panel.className = "laibe-flow-panel";
    panel.innerHTML = `
      <h2>${title}</h2>
      <p>${body}</p>
      <div class="laibe-flow-actions">
        ${actions.map((action) => {
          const klass = action.secondary ? "secondary" : "";
          return `<a class="${klass}" href="${action.href}">${action.label}</a>`;
        }).join("")}
      </div>
      <div class="laibe-flow-status" data-flow-status></div>
    `;
    const main = document.querySelector("main");
    if (main) main.insertBefore(panel, main.firstChild);
    else insertAfterHeader(panel);
    updateFlowStatus();
  }

  function updateFlowStatus() {
    document.querySelectorAll("[data-flow-status]").forEach((status) => {
      const rows = [
        ["Owner Guide", isReady(STORAGE.ownerGuideReady)],
        ["Plan Puzzle tools", isReady(STORAGE.planPuzzleReady)],
        ["Budget preview", isReady(STORAGE.budgetPreviewReady)],
        ["Budget finalization", isReady(STORAGE.budgetFinalized)]
      ];
      status.innerHTML = rows.map(([label, ready]) => {
        return `<span class="${ready ? "ready" : "pending"}">${label}: ${ready ? "READY" : "PENDING"}</span>`;
      }).join("");
    });
  }

  function setHref(el, href, label) {
    if (!el) return;
    el.setAttribute("href", href);
    el.setAttribute("data-flow-route", href);
    if (label) {
      el.setAttribute("aria-label", label);
      el.setAttribute("title", label);
    }
  }

  function normalizeLandingRoutes() {
    const client = document.querySelector(".client-card")?.closest(".role-card-unit")?.querySelector(".role-btn");
    const vendor = document.querySelector(".vendor-card")?.closest(".role-card-unit")?.querySelector(".role-btn");
    setHref(client, ROUTES.ownerGuide, "業主入口：先完成需求引導");
    setHref(vendor, ROUTES.vendorPrototype, "乙方入口：prototype dashboard");

    const toolCards = Array.from(document.querySelectorAll(".bento-card.tool-banner"));
    if (toolCards[0]) setHref(toolCards[0], ROUTES.planPuzzle, "平面拼圖工具");
    if (toolCards[1]) setHref(toolCards[1], ROUTES.budgetPreview, "預算預覽工具");

    const heroRoutes = [
      [".requirement-form-card", ROUTES.ownerGuide],
      [".plan-preview-card", ROUTES.planPuzzle],
      [".quote-check-card", ROUTES.budgetPreview],
      [".tender-platform-card", ROUTES.tenderCandidate],
      [".award-dashboard-card", ROUTES.dashboardCandidate],
      [".pcm-alert-card", ROUTES.pcmCandidate]
    ];
    heroRoutes.forEach(([selector, href]) => {
      const card = document.querySelector(selector);
      if (card) {
        card.dataset.route = href;
        card.setAttribute("data-flow-route", href);
      }
    });

    document.querySelectorAll('a[href="#pcm"]').forEach((link) => setHref(link, ROUTES.pcmCandidate, "AI PCM candidate route"));
    document.querySelectorAll(".pcm-link").forEach((link) => setHref(link, ROUTES.pcmCandidate, "AI PCM candidate route"));

    addPanel(
      "laibe-main-flow-entry-panel",
      "網站主流程已串接",
      "甲方入口先進需求引導；平面拼圖與預算預覽若被直接點擊，會先檢查前置狀態。乙方、Tender、AI PCM 目前只進 prototype / candidate route。",
      [
        { label: "開始整理需求", href: ROUTES.ownerGuide },
        { label: "平面拼圖", href: ROUTES.planPuzzle, secondary: true },
        { label: "預算預覽", href: ROUTES.budgetPreview, secondary: true }
      ]
    );
  }

  function normalizeOwnerGuide() {
    document.querySelectorAll('a[href="../laibe_landing_desktop/code.html#pcm"]').forEach((link) => {
      setHref(link, ROUTES.pcmCandidate, "AI PCM candidate route");
    });
    addBanner(
      "laibe-owner-guide-gate-banner",
      "需求引導是必要前置門檻",
      "只有按下「確認需求紀錄」後才會標記 Owner Guide ready。這裡不呼叫真 AI API、不執行真上傳。",
      "我知道了",
      "#guideInput"
    );

    const markOwnerIncomplete = () => markReady(STORAGE.ownerGuideReady, "false");
    const completeGateButton = document.getElementById("completeRequirementGate");
    if (completeGateButton) {
      completeGateButton.addEventListener("click", () => {
        if (!completeGateButton.disabled) markReady(STORAGE.ownerGuideReady);
      });
      ["submitGuide", "undoRequirementNote"].forEach((id) => {
        const el = document.getElementById(id);
        if (el) el.addEventListener("click", markOwnerIncomplete, { capture: true });
      });
      ["guideText", "ownerAdditionalNotes"].forEach((id) => {
        const el = document.getElementById(id);
        if (el) el.addEventListener("input", markOwnerIncomplete);
      });
      document.querySelectorAll("[data-upload], [data-mock-upload-window]").forEach((el) => {
        el.addEventListener("click", markOwnerIncomplete, { capture: true });
      });
    } else {
      const markOwnerReady = () => markReady(STORAGE.ownerGuideReady);
      const submitGuide = document.getElementById("submitGuide");
      if (submitGuide) submitGuide.addEventListener("click", markOwnerReady, { capture: true });
    }
  }

  function normalizePlanPuzzle() {
    addBanner(
      "laibe-plan-tool-catalog-banner",
      "Plan Puzzle Tool Catalog interaction gate",
      "請先操作任一工具、匯入、比例、牆體、門窗、zone 或匯出測試按鈕。互動後才允許前往預算預覽；這不代表 Plancraft core 或正式預算已整合。",
      null,
      ""
    );
    document.addEventListener("click", (event) => {
      const toolControl = event.target.closest("[data-catalog-layer], [data-catalog-overlay], [data-catalog-item], [data-action], .tool-card, .toolbar-btn");
      if (toolControl && !toolControl.disabled) markReady(STORAGE.planPuzzleReady);
    }, true);
  }

  function normalizeBudgetPreview() {
    addPanel(
      "laibe-budget-preview-alignment-panel",
      "Budget Preview UI alignment",
      "本頁只顯示預算草稿 / snapshot-style preview。它不重新執行 Budget Engine，不產生 PricingRule、BudgetEstimateLine、正式價格、正式 Excel 或 PDF。",
      [
        { label: "返回平面拼圖", href: ROUTES.planPuzzle, secondary: true },
        { label: "進入預算確認", href: ROUTES.budgetFinalization }
      ]
    );
    document.addEventListener("click", (event) => {
      const link = event.target.closest(`a[href="${ROUTES.budgetFinalization}"]`);
      if (link) markReady(STORAGE.budgetPreviewReady);
    }, true);
    document.querySelectorAll(`a[href="${ROUTES.budgetFinalization}"]`).forEach((link) => {
      link.addEventListener("click", () => markReady(STORAGE.budgetPreviewReady), { capture: true });
    });
  }

  function normalizeBudgetFinalization() {
    document.querySelectorAll('a[href^="../tender_setting/code.html"]').forEach((link) => {
      setHref(link, ROUTES.documentPreview, "先前往預算文件預覽");
      link.textContent = "預算文件預覽";
    });
    document.querySelectorAll('a[href="#"]').forEach((link) => {
      const text = link.textContent || "";
      if (text.includes("PCM")) setHref(link, ROUTES.pcmCandidate, "AI PCM candidate route");
      if (text.includes("合約")) setHref(link, "../contract_generation_1/code.html", "合約生成 candidate route");
    });
    addPanel(
      "laibe-budget-finalization-route-panel",
      "Budget Finalization next-route decision",
      "本階段下一步固定為 Budget Document Preview。Tender / Dashboard / AI PCM 仍是 candidate route，不啟動正式招標、payment、DB 或 AI API。",
      [
        { label: "預算文件預覽", href: ROUTES.documentPreview },
        { label: "返回預算預覽", href: ROUTES.budgetPreview, secondary: true },
        { label: "Dashboard candidate", href: ROUTES.dashboardCandidate, secondary: true }
      ]
    );
    document.querySelectorAll(`a[href="${ROUTES.documentPreview}"]`).forEach((link) => {
      link.addEventListener("click", () => markReady(STORAGE.budgetFinalized), { capture: true });
    });
  }

  function normalizeDocumentPreview() {
    const navs = Array.from(document.querySelectorAll("nav a"));
    if (navs[0]) setHref(navs[0], ROUTES.ownerGuide, "導引討論");
    if (navs[1]) setHref(navs[1], ROUTES.planPuzzle, "平面配置");
    if (navs[2]) setHref(navs[2], ROUTES.budgetFinalization, "預算總覽");
    if (navs[3]) setHref(navs[3], ROUTES.tenderCandidate, "招標管理 candidate");

    addPanel(
      "laibe-budget-document-boundary-panel",
      "Budget Document Preview boundary",
      "這是 BudgetOutputSnapshot-style static preview / mock-only 文件頁。PDF / Excel 匯出按鈕只顯示邊界提示，不產生正式文件、不啟動 renderer runtime。",
      [
        { label: "返回預算確認", href: ROUTES.budgetFinalization, secondary: true },
        { label: "Dashboard candidate", href: ROUTES.dashboardCandidate },
        { label: "Tender candidate", href: ROUTES.tenderCandidate, secondary: true },
        { label: "AI PCM candidate", href: ROUTES.pcmCandidate, secondary: true }
      ]
    );

    const actionButtons = document.querySelectorAll('section[data-purpose="bottom-actions"] button');
    actionButtons.forEach((button, index) => {
      if (index === 0) {
        button.addEventListener("click", () => {
          window.location.href = ROUTES.budgetFinalization;
        });
        return;
      }
      button.disabled = false;
      button.setAttribute("aria-disabled", "true");
      button.dataset.mockBoundary = "no-file-generation";
      button.addEventListener("click", (event) => {
        event.preventDefault();
        showToast("此處只保留文件預覽邊界；不產生正式 PDF / Excel，也不啟動正式 renderer。");
      });
    });
  }

  function normalizeCandidatePage() {
    addBanner(
      "laibe-candidate-route-banner",
      "Candidate route / prototype only",
      "此頁是 Dashboard / Tender / AI PCM 候選路由。不可視為 production ready，不接 payment、DB、AI API、n8n 或正式招標。",
      "返回預算文件預覽",
      ROUTES.documentPreview
    );
  }

  function routeNeedsGate(route) {
    return /preview_floor_plan|preview_budget|client_step_4_budget_finalization|budget_document_preview/.test(route);
  }

  function handleRoute(event, rawRoute) {
    if (!rawRoute || rawRoute === "#") return false;
    const route = rawRoute.trim();

    if (route.includes("tender_setting/code.html")) {
      event.preventDefault();
      event.stopImmediatePropagation();
      window.location.href = `${ROUTES.tenderCandidate}?entry=redirected_from_tender_setting`;
      return true;
    }

    if (!routeNeedsGate(route)) return false;

    if (!isReady(STORAGE.ownerGuideReady) && !route.includes("onboard_ai_agent")) {
      event.preventDefault();
      event.stopImmediatePropagation();
      window.location.href = `${ROUTES.ownerGuide}?gate=owner-guide&next=${encodeURIComponent(route)}`;
      return true;
    }

    if ((route.includes("preview_budget") || route.includes("client_step_4") || route.includes("budget_document_preview")) && !isReady(STORAGE.planPuzzleReady)) {
      event.preventDefault();
      event.stopImmediatePropagation();
      showToast("請先在平面拼圖操作至少一個工具，完成 Tool Catalog interaction gate。");
      if (pageName() !== "preview_floor_plan") {
        window.location.href = `${ROUTES.planPuzzle}?gate=plan-tools&next=${encodeURIComponent(route)}`;
      }
      return true;
    }

    if ((route.includes("client_step_4") || route.includes("budget_document_preview")) && !isReady(STORAGE.budgetPreviewReady)) {
      event.preventDefault();
      event.stopImmediatePropagation();
      showToast("請先在 Budget Preview 確認 snapshot-only 預算草稿。");
      if (pageName() !== "preview_budget") {
        window.location.href = `${ROUTES.budgetPreview}?gate=budget-preview&next=${encodeURIComponent(route)}`;
      }
      return true;
    }

    return false;
  }

  function attachGlobalRouting() {
    document.addEventListener("click", (event) => {
      const card = event.target.closest("[data-flow-route], .hero-result-card[data-route]");
      const link = event.target.closest("a[href]");
      const route = card?.dataset.flowRoute || card?.dataset.route || link?.getAttribute("href");
      if (handleRoute(event, route)) return;

      if (card && card.dataset.route && !card.dataset.route.startsWith("#")) {
        event.preventDefault();
        event.stopImmediatePropagation();
        window.location.href = card.dataset.route;
      }
    }, true);
  }

  function init() {
    addStyles();
    const page = pageName();

    if (page === "laibe_landing_desktop") normalizeLandingRoutes();
    if (page === "onboard_ai_agent") normalizeOwnerGuide();
    if (page === "preview_floor_plan") normalizePlanPuzzle();
    if (page === "preview_budget") normalizeBudgetPreview();
    if (page === "client_step_4_budget_finalization") normalizeBudgetFinalization();
    if (page === "budget_document_preview") normalizeDocumentPreview();
    if (["client_awarding_dashboard", "tender_notice", "project_timeline_and_governance", "pro_dashboard"].includes(page)) normalizeCandidatePage();

    attachGlobalRouting();
    updateFlowStatus();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
