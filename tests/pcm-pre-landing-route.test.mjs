import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import vm from "node:vm";
import { fileURLToPath, pathToFileURL } from "node:url";

const repositoryRoot = path.resolve(fileURLToPath(new URL("../", import.meta.url)));
const preLandingPath = path.join(
  repositoryRoot,
  "src/stitch_laibe_landing_onboarding/pcm_standalone/pre_landing/code.html",
);
const manifestUrl = pathToFileURL(path.join(
  repositoryRoot,
  "src/stitch_laibe_landing_onboarding/pcm_standalone/public/pcm-flow-route-manifest.js",
));
const buildPath = path.join(repositoryRoot, "scripts/build-drs-production.mjs");

function scriptFrom(html) {
  const matches = [...html.matchAll(/<script>([\s\S]*?)<\/script>/gu)];
  assert.ok(matches.length > 0, "pre-landing inline script");
  return matches.at(-1)[1];
}

function executeIntro(source, { reducedMotion = false } = {}) {
  const frames = [];
  const replacements = [];
  let skipHandler = null;
  const genericElement = () => ({
    style: {},
    textContent: "",
    classList: { add() {}, toggle() {} },
    querySelector() { return genericElement(); },
  });
  const skip = { addEventListener(type, handler) { if (type === "click") skipHandler = handler; } };
  const document = {
    body: { dataset: {} },
    documentElement: { classList: { add() {} } },
    querySelector(selector) { return selector === "#skip" ? skip : genericElement(); },
    querySelectorAll(selector) {
      if (selector === ".question-row") return Array.from({ length: 6 }, genericElement);
      if (selector === ".closing-line") return Array.from({ length: 2 }, genericElement);
      if (selector === ".axis-end") return Array.from({ length: 2 }, genericElement);
      if (selector === ".axis-label-party-a, .axis-label-party-b") return Array.from({ length: 2 }, genericElement);
      return [];
    },
  };
  const context = {
    document,
    window: {
      location: { replace(destination) { replacements.push(destination); } },
      matchMedia() { return { matches: reducedMotion }; },
    },
    performance: { now() { return 0; } },
    requestAnimationFrame(callback) { frames.push(callback); return frames.length; },
    cancelAnimationFrame() {},
  };
  vm.runInNewContext(source, context);
  return { frames, replacements, clickSkip: () => skipHandler?.() };
}

test("pre-landing is the root route while the original DRS home remains /pcm", async () => {
  const { PCM_FLOW_ROUTE_MANIFEST } = await import(`${manifestUrl.href}?pre-landing=${Date.now()}`);
  const byId = new Map(PCM_FLOW_ROUTE_MANIFEST.nodes.map((node) => [node.id, node]));
  assert.deepEqual(
    { publicPath: byId.get("preLanding")?.publicPath, href: byId.get("preLanding")?.href },
    { publicPath: "/", href: "../pre_landing/code.html" },
  );
  assert.deepEqual(
    { publicPath: byId.get("home")?.publicPath, href: byId.get("home")?.href },
    { publicPath: "/pcm", href: "../public_home/code.html#top" },
  );
});

test("pre-landing preserves the supplied composition and has no Enter control", async () => {
  const html = await readFile(preLandingPath, "utf8");
  const canonicalLogo = await readFile(path.join(repositoryRoot, "assets/logo/laibe_offer.svg"));
  assert.match(html, /const logoEnd = 8200;/u);
  assert.equal((html.match(/class="question-row"/gu) ?? []).length, 6);
  assert.equal((html.match(/class="closing-line/gu) ?? []).length, 2);
  assert.match(html, /scale\(0\.667\)/u);
  assert.match(html, /id="skip"/u);
  assert.equal(
    (html.match(/\.\.\/\.\.\/\.\.\/\.\.\/assets\/logo\/laibe_offer\.svg/gu) ?? []).length,
    2,
    "favicon and closing logo reuse the existing byte-identical canonical asset",
  );
  assert.equal(
    createHash("sha256").update(canonicalLogo).digest("hex"),
    "2befcc15bb6ad9f5a4ee4e91075f07fb8dc257dab9e520279646900c2e51c8ac",
  );
  assert.doesNotMatch(html, /id="enter"|#enter|>\s*Enter\s*<|stitch_code\/landing_page/iu);
});

test("natural completion, Skip, and reduced motion replace history with /pcm once", async () => {
  const html = await readFile(preLandingPath, "utf8");
  const source = scriptFrom(html);

  const natural = executeIntro(source);
  assert.equal(natural.frames.length, 1);
  natural.frames.shift()(8201);
  assert.deepEqual(natural.replacements, ["/pcm"]);
  natural.clickSkip();
  natural.clickSkip();
  assert.deepEqual(natural.replacements, ["/pcm"], "completion and Skip share one navigation guard");

  const skipped = executeIntro(source);
  skipped.clickSkip();
  skipped.clickSkip();
  assert.deepEqual(skipped.replacements, ["/pcm"], "Skip replaces only once");

  const reduced = executeIntro(source, { reducedMotion: true });
  assert.deepEqual(reduced.replacements, ["/pcm"], "reduced motion navigates without animation");
});

test("production build owns the root artifact without a self-redirect", async () => {
  const build = await readFile(buildPath, "utf8");
  assert.match(build, /preLanding:\s*"src\/stitch_laibe_landing_onboarding\/pcm_standalone\/pre_landing\/code\.html"/u);
  assert.match(build, /"assets\/logo\/laibe_offer\.svg"/u);
  assert.doesNotMatch(build, /pcm_standalone\/pre_landing\/laibe_offer\.svg/u);
  assert.match(build, /publicPath === "\/"\s*\? "index\.html"/u);
  assert.match(build, /filter\(\(\{ publicPath \}\) => publicPath !== "\/"\)/u);
});
