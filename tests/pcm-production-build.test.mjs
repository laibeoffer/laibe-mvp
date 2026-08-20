import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const repositoryRoot = path.resolve(fileURLToPath(new URL("../", import.meta.url)));
const distRoot = path.join(repositoryRoot, "dist", "drs");
const buildScript = path.join(repositoryRoot, "scripts", "build-drs-production.mjs");
const packagePath = path.join(repositoryRoot, "package.json");
const manifestPath = path.join(
  repositoryRoot,
  "src",
  "stitch_laibe_landing_onboarding",
  "pcm_standalone",
  "public",
  "pcm-flow-route-manifest.js",
);

function executeBuild(extraEnvironment = {}) {
  return spawnSync(process.execPath, [buildScript], {
    cwd: repositoryRoot,
    encoding: "utf8",
    env: { ...process.env, DRS_PUBLIC_ORIGIN: "", ...extraEnvironment },
  });
}

function runBuild(extraEnvironment = {}) {
  const result = executeBuild(extraEnvironment);
  assert.equal(
    result.status,
    0,
    `production build failed\nstdout:\n${result.stdout}\nstderr:\n${result.stderr}`,
  );
  return result.stdout;
}

async function listFiles(root, current = root) {
  const entries = await readdir(current, { withFileTypes: true });
  const files = [];
  for (const entry of entries.sort((left, right) => left.name.localeCompare(right.name))) {
    const absolute = path.join(current, entry.name);
    if (entry.isDirectory()) files.push(...await listFiles(root, absolute));
    if (entry.isFile()) files.push(path.relative(root, absolute).replaceAll(path.sep, "/"));
  }
  return files;
}

async function snapshot(root) {
  const files = await listFiles(root);
  const hash = createHash("sha256");
  for (const relative of files) {
    hash.update(relative);
    hash.update("\0");
    hash.update(await readFile(path.join(root, relative)));
    hash.update("\0");
  }
  return { files, sha256: hash.digest("hex") };
}

function entryPath(publicPath) {
  return path.join(distRoot, publicPath.slice(1), "index.html");
}

test("root package keeps existing JavaScript interpretation unchanged", async () => {
  const packageContract = JSON.parse(await readFile(packagePath, "utf8"));
  assert.notEqual(packageContract.type, "module", "root package must not globally force .js to ESM");
});

test("production build emits deterministic clean DRS routes and an allowlisted asset tree", async () => {
  const sourceManifest = await readFile(manifestPath, "utf8");
  assert.doesNotMatch(sourceManifest, /(?:https?:)?\/\/(?:127\.0\.0\.1|localhost)(?::\d+)?/iu);

  const { PCM_FLOW_ROUTE_MANIFEST } = await import(
    `data:text/javascript;base64,${Buffer.from(sourceManifest).toString("base64")}`
  );
  const deployNodes = PCM_FLOW_ROUTE_MANIFEST.nodes.filter(
    ({ publicPath, lifecycle }) => publicPath && ["active", "planned"].includes(lifecycle),
  );
  const retiredPaths = PCM_FLOW_ROUTE_MANIFEST.nodes
    .filter(({ lifecycle }) => lifecycle === "retired")
    .map(({ publicPath }) => publicPath)
    .filter(Boolean);

  runBuild();
  const first = await snapshot(distRoot);
  runBuild();
  const second = await snapshot(distRoot);
  assert.deepEqual(second, first, "repeated builds must be byte-for-byte deterministic");

  for (const node of deployNodes) {
    const html = await readFile(entryPath(node.publicPath), "utf8");
    assert.match(html, /<html\b[^>]*lang="zh-Hant"/iu, node.publicPath);
    assert.doesNotMatch(html, /(?:["']\/src\/|code\.html)/iu, node.publicPath);
    if (node.lifecycle === "active" && node.id !== "drawingCheck") {
      assert.match(html, /\/assets\/[a-f\d]{64}\//u, `${node.publicPath} asset URL`);
    }
  }
  for (const retiredPath of retiredPaths) {
    await assert.rejects(stat(entryPath(retiredPath)), { code: "ENOENT" });
  }

  const assetFiles = second.files.filter((file) => file.startsWith("assets/"));
  assert.ok(assetFiles.length > 0, "asset allowlist must not be empty");
  const assetRoots = new Set(assetFiles.map((file) => file.split("/").slice(0, 2).join("/")));
  assert.equal(assetRoots.size, 1, "all runtime assets share one content hash root");
  assert.match([...assetRoots][0], /^assets\/[a-f\d]{64}$/u);

  const productionManifestFile = assetFiles.find((file) => (
    file.endsWith("/src/stitch_laibe_landing_onboarding/pcm_standalone/public/pcm-flow-route-manifest.js")
  ));
  assert.ok(productionManifestFile, "production route manifest asset");
  const productionManifestSource = await readFile(
    path.join(distRoot, productionManifestFile),
    "utf8",
  );
  const {
    PCM_FLOW_ROUTE_MANIFEST: productionManifest,
    getActiveRouteHref: getProductionRouteHref,
  } = await import(
    `data:text/javascript;base64,${Buffer.from(productionManifestSource).toString("base64")}`
  );
  const productionNodeById = new Map(productionManifest.nodes.map((node) => [node.id, node]));
  for (const node of PCM_FLOW_ROUTE_MANIFEST.nodes.filter(({ lifecycle }) => lifecycle === "active")) {
    const suffix = node.href?.match(/[?#][\s\S]*$/u)?.[0] ?? "";
    assert.equal(productionNodeById.get(node.id)?.href, `${node.publicPath}${suffix}`, node.id);
  }
  const productionLinkById = new Map(
    productionManifest.canonicalLinks.map((link) => [link.id, link]),
  );
  for (const link of PCM_FLOW_ROUTE_MANIFEST.canonicalLinks.filter(({ relativeHref }) => relativeHref)) {
    assert.equal(
      productionLinkById.get(link.id)?.relativeHref,
      link.canonicalHttpUrl,
      `${link.id} production canonical route`,
    );
    if (link.toPage !== "accessUnavailable") {
      assert.notEqual(productionLinkById.get(link.id)?.relativeHref, "/pcm/access-unavailable", link.id);
    }
  }

  const [quoteEntry, quoteRuntime] = await Promise.all([
    readFile(entryPath("/pcm/quote-check"), "utf8"),
    readFile(path.join(distRoot, assetFiles.find((file) => file.endsWith("/pcm_standalone/quote_check/app.js"))), "utf8"),
  ]);
  assert.match(quoteEntry, /href="\/pcm\/drawing-check"[^>]*data-drawing-check-link/u);
  assert.match(quoteRuntime, /DRAWING_CHECK_HREF = "\/pcm\/drawing-check"/u);
  assert.equal(getProductionRouteHref("drawingCheck"), "/pcm/drawing-check");

  const forbiddenTopLevel = /^(?:docs|tests|config|app|tools|scripts|\.github|\.git|\.superpowers)(?:\/|$)/iu;
  const forbiddenArtifact = /(?:^|\/)(?:archive|manual|screenshots?)(?:\/|$)|\.(?:map|zip|rar|7z|env|pem|key|p12)$/iu;
  for (const file of assetFiles) {
    const repositoryRelative = file.split("/").slice(2).join("/");
    assert.doesNotMatch(repositoryRelative, forbiddenTopLevel, file);
    assert.doesNotMatch(repositoryRelative, forbiddenArtifact, file);
    assert.doesNotMatch(repositoryRelative, /(?:credential|secret|token|api[_-]?key)/iu, file);
  }

  const javascript = (
    await Promise.all(
      assetFiles
        .filter((file) => /\.(?:m?js)$/iu.test(file))
        .map((file) => readFile(path.join(distRoot, file), "utf8")),
    )
  ).join("\n");
  assert.doesNotMatch(javascript, /LaibePdfPlanExactSourceQa|LaibePlanPuzzleQa|__LAIBE_[A-Z0-9_]*_QA/iu);
  assert.doesNotMatch(javascript, /tests[\\/]manual|(?:https?:)?\/\/(?:127\.0\.0\.1|localhost)(?::\d+)?/iu);
  assert.doesNotMatch(javascript, /(?:\/src\/|code\.html)/iu);

  const drawing = await readFile(entryPath("/pcm/drawing-check"), "utf8");
  assert.match(drawing, /圖說辨識功能正在整理中/u);
  assert.match(drawing, /返回 DRS 首頁/u);
});

test("production build rejects every undeclared local stylesheet, module, and image dependency", async () => {
  const probeRelative = ".superpowers/sdd/task-1-unknown-dependency-probe.html";
  const probePath = path.join(repositoryRoot, probeRelative);
  const probes = [
    '<link rel="stylesheet" href="./missing-production-style.css" />',
    '<script type="module" src="./missing-production-module.js"></script>',
    '<img src="./missing-production-image.svg" alt="" />',
  ];
  try {
    for (const probe of probes) {
      await writeFile(probePath, `<!doctype html><html><head>${probe}</head><body></body></html>`, "utf8");
      const result = executeBuild({ DRS_BUILD_DEPENDENCY_PROBE: probeRelative });
      assert.notEqual(result.status, 0, probe);
      assert.match(
        result.stderr,
        /Unknown local (?:href|src) dependency ".+" referenced by ".superpowers\/sdd\/task-1-unknown-dependency-probe\.html"/u,
        result.stderr,
      );
    }
  } finally {
    await rm(probePath, { force: true });
  }
});

test("production metadata provides strict headers, bounded redirects, a true 404, robots, and sitemap", async () => {
  runBuild();
  const [headers, redirects, notFound, robots, sitemap] = await Promise.all([
    readFile(path.join(distRoot, "_headers"), "utf8"),
    readFile(path.join(distRoot, "_redirects"), "utf8"),
    readFile(path.join(distRoot, "404.html"), "utf8"),
    readFile(path.join(distRoot, "robots.txt"), "utf8"),
    readFile(path.join(distRoot, "sitemap.xml"), "utf8"),
  ]);

  for (const header of [
    "Content-Security-Policy:",
    "Strict-Transport-Security:",
    "X-Content-Type-Options: nosniff",
    "Referrer-Policy:",
    "Permissions-Policy:",
  ]) assert.match(headers, new RegExp(header, "u"), header);
  assert.match(headers, /frame-ancestors 'none'/u);
  assert.match(headers, /worker-src 'self' blob:/u);
  assert.match(headers, /https:\/\/PROJECT_REF\.supabase\.co/u);
  assert.match(headers, /https:\/\/calendar\.google\.com/u);
  assert.doesNotMatch(headers, /script-src[^\n]*(?:\*|'unsafe-eval')/u);

  assert.doesNotMatch(redirects, /\/src\/|\s\/\*\s|200\s*$/mu);
  for (const line of redirects.trim().split(/\r?\n/u)) {
    const [from, to, status] = line.trim().split(/\s+/u);
    assert.equal(from.endsWith("/"), true, line);
    assert.equal(to, from.slice(0, -1), line);
    assert.equal(status, "301", line);
  }

  assert.match(notFound, /<title>找不到頁面｜LaiBE DRS<\/title>/u);
  assert.match(notFound, /這個頁面不存在/u);
  assert.match(notFound, /href="\/pcm"/u);
  assert.doesNotMatch(notFound, /http-equiv=["']refresh|location\.(?:href|replace)|window\.location/iu);
  assert.match(robots, /^User-agent: \*\r?\nAllow: \/$/mu);
  assert.doesNotMatch(sitemap, /<loc>https?:\/\//u);
  assert.match(sitemap, /<loc>\/pcm<\/loc>/u);

  runBuild({ DRS_PUBLIC_ORIGIN: "https://drs.example.test/" });
  const absoluteSitemap = await readFile(path.join(distRoot, "sitemap.xml"), "utf8");
  assert.match(absoluteSitemap, /<loc>https:\/\/drs\.example\.test\/pcm<\/loc>/u);
  assert.doesNotMatch(absoluteSitemap, /drs\.example\.test\/\//u);
});

test("DRS_PUBLIC_ORIGIN rejects credentials, non-root paths, queries, and fragments", () => {
  for (const invalidOrigin of [
    "https://user:password@drs.example.test/",
    "https://drs.example.test/not-an-origin",
    "https://drs.example.test/?preview=1",
    "https://drs.example.test/#preview",
  ]) {
    const result = executeBuild({ DRS_PUBLIC_ORIGIN: invalidOrigin });
    assert.notEqual(result.status, 0, invalidOrigin);
    assert.match(result.stderr, /DRS_PUBLIC_ORIGIN must be an HTTPS origin/u, invalidOrigin);
  }
});
