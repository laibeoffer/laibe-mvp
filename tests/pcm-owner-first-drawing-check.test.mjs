import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { pathToFileURL } from "node:url";

const root = process.cwd();
const publicTarget = "/pcm/quote-check/?mode=contract#document-workspace";
const workspaceTarget = "../quote_check/code.html?mode=contract#document-workspace";
const drawingDirectory = path.join(
  root,
  "src/stitch_laibe_landing_onboarding/pcm_standalone/drawing_check",
);
const quoteHtmlPath = path.join(
  root,
  "src/stitch_laibe_landing_onboarding/pcm_standalone/quote_check/code.html",
);
const quoteAppUrl = pathToFileURL(
  path.join(
    root,
    "src/stitch_laibe_landing_onboarding/pcm_standalone/quote_check/app.js",
  ),
);
const manifestUrl = pathToFileURL(
  path.join(
    root,
    "src/stitch_laibe_landing_onboarding/pcm_standalone/public/pcm-flow-route-manifest.js",
  ),
);
const buildPath = path.join(root, "scripts/build-drs-production.mjs");

test("drawing check no longer has an independent product source", () => {
  for (const file of ["code.html", "app.js", "styles.css"]) {
    assert.equal(existsSync(path.join(drawingDirectory, file)), false, file);
  }
});

test("the retired drawing route is a compatibility redirect into the contract document workspace", async () => {
  const { PCM_FLOW_ROUTE_MANIFEST } = await import(
    manifestUrl.href + "?retirement=" + Date.now()
  );
  const drawingCheck = PCM_FLOW_ROUTE_MANIFEST.nodes.find(({ id }) => id === "drawingCheck");
  assert.deepEqual(drawingCheck, {
    id: "drawingCheck",
    publicPath: "/pcm/drawing-check",
    label: "文件健檢舊入口",
    role: "甲方",
    owner: "A0",
    lifecycle: "compatibility_redirect",
    gate: "G1_UI_SOURCE",
    href: workspaceTarget,
    redirectTo: publicTarget,
  });
});

test("quote, drawing, and contract checks share one document workspace", async () => {
  const html = readFileSync(quoteHtmlPath, "utf8");
  assert.equal(html.includes("../drawing_check/code.html"), false);
  assert.equal(html.includes("/pcm/drawing-check"), false);

  const { resolveDocumentWorkspaceMode } = await import(
    quoteAppUrl.href + "?retirement=" + Date.now()
  );
  assert.equal(resolveDocumentWorkspaceMode(""), "contract");
  assert.equal(resolveDocumentWorkspaceMode("?mode=quote"), "quote");
  assert.equal(resolveDocumentWorkspaceMode("?mode=drawing"), "drawing");
  assert.equal(resolveDocumentWorkspaceMode("?mode=contract"), "contract");
});

test("production build emits only a redirect shell for the retired route", () => {
  const buildSource = readFileSync(buildPath, "utf8");
  assert.equal(buildSource.includes("pcm_standalone/drawing_check/code.html"), false);
  assert.equal(buildSource.includes("pcm_standalone/drawing_check/app.js"), false);
  assert.equal(buildSource.includes("pcm_standalone/drawing_check/styles.css"), false);
  assert.match(buildSource, /compatibility_redirect/);
  assert.match(
    buildSource,
    /\/pcm\/quote-check\/\?mode=contract#document-workspace/,
  );
});
