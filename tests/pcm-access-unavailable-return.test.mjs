import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const pageRoot = path.join(
  repositoryRoot,
  "src",
  "stitch_laibe_landing_onboarding",
  "pcm_standalone",
  "access_unavailable",
);

const appUrl = pathToFileURL(path.join(pageRoot, "app.js")).href;

test("returnTo=owner resolves the exact owner workspace action", async () => {
  const runtime = await import(`${appUrl}?owner-return-contract`);

  assert.equal(typeof runtime.resolveAccessUnavailableReturn, "function");
  assert.deepEqual(
    runtime.resolveAccessUnavailableReturn({
      href: "http://127.0.0.1:4173/pcm/access-unavailable/?contractType=DESIGN_BUILD&returnTo=owner",
    }),
    {
      label: "返回工作台",
      href: "/pcm/owner/workspace/#overview",
      description: "返回甲方工作台後，可從案件入口重新確認目前的存取權限。",
    },
  );
});

test("only one exact owner marker may select the owner workspace return", async () => {
  const runtime = await import(`${appUrl}?fail-closed-return-contract`);
  const fallback = {
    label: "安全返回 PCM 首頁",
    href: "/pcm/",
    description: "返回 PCM 首頁後，可從正式服務通知或正確入口重新進入。",
  };

  for (const href of [
    "http://127.0.0.1:4173/pcm/access-unavailable/",
    "http://127.0.0.1:4173/pcm/access-unavailable/?returnTo=Owner",
    "http://127.0.0.1:4173/pcm/access-unavailable/?returnTo=vendor",
    "http://127.0.0.1:4173/pcm/access-unavailable/?returnTo=owner&returnTo=owner",
  ]) {
    assert.deepEqual(runtime.resolveAccessUnavailableReturn({ href }), fallback, href);
  }
  assert.deepEqual(runtime.resolveAccessUnavailableReturn(null), fallback);
});

test("page exposes one bounded return action for runtime binding", async () => {
  const html = await readFile(path.join(pageRoot, "code.html"), "utf8");

  assert.match(
    html,
    /<a class="button button--primary" data-return-action href="\.\.\/public_home\/code\.html">安全返回 PCM 首頁<\/a>/u,
  );
  assert.match(html, /<p data-return-description>返回 PCM 首頁後/u);
});
