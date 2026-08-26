import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import test from "node:test";

const repoRoot = fileURLToPath(new URL("../", import.meta.url));
const specialistRoot = path.join(
  repoRoot,
  "src",
  "stitch_laibe_landing_onboarding",
  "drs_standalone",
  "specialist_workspace",
);
const sharedRoot = path.join(
  repoRoot,
  "src",
  "stitch_laibe_landing_onboarding",
  "drs_standalone",
  "shared",
);

function readOptional(...segments) {
  const filePath = path.join(...segments);
  return existsSync(filePath) ? readFileSync(filePath, "utf8") : "";
}

test("single-owner composition RED: normal route cannot derive authority from query or a ready default", () => {
  const renderer = readOptional(sharedRoot, "drs-workspace-renderer.js");

  assert.ok(renderer, "shared DRS renderer must be present in the composed source closure");
  assert.doesNotMatch(renderer, /URLSearchParams|drs_state|\|\|\s*["']ready["']/);
  assert.match(renderer, /loading/i);
  assert.match(renderer, /permission-denied|permission_denied/i);
});

test("single-owner composition RED: pregrant UI exposes no hard-coded reviewer, case, trace, or operative action", () => {
  const app = readOptional(specialistRoot, "app.js");
  const html = readOptional(specialistRoot, "code.html");

  assert.ok(app && html, "specialist application and document must be present");
  assert.doesNotMatch(`${app}\n${html}`, /CHIEF_REVIEWER|CASE-A7/);
  assert.match(html, /data-drs-authorized-content/);
  assert.match(html, /data-drs-authorized-content[^>]*\bhidden\b|\bhidden\b[^>]*data-drs-authorized-content/);
  assert.match(app, /clear|purge/i);
});

test("single-owner composition RED: audit and local-draft copy stay truthful", () => {
  const app = readOptional(specialistRoot, "app.js");
  const html = readOptional(specialistRoot, "code.html");
  const combined = `${app}\n${html}`;

  assert.match(
    combined,
    /正式權限與稽核紀錄尚未取得；待治理功能完成授權並成功建立紀錄後，才會顯示可執行範圍與留痕。/,
  );
  assert.match(combined, /此操作目前只保留在本頁；尚未送出，尚未建立正式案件紀錄。/);
  assert.doesNotMatch(combined, /最高權限.*不可變更稽核|完成操作時記錄/);
});

test("single-owner composition RED: session proof comes from exact same-origin BFF bootstrap and remains ephemeral", () => {
  const adapter = readOptional(specialistRoot, "drs-session-adapter.js");
  const app = readOptional(specialistRoot, "app.js");
  const combined = `${adapter}\n${app}`;

  assert.ok(adapter && app, "session adapter and specialist application must be present");
  assert.match(combined, /\/functions\/v1\/drs-session-bootstrap/);
  assert.match(combined, /credentials:\s*["']same-origin["']/);
  assert.match(combined, /authorization/i);
  assert.match(combined, /x-laibe-session-expires-at/i);
  assert.doesNotMatch(adapter, /localStorage|sessionStorage|location\.(?:search|hash)/);
});

test("single-owner composition RED: workspace grant strictly precedes Calendar access and failures purge stale projections", () => {
  const app = readOptional(specialistRoot, "app.js");
  const workspaceOffset = app.indexOf("workspaceTransport.loadWorkspaceGrant");
  const calendarOffset = app.indexOf("calendarTransport.loadGrant");
  const eventsOffset = app.indexOf("calendarTransport.loadEvents");

  assert.ok(app, "specialist application must be present");
  assert.ok(workspaceOffset >= 0, "workspace grant loader must be wired");
  assert.ok(calendarOffset > workspaceOffset, "Calendar grant must follow workspace grant");
  assert.ok(eventsOffset > calendarOffset, "Calendar events must follow Calendar grant");
  assert.match(app, /clearAll|clearCalendar|purge(?:Stale)?Projection/);
});

test("single-owner composition RED: both DRS routes have self-contained manifest and production-build closure", () => {
  const manifest = readOptional(
    repoRoot,
    "src",
    "stitch_laibe_landing_onboarding",
    "pcm_standalone",
    "public",
    "pcm-flow-route-manifest.js",
  );
  const builder = readOptional(repoRoot, "scripts", "build-drs-production.mjs");
  const productionTest = readOptional(repoRoot, "tests", "pcm-production-build.test.mjs");
  const combined = `${manifest}\n${builder}\n${productionTest}`;

  assert.match(combined, /\/pcm\/console/);
  assert.match(combined, /\/pcm\/console\/case/);
  assert.match(manifest, /id:\s*["']pcmAuthorizedList["'][\s\S]{0,500}lifecycle:\s*["']active["']/);
  assert.match(manifest, /id:\s*["']pcmCaseWorkspace["'][\s\S]{0,500}lifecycle:\s*["']active["']/);
  assert.match(builder, /pcmAuthorizedList[\s\S]{0,500}drs_standalone[\\/]specialist_workspace/);
  assert.match(builder, /pcmCaseWorkspace[\s\S]{0,500}drs_standalone[\\/]specialist_workspace/);
  assert.match(productionTest, /entryPath\(node\.publicPath\)/);
  assert.match(productionTest, /deployNodes\.length,\s*18/);
});
