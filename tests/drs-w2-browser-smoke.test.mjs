import assert from "node:assert/strict";
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const { chromium } = require("playwright");

const repositoryRoot = path.resolve(fileURLToPath(new URL("../", import.meta.url)));
const workspaceBasePath = "/src/stitch_laibe_landing_onboarding/drs_standalone";
const roles = ["owner_workspace", "vendor_workspace", "specialist_workspace"];
const states = ["loading", "ready", "empty", "retryable-error", "permission-denied"];
const viewports = [
  { name: "desktop", width: 1440, height: 900 },
  { name: "mobile", width: 390, height: 844 },
];
const forbiddenVisibleCopy =
  /\b(DB|API|debug|mock-only|mock|JSON|stack trace|GitHub truth|source clean)\b|本機候選|無 DB 寫入|API 未開|功能停用|EDIT_AND_SEND|OVERRIDE_AND_SEND|MANUAL_EXCEPTION_SEND|老屋煉金術|金流託管|支付託管|代收代付|投資報酬|低價競標/iu;

function contentType(filePath) {
  if (filePath.endsWith(".html")) return "text/html; charset=utf-8";
  if (filePath.endsWith(".js")) return "text/javascript; charset=utf-8";
  if (filePath.endsWith(".css")) return "text/css; charset=utf-8";
  return "application/octet-stream";
}

function startStaticServer() {
  const server = createServer(async (request, response) => {
    try {
      const url = new URL(request.url ?? "/", "http://127.0.0.1");
      const normalizedPath = path
        .normalize(decodeURIComponent(url.pathname))
        .replace(/^([/\\])+/, "");
      const target = path.resolve(repositoryRoot, normalizedPath);
      const relative = path.relative(repositoryRoot, target);
      if (!relative || relative.startsWith("..") || path.isAbsolute(relative)) {
        response.writeHead(403);
        response.end("forbidden");
        return;
      }
      const body = await readFile(target);
      response.writeHead(200, { "content-type": contentType(target) });
      response.end(body);
    } catch {
      response.writeHead(404);
      response.end("not found");
    }
  });
  return new Promise((resolve) => {
    server.listen(0, "127.0.0.1", () => resolve(server));
  });
}

function stopServer(server) {
  return new Promise((resolve, reject) => {
    server.close((error) => error ? reject(error) : resolve());
  });
}

test("admitted DRS Workspace UI preserves state gating and product copy in browser", { timeout: 90_000 }, async () => {
  const server = await startStaticServer();
  const { port } = server.address();
  const base = `http://127.0.0.1:${port}${workspaceBasePath}`;
  const browser = await chromium.launch({ headless: true });
  const failures = [];
  const consoleErrors = [];

  try {
    for (const viewport of viewports) {
      const context = await browser.newContext({
        viewport: { width: viewport.width, height: viewport.height },
        reducedMotion: "reduce",
      });
      const page = await context.newPage();
      page.on("console", (message) => {
        if (message.type() === "error") consoleErrors.push(`${viewport.name}:${message.text()}`);
      });
      page.on("pageerror", (error) => {
        consoleErrors.push(`${viewport.name}:pageerror:${error.message}`);
      });

      for (const role of roles) {
        for (const state of states) {
          await page.goto(`${base}/${role}/code.html?drs_state=${encodeURIComponent(state)}`, {
            waitUntil: "networkidle",
          });
          await page.waitForTimeout(50);
          const result = await page.evaluate(({ expectedState, forbiddenSource }) => {
            const forbidden = new RegExp(forbiddenSource, "iu");
            const bodyText = document.body?.innerText ?? "";
            const tabs = [...document.querySelectorAll("[data-drs-tab]")];
            const panels = [...document.querySelectorAll("[data-drs-panel]")];
            const ready = expectedState === "ready";
            const visiblePanels = panels.filter((panel) =>
              !panel.hidden && getComputedStyle(panel).display !== "none"
            ).length;
            const visibleReadyContent = [...document.querySelectorAll("[data-drs-ready-content]")]
              .filter((element) => !element.hidden && getComputedStyle(element).display !== "none")
              .length;
            const selectedTabs = tabs.filter((tab) => tab.getAttribute("aria-selected") === "true").length;
            const tabbableTabs = tabs.filter((tab) => tab.tabIndex === 0).length;
            const enabledTabs = tabs.filter((tab) =>
              !tab.disabled && tab.getAttribute("aria-disabled") !== "true"
            ).length;
            const nonReadyInteractiveTabs = !ready
              ? tabs.filter((tab) => !tab.disabled || tab.tabIndex >= 0 || tab.getAttribute("aria-disabled") !== "true").length
              : 0;
            const overflow = Math.max(0, document.documentElement.scrollWidth - document.documentElement.clientWidth);
            const smallControls = [...document.querySelectorAll("button,a,input,select,textarea,[role='button']")]
              .filter((element) => {
                const style = getComputedStyle(element);
                if (style.display === "none" || style.visibility === "hidden" || element.hidden) return false;
                const rect = element.getBoundingClientRect();
                return rect.width > 0 && rect.height > 0 && (rect.width < 44 || rect.height < 44);
              })
              .map((element) => ({
                text: (element.textContent || element.getAttribute("aria-label") || "").trim().slice(0, 40),
                width: Math.round(element.getBoundingClientRect().width),
                height: Math.round(element.getBoundingClientRect().height),
              }));
            return {
              visiblePanels,
              selectedTabs,
              tabbableTabs,
              enabledTabs,
              nonReadyInteractiveTabs,
              visibleReadyContent,
              overflow,
              smallControls,
              forbidden: forbidden.test(bodyText),
            };
          }, { expectedState: state, forbiddenSource: forbiddenVisibleCopy.source });

          if (result.forbidden) failures.push(`${viewport.name}:${role}:${state}: forbidden visible copy`);
          if (result.overflow !== 0) failures.push(`${viewport.name}:${role}:${state}: horizontal overflow ${result.overflow}`);
          if (result.smallControls.length > 0) {
            failures.push(`${viewport.name}:${role}:${state}: controls below 44px ${JSON.stringify(result.smallControls)}`);
          }
          if (state === "ready") {
            if (result.visiblePanels !== 1 || result.selectedTabs !== 1 || result.tabbableTabs !== 1) {
              failures.push(`${viewport.name}:${role}: ready expected one panel/tab, got ${result.visiblePanels}/${result.selectedTabs}/${result.tabbableTabs}`);
            }
            const tabs = await page.$$("[data-drs-tab]");
            if (tabs[1]) {
              await tabs[1].click();
              const afterClick = await page.evaluate(() => ({
                visiblePanels: [...document.querySelectorAll("[data-drs-panel]")]
                  .filter((panel) => !panel.hidden && getComputedStyle(panel).display !== "none").length,
                selectedTabs: [...document.querySelectorAll("[data-drs-tab]")]
                  .filter((tab) => tab.getAttribute("aria-selected") === "true").length,
                tabbableTabs: [...document.querySelectorAll("[data-drs-tab]")]
                  .filter((tab) => tab.tabIndex === 0).length,
              }));
              if (afterClick.visiblePanels !== 1 || afterClick.selectedTabs !== 1 || afterClick.tabbableTabs !== 1) {
                failures.push(`${viewport.name}:${role}: after tab switch expected one panel/tab, got ${JSON.stringify(afterClick)}`);
              }
            }
          } else if (
            result.enabledTabs !== 0 ||
            result.nonReadyInteractiveTabs !== 0 ||
            result.visibleReadyContent !== 0
          ) {
            failures.push(`${viewport.name}:${role}:${state}: non-ready tabs or ready-only content not inert`);
          }
        }
      }

      if (viewport.name === "mobile") {
        await page.goto(`${base}/specialist_workspace/code.html?drs_state=ready`, { waitUntil: "networkidle" });
        await page.click("[data-drs-action='open-control']");
        await page.click("[data-drs-action='edit-send']");
        await page.waitForTimeout(100);
        const specialistDecision = await page.evaluate(({ forbiddenSource }) => {
          const text = document.body?.innerText ?? "";
          const trace = [...document.querySelectorAll("[data-drs-list='trace'] li")]
            .map((item) => item.innerText)
            .join("\n");
          return {
            forbidden: new RegExp(forbiddenSource, "iu").test(text),
            hasEnum: /EDIT_AND_SEND|OVERRIDE_AND_SEND|MANUAL_EXCEPTION_SEND/.test(text),
            hasProductTraceLabel: /編修後建立送出前紀錄/.test(trace),
          };
        }, { forbiddenSource: forbiddenVisibleCopy.source });
        assert.deepEqual(specialistDecision, {
          forbidden: false,
          hasEnum: false,
          hasProductTraceLabel: true,
        });
      }

      await context.close();
    }

    assert.deepEqual(consoleErrors, []);
    assert.deepEqual(failures, []);
  } finally {
    await browser.close();
    await stopServer(server);
  }
});
