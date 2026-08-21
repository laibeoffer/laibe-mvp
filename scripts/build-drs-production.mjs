import { createHash, randomUUID } from "node:crypto";
import { mkdir, readFile, readdir, rename, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repositoryRoot = path.resolve(fileURLToPath(new URL("../", import.meta.url)));
const distParent = path.resolve(repositoryRoot, "dist");
const distRoot = path.resolve(distParent, "drs");
const manifestRelative = "src/stitch_laibe_landing_onboarding/pcm_standalone/public/pcm-flow-route-manifest.js";
const manifestPath = path.join(repositoryRoot, manifestRelative);
const manifestSource = await readFile(manifestPath, "utf8");
const manifestModule = await import(
  `data:text/javascript;base64,${Buffer.from(manifestSource).toString("base64")}`
);
const { PCM_FLOW_ROUTE_MANIFEST } = manifestModule;

const SOURCE_ENTRY_BY_ID = Object.freeze({
  home: "src/stitch_laibe_landing_onboarding/pcm_standalone/public_home/code.html",
  aboutDrs: "src/stitch_laibe_landing_onboarding/pcm_standalone/about_drs/code.html",
  quoteCheck: "src/stitch_laibe_landing_onboarding/pcm_standalone/quote_check/code.html",
  drawingCheck: "src/stitch_laibe_landing_onboarding/pcm_standalone/drawing_check/code.html",
  accountAccess: "src/stitch_laibe_landing_onboarding/pcm_standalone/account_access/code.html",
  serviceContract: "src/stitch_laibe_landing_onboarding/pcm_standalone/service_contract/code.html",
  contractPrerequisites: "src/stitch_laibe_landing_onboarding/pcm_standalone/contract_prerequisites/code.html",
  contractSigning: "src/stitch_laibe_landing_onboarding/pcm_standalone/contract_signing/code.html",
  ownerWorkspace: "src/stitch_laibe_landing_onboarding/client_awarding_dashboard/code.html",
  vendorWorkspace: "src/stitch_laibe_landing_onboarding/pcm_standalone/vendor_workspace/code.html",
  accessUnavailable: "src/stitch_laibe_landing_onboarding/pcm_standalone/access_unavailable/code.html",
});

// Every production runtime file must be named here. Directories are never copied.
const ASSET_ALLOWLIST = Object.freeze([
  "assets/logo/laibe_offer.svg",
  "src/lib/budget/quote-healthcheck/browser-adapter.js",
  "site/preview_floor_plan/vendor/pdfjs/pdf.mjs",
  "site/preview_floor_plan/vendor/pdfjs/pdf.worker.mjs",
  "site/preview_floor_plan/browser-recognition-adapter.mjs",
  "site/preview_floor_plan/pdf-dimension-scale-decision.mjs",
  "site/preview_floor_plan/pdf-plan-objectization-adapter.js",
  "site/preview_floor_plan/pdf-plan-selected-source-presentation.mjs",
  "site/preview_floor_plan/pdf-plan-vector-extractor.js",
  "site/preview_floor_plan/pdf-recognition-gate.mjs",
  "src/stitch_laibe_landing_onboarding/client_awarding_dashboard/app.js",
  "src/stitch_laibe_landing_onboarding/client_awarding_dashboard/owner-workspace-bootstrap.js",
  "src/stitch_laibe_landing_onboarding/client_awarding_dashboard/styles.css",
  "src/stitch_laibe_landing_onboarding/pcm_standalone/about_drs/styles.css",
  "src/stitch_laibe_landing_onboarding/pcm_standalone/access_unavailable/app.js",
  "src/stitch_laibe_landing_onboarding/pcm_standalone/access_unavailable/styles.css",
  "src/stitch_laibe_landing_onboarding/pcm_standalone/account_access/app.js",
  "src/stitch_laibe_landing_onboarding/pcm_standalone/account_access/styles.css",
  "src/stitch_laibe_landing_onboarding/pcm_standalone/contract_prerequisites/app.js",
  "src/stitch_laibe_landing_onboarding/pcm_standalone/contract_prerequisites/styles.css",
  "src/stitch_laibe_landing_onboarding/pcm_standalone/contract_signing/app.js",
  "src/stitch_laibe_landing_onboarding/pcm_standalone/contract_signing/styles.css",
  "src/stitch_laibe_landing_onboarding/pcm_standalone/integrations/a14-line-contract.js",
  "src/stitch_laibe_landing_onboarding/pcm_standalone/integrations/a5-core-contract.js",
  "src/stitch_laibe_landing_onboarding/pcm_standalone/public/pcm-flow-route-manifest.js",
  "src/stitch_laibe_landing_onboarding/pcm_standalone/public/public-contract.js",
  "src/stitch_laibe_landing_onboarding/pcm_standalone/public_home/app.js",
  "src/stitch_laibe_landing_onboarding/pcm_standalone/public_home/assets/d_rs_03_compact_434343.svg",
  "src/stitch_laibe_landing_onboarding/pcm_standalone/public_home/styles.css",
  "src/stitch_laibe_landing_onboarding/pcm_standalone/quote_check/app.js",
  "src/stitch_laibe_landing_onboarding/pcm_standalone/quote_check/styles.css",
  "src/stitch_laibe_landing_onboarding/pcm_standalone/drawing_check/app.js",
  "src/stitch_laibe_landing_onboarding/pcm_standalone/drawing_check/styles.css",
  "src/stitch_laibe_landing_onboarding/pcm_standalone/service_contract/app.js",
  "src/stitch_laibe_landing_onboarding/pcm_standalone/service_contract/contract-content.js",
  "src/stitch_laibe_landing_onboarding/pcm_standalone/service_contract/styles.css",
  "src/stitch_laibe_landing_onboarding/pcm_standalone/shared/drs-brand.css",
  "src/stitch_laibe_landing_onboarding/pcm_standalone/shared/owner-first-shell.css",
  "src/stitch_laibe_landing_onboarding/pcm_standalone/shared/owner-first-tokens.css",
  "src/stitch_laibe_landing_onboarding/pcm_standalone/vendor_workspace/app.js",
  "src/stitch_laibe_landing_onboarding/pcm_standalone/vendor_workspace/styles.css",
]);

const DECLARED_LOCAL_RUNTIME_DEPENDENCIES = Object.freeze([
  Object.freeze({
    source: "src/lib/budget/quote-healthcheck/browser-adapter.js",
    reference: "../../../../site/preview_floor_plan/vendor/pdfjs/pdf.mjs",
  }),
  Object.freeze({
    source: "site/preview_floor_plan/vendor/pdfjs/pdf.mjs",
    reference: "./pdf.worker.mjs",
  }),
  Object.freeze({
    source: "src/stitch_laibe_landing_onboarding/pcm_standalone/drawing_check/app.js",
    reference: "../../../../site/preview_floor_plan/browser-recognition-adapter.mjs",
  }),
  Object.freeze({
    source: "site/preview_floor_plan/browser-recognition-adapter.mjs",
    reference: "./vendor/pdfjs/pdf.worker.mjs",
  }),
  Object.freeze({
    source: "site/preview_floor_plan/browser-recognition-adapter.mjs",
    reference: "./pdf-plan-selected-source-presentation.mjs",
  }),
  Object.freeze({
    source: "site/preview_floor_plan/pdf-recognition-gate.mjs",
    reference: "./pdf-dimension-scale-decision.mjs",
  }),
]);

const deployNodes = PCM_FLOW_ROUTE_MANIFEST.nodes.filter(
  ({ publicPath, lifecycle }) => publicPath && ["active", "planned"].includes(lifecycle),
);
const activeNodes = deployNodes.filter(({ lifecycle }) => lifecycle === "active");
const sourceToPublicPath = new Map(
  activeNodes
    .filter(({ id }) => SOURCE_ENTRY_BY_ID[id])
    .map(({ id, publicPath }) => [SOURCE_ENTRY_BY_ID[id], publicPath]),
);
const publicRouteByLiteral = new Map();
function registerPublicRouteLiteral(reference, publicRoute) {
  if (!reference) return;
  const existing = publicRouteByLiteral.get(reference);
  if (existing && existing !== publicRoute) {
    throw new Error(`Conflicting public routes for ${JSON.stringify(reference)}`);
  }
  publicRouteByLiteral.set(reference, publicRoute);
}
for (const node of activeNodes) {
  registerPublicRouteLiteral(node.href, `${node.publicPath}${suffixOf(node.href)}`);
}
for (const link of PCM_FLOW_ROUTE_MANIFEST.canonicalLinks) {
  registerPublicRouteLiteral(link.relativeHref, link.canonicalHttpUrl);
}
const allowlistedAssets = new Set(ASSET_ALLOWLIST);
const explicitNavigationFallbacks = new Set([
  "site/standard_contract_editor/code.html",
  "src/stitch_laibe_landing_onboarding/pcm_standalone/basic_report/code.html",
  "src/stitch_laibe_landing_onboarding/pcm_standalone/case_summary/code.html",
  "src/stitch_laibe_landing_onboarding/pcm_standalone/document_corrections/code.html",
  "src/stitch_laibe_landing_onboarding/pcm_standalone/owner_start/code.html",
  "src/stitch_laibe_landing_onboarding/pcm_standalone/self_service_archive/code.html",
]);
const missingHeroAsset = "src/stitch_laibe_landing_onboarding/pcm_standalone/public_home/assets/d_rs_03_compact_d0e0e3.png";
const heroAssetFallback = "src/stitch_laibe_landing_onboarding/pcm_standalone/public_home/assets/d_rs_03_compact_434343.svg";

function resolveRepositoryReference(fromRelative, reference) {
  const pathname = reference.split(/[?#]/u, 1)[0];
  return path.posix.normalize(path.posix.join(path.posix.dirname(fromRelative), pathname));
}

function suffixOf(reference) {
  const match = reference.match(/[?#][\s\S]*$/u);
  return match?.[0] ?? "";
}

function cleanRouteForReference(fromRelative, reference) {
  if (!reference.includes("code.html")) return null;
  const literalRoute = publicRouteByLiteral.get(reference);
  if (literalRoute) return literalRoute;
  const resolved = resolveRepositoryReference(fromRelative, reference);
  const publicPath = sourceToPublicPath.get(resolved);
  if (publicPath) return `${publicPath}${suffixOf(reference)}`;
  if (explicitNavigationFallbacks.has(resolved)) {
    return `/pcm/access-unavailable${suffixOf(reference)}`;
  }
  return null;
}

function replaceManifestProperty(source, property, before, after) {
  const needle = `${property}: ${JSON.stringify(before)}`;
  if (!source.includes(needle)) {
    throw new Error(`Manifest ${property} value is missing: ${JSON.stringify(before)}`);
  }
  return source.replaceAll(needle, `${property}: ${JSON.stringify(after)}`);
}

function transformManifestRoutes(source) {
  let transformed = source;
  for (const node of activeNodes) {
    transformed = replaceManifestProperty(
      transformed,
      "href",
      node.href,
      `${node.publicPath}${suffixOf(node.href)}`,
    );
  }

  const canonicalByRelativeHref = new Map();
  for (const link of PCM_FLOW_ROUTE_MANIFEST.canonicalLinks) {
    if (!link.relativeHref) continue;
    const existing = canonicalByRelativeHref.get(link.relativeHref);
    if (existing && existing !== link.canonicalHttpUrl) {
      throw new Error(`Conflicting canonical routes for ${JSON.stringify(link.relativeHref)}`);
    }
    canonicalByRelativeHref.set(link.relativeHref, link.canonicalHttpUrl);
  }
  for (const [relativeHref, canonicalHttpUrl] of canonicalByRelativeHref) {
    transformed = replaceManifestProperty(
      transformed,
      "relativeHref",
      relativeHref,
      canonicalHttpUrl,
    );
  }
  return transformed;
}

function rewriteJavaScript(source, sourceRelative) {
  const localModulePatterns = [
    /\b(?:import|export)\s+(?:[^"'`]*?\s+from\s+)?(["'])(?<reference>\.{1,2}\/[^"'`\s]+)\1/gu,
    /\bimport\s*\(\s*(["'])(?<reference>\.{1,2}\/[^"'`\s]+)\1\s*\)/gu,
  ];
  for (const pattern of localModulePatterns) {
    for (const match of source.matchAll(pattern)) {
      const { reference } = match.groups;
      const resolved = resolveRepositoryReference(sourceRelative, reference);
      if (!allowlistedAssets.has(resolved)) {
        throw new Error(
          `Unknown local JavaScript module dependency ${JSON.stringify(reference)} referenced by ${JSON.stringify(sourceRelative)}`,
        );
      }
    }
  }
  return source.replace(
    /((?:\.\.?\/)+[A-Za-z0-9_./-]*code\.html(?:[?#][^"'`\s]*)?)/gu,
    (reference) => {
      const cleanRoute = cleanRouteForReference(sourceRelative, reference);
      if (cleanRoute) return cleanRoute;
      throw new Error(
        `Unknown local JavaScript navigation dependency ${JSON.stringify(reference)} referenced by ${JSON.stringify(sourceRelative)}`,
      );
    },
  );
}

function transformAsset(source, sourceRelative) {
  if (/\.m?js$/iu.test(sourceRelative)) {
    const javascript = sourceRelative === manifestRelative
      ? transformManifestRoutes(source.toString("utf8"))
      : source.toString("utf8");
    return Buffer.from(rewriteJavaScript(javascript, sourceRelative));
  }
  return source;
}

const transformedAssets = new Map();
for (const relative of ASSET_ALLOWLIST) {
  const source = await readFile(path.join(repositoryRoot, relative));
  transformedAssets.set(relative, transformAsset(source, relative));
}
for (const { source, reference } of DECLARED_LOCAL_RUNTIME_DEPENDENCIES) {
  const sourceBytes = transformedAssets.get(source);
  if (!sourceBytes) {
    throw new Error(`Declared runtime dependency source is not allowlisted: ${JSON.stringify(source)}`);
  }
  if (!sourceBytes.toString("utf8").includes(reference)) {
    throw new Error(
      `Declared runtime dependency ${JSON.stringify(reference)} is missing from ${JSON.stringify(source)}`,
    );
  }
  const resolved = resolveRepositoryReference(source, reference);
  if (!transformedAssets.has(resolved)) {
    throw new Error(
      `Declared runtime dependency is not allowlisted: ${JSON.stringify(resolved)} referenced by ${JSON.stringify(source)}`,
    );
  }
}

const contentHash = createHash("sha256");
for (const relative of [...transformedAssets.keys()].sort()) {
  contentHash.update(relative);
  contentHash.update("\0");
  contentHash.update(transformedAssets.get(relative));
  contentHash.update("\0");
}
const assetHash = contentHash.digest("hex");
const assetPublicRoot = `/assets/${assetHash}`;

function assetUrl(relative, suffix = "") {
  return `${assetPublicRoot}/${relative}${suffix}`;
}

function rewriteHtmlReference(sourceRelative, attribute, reference) {
  if (
    reference.startsWith("#") ||
    reference.startsWith("data:") ||
    reference.startsWith("blob:") ||
    reference.startsWith("mailto:") ||
    reference.startsWith("tel:") ||
    /^(?:https?:)?\/\//iu.test(reference)
  ) return reference;

  const cleanRoute = cleanRouteForReference(sourceRelative, reference);
  if (cleanRoute) return cleanRoute;

  let resolved = resolveRepositoryReference(sourceRelative, reference);
  if (resolved === missingHeroAsset) resolved = heroAssetFallback;
  if (allowlistedAssets.has(resolved)) return assetUrl(resolved, suffixOf(reference));
  throw new Error(
    `Unknown local ${attribute} dependency ${JSON.stringify(reference)} referenced by ${JSON.stringify(sourceRelative)}`,
  );
}

function transformEntryHtml(source, sourceRelative) {
  return source
    .replace(
      /<(?:[^>"']|"[^"]*"|'[^']*')*>/gu,
      (tag) => tag.replace(
        /(["'])[^]*?\1|(\s)(href|src)(\s*=\s*)(?:"([^"]+)"|'([^']+)')/giu,
        (match, _otherQuote, prefix, attribute, assignment, doubleQuotedReference, singleQuotedReference) => {
          if (!attribute) return match;
          const quote = doubleQuotedReference === undefined ? "'" : '"';
          const reference = doubleQuotedReference ?? singleQuotedReference;
          return `${prefix}${attribute}${assignment}${quote}${rewriteHtmlReference(sourceRelative, attribute.toLowerCase(), reference)}${quote}`;
        },
      ),
    )
    .replace(/<html\b([^>]*?)\blang="[^"]+"/iu, "<html$1lang=\"zh-Hant\"");
}

function escapeHtml(value) {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}

function unavailableEntry(node, message) {
  return `<!doctype html>
<html lang="zh-Hant">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(node.label)}｜LaiBE DRS</title>
  <style>body{margin:0;background:#101a24;color:#f4f7fa;font-family:system-ui,sans-serif}main{max-width:42rem;margin:12vh auto;padding:2rem}p{color:#c7d2dc;line-height:1.75}a{display:inline-block;margin-top:1rem;padding:.8rem 1rem;border-radius:.5rem;background:#f28a42;color:#15191d;text-decoration:none;font-weight:700}</style>
</head>
<body><main><p>目前狀態</p><h1>${escapeHtml(node.label)}</h1><p>${escapeHtml(message)}</p><p>下一步由萊比團隊完成正式功能與權限確認；目前不會建立、修改或顯示任何案件資料。</p><a href="/pcm">返回 DRS 首頁</a></main></body>
</html>
`;
}

function normalizePublicOrigin() {
  const configured = process.env.DRS_PUBLIC_ORIGIN?.trim();
  if (!configured) return "";
  const parsed = new URL(configured);
  if (
    parsed.protocol !== "https:" ||
    parsed.username ||
    parsed.password ||
    parsed.pathname !== "/" ||
    parsed.search ||
    parsed.hash
  ) {
    throw new Error("DRS_PUBLIC_ORIGIN must be an HTTPS origin with only the root path and no credentials, query, or fragment");
  }
  return parsed.origin;
}

function sitemapXml(publicOrigin) {
  const locations = deployNodes.map(({ publicPath }) => `${publicOrigin}${publicPath}`);
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${locations.map((location) => `  <url><loc>${escapeHtml(location)}</loc></url>`).join("\n")}
</urlset>
`;
}

const relativeDist = path.relative(distParent, distRoot);
if (relativeDist !== "drs" || distRoot === distParent || relativeDist.startsWith("..")) {
  throw new Error(`Refusing to clear unexpected output path: ${distRoot}`);
}

const dependencyProbe = process.env.DRS_BUILD_DEPENDENCY_PROBE?.trim();
if (dependencyProbe) {
  const probePath = path.resolve(repositoryRoot, dependencyProbe);
  const probeRelative = path.relative(repositoryRoot, probePath).replaceAll(path.sep, "/");
  if (!probeRelative || probeRelative.startsWith("../") || path.isAbsolute(probeRelative)) {
    throw new Error("DRS_BUILD_DEPENDENCY_PROBE must stay inside the repository worktree");
  }
  const probeSource = await readFile(probePath, "utf8");
  if (/\.m?js$/iu.test(probeRelative)) {
    rewriteJavaScript(probeSource, probeRelative);
  } else {
    transformEntryHtml(probeSource, probeRelative);
  }
}

const transformedEntries = [];
for (const node of deployNodes) {
  let html;
  if (node.lifecycle === "planned" || !SOURCE_ENTRY_BY_ID[node.id]) {
    html = unavailableEntry(node, "此功能正在整理中，正式開放後會提供完整操作入口。");
  } else {
    const sourceRelative = SOURCE_ENTRY_BY_ID[node.id];
    html = transformEntryHtml(await readFile(path.join(repositoryRoot, sourceRelative), "utf8"), sourceRelative);
  }
  transformedEntries.push({ publicPath: node.publicPath, html });
}
const publicOrigin = normalizePublicOrigin();

const headers = `/*
  Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; connect-src 'self' https://PROJECT_REF.supabase.co https://calendar.google.com; frame-src https://calendar.google.com; worker-src 'self' blob:; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'
  Strict-Transport-Security: max-age=31536000; includeSubDomains
  X-Content-Type-Options: nosniff
  Referrer-Policy: strict-origin-when-cross-origin
  Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=()
`;
const redirects = deployNodes
  .map(({ publicPath }) => `${publicPath}/ ${publicPath} 301`)
  .join("\n") + "\n";
const notFound = `<!doctype html>
<html lang="zh-Hant"><head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1" /><title>找不到頁面｜LaiBE DRS</title><style>body{margin:0;background:#101a24;color:#f4f7fa;font-family:system-ui,sans-serif}main{max-width:40rem;margin:15vh auto;padding:2rem}p{color:#c7d2dc;line-height:1.7}a{color:#ff9b54}</style></head><body><main><p>404</p><h1>這個頁面不存在</h1><p>網址可能已更新，或這個入口尚未正式開放。你可以安全返回 DRS 首頁。</p><a href="/pcm">返回 DRS 首頁</a></main></body></html>
`;
const robots = `User-agent: *\nAllow: /\n${publicOrigin ? `Sitemap: ${publicOrigin}/sitemap.xml\n` : ""}`;

const materializationPlan = [];
const materializationDestinations = new Set();
function addMaterializationFile(relative, content, writeFault = "") {
  const normalized = path.posix.normalize(relative);
  if (
    !relative ||
    normalized !== relative ||
    normalized === "." ||
    normalized.startsWith("../") ||
    path.posix.isAbsolute(normalized)
  ) {
    throw new Error(`Unsafe production artifact destination: ${JSON.stringify(relative)}`);
  }
  const destinationKey = normalized.toLocaleLowerCase("en-US");
  if (materializationDestinations.has(destinationKey)) {
    throw new Error(`Duplicate production artifact destination: ${JSON.stringify(normalized)}`);
  }
  materializationDestinations.add(destinationKey);
  materializationPlan.push({
    relative: normalized,
    content: Buffer.isBuffer(content) ? content : Buffer.from(content),
    writeFault,
  });
}
const assetEntries = [...transformedAssets];
for (let index = 0; index < assetEntries.length; index += 1) {
  const [relative, content] = assetEntries[index];
  const writeFault = index === Math.floor(assetEntries.length / 2) ? "stage-write-asset" : "";
  addMaterializationFile(`assets/${assetHash}/${relative}`, content, writeFault);
}
for (let index = 0; index < transformedEntries.length; index += 1) {
  const { publicPath, html } = transformedEntries[index];
  let writeFault = "";
  if (index === 0) writeFault = "stage-write-route-first";
  if (index === Math.floor(transformedEntries.length / 2)) writeFault = "stage-write-route-middle";
  if (index === transformedEntries.length - 1) writeFault = "stage-write-route-last";
  addMaterializationFile(`${publicPath.slice(1)}/index.html`, html, writeFault);
}
for (const [relative, content, writeFault] of [
  ["_headers", headers, "stage-write-metadata-headers"],
  ["_redirects", redirects, "stage-write-metadata-redirects"],
  ["404.html", notFound, "stage-write-metadata-404"],
  ["robots.txt", robots, "stage-write-metadata-robots"],
  ["sitemap.xml", sitemapXml(publicOrigin), "stage-write-metadata-sitemap"],
]) {
  addMaterializationFile(relative, content, writeFault);
}

function containedDestination(root, relative) {
  const destination = path.resolve(root, ...relative.split("/"));
  const containment = path.relative(root, destination);
  if (!containment || containment.startsWith("..") || path.isAbsolute(containment)) {
    throw new Error(`Production artifact destination escaped its root: ${JSON.stringify(relative)}`);
  }
  return destination;
}

async function listMaterializedFiles(root, current = root) {
  const entries = await readdir(current, { withFileTypes: true });
  const files = [];
  for (const entry of entries.sort((left, right) => left.name.localeCompare(right.name))) {
    const absolute = path.join(current, entry.name);
    if (entry.isDirectory()) {
      files.push(...await listMaterializedFiles(root, absolute));
    } else if (entry.isFile()) {
      files.push(path.relative(root, absolute).replaceAll(path.sep, "/"));
    } else {
      throw new Error(`Unexpected staged artifact type: ${JSON.stringify(entry.name)}`);
    }
  }
  return files;
}

async function verifyMaterializedStage(stageRoot) {
  const expected = materializationPlan
    .map(({ relative }) => relative)
    .sort((left, right) => left.localeCompare(right));
  const actual = (await listMaterializedFiles(stageRoot))
    .sort((left, right) => left.localeCompare(right));
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    const firstMismatch = Array.from(
      { length: Math.max(actual.length, expected.length) },
      (_, index) => index,
    ).find((index) => actual[index] !== expected[index]);
    throw new Error(
      "Staged production artifact file set does not match the validated plan: "
      + `expected=${expected.length}, actual=${actual.length}, firstMismatch=${firstMismatch}, `
      + `expectedPath=${JSON.stringify(expected[firstMismatch])}, `
      + `actualPath=${JSON.stringify(actual[firstMismatch])}`,
    );
  }
  for (const file of materializationPlan) {
    const staged = await readFile(containedDestination(stageRoot, file.relative));
    if (!staged.equals(file.content)) {
      throw new Error(`Staged production artifact bytes differ: ${JSON.stringify(file.relative)}`);
    }
  }
}

const acceptedFaultInjections = new Set([
  "",
  "stage-mkdir",
  "stage-write-asset",
  "stage-write-route-first",
  "stage-write-route-middle",
  "stage-write-route-last",
  "stage-write-metadata-headers",
  "stage-write-metadata-redirects",
  "stage-write-metadata-404",
  "stage-write-metadata-robots",
  "stage-write-metadata-sitemap",
  "stage-verify",
  "stage-verify-missing-planned-file",
  "stage-verify-unexpected-file",
  "stage-verify-mutated-bytes",
  "promotion-current-to-backup",
  "promotion-stage-to-live",
  "promotion-after-stage",
  "promotion-backup-cleanup-partial",
]);
const faultInjection = process.env.DRS_BUILD_FAULT_INJECTION?.trim() ?? "";
if (!acceptedFaultInjections.has(faultInjection)) {
  throw new Error(`Unknown DRS_BUILD_FAULT_INJECTION: ${JSON.stringify(faultInjection)}`);
}
function injectBuildFault(point) {
  if (faultInjection === point) {
    throw new Error(`Injected DRS build failure at ${point}`);
  }
}

await mkdir(distParent, { recursive: true });
const swapIdentity = `${process.pid}-${randomUUID()}`;
const stageRoot = path.join(distParent, `.drs-stage-${swapIdentity}`);
const backupRoot = path.join(distParent, `.drs-backup-${swapIdentity}`);
for (const [root, prefix] of [
  [stageRoot, ".drs-stage-"],
  [backupRoot, ".drs-backup-"],
]) {
  const sibling = path.relative(distParent, root);
  if (path.dirname(sibling) !== "." || !path.basename(sibling).startsWith(prefix)) {
    throw new Error(`Unsafe production swap path: ${root}`);
  }
}

let stageCreated = false;
let liveBackedUp = false;
let stagePromoted = false;
let promotionCommitted = false;
try {
  injectBuildFault("stage-mkdir");
  await mkdir(stageRoot);
  stageCreated = true;
  for (const file of materializationPlan) {
    if (file.writeFault) injectBuildFault(file.writeFault);
    const destination = containedDestination(stageRoot, file.relative);
    await mkdir(path.dirname(destination), { recursive: true });
    await writeFile(destination, file.content);
  }
  injectBuildFault("stage-verify");
  if (faultInjection === "stage-verify-missing-planned-file") {
    await rm(containedDestination(stageRoot, "pcm/case/setup/index.html"));
  }
  if (faultInjection === "stage-verify-unexpected-file") {
    await writeFile(containedDestination(stageRoot, "unexpected-stage-file.txt"), "unexpected staged file");
  }
  if (faultInjection === "stage-verify-mutated-bytes") {
    await writeFile(containedDestination(stageRoot, "_headers"), "mutated staged bytes");
  }
  await verifyMaterializedStage(stageRoot);
  injectBuildFault("promotion-current-to-backup");
  try {
    await rename(distRoot, backupRoot);
    liveBackedUp = true;
  } catch (error) {
    if (error?.code !== "ENOENT") throw error;
  }
  injectBuildFault("promotion-stage-to-live");
  await rename(stageRoot, distRoot);
  stageCreated = false;
  stagePromoted = true;
  await verifyMaterializedStage(distRoot);
  injectBuildFault("promotion-after-stage");
  promotionCommitted = true;
  if (liveBackedUp) {
    if (faultInjection === "promotion-backup-cleanup-partial") {
      await rm(path.join(backupRoot, "_headers"));
      throw new Error("Injected DRS build failure during partial backup cleanup");
    }
    await rm(backupRoot, { recursive: true });
    liveBackedUp = false;
  }
} catch (buildError) {
  if (promotionCommitted) {
    const cleanupDebtPath = backupRoot.replaceAll(path.sep, "/");
    throw new Error(
      `DRS_BUILD_CLEANUP_DEBT: live output committed and verified; backup cleanup incomplete: ${cleanupDebtPath}`,
      { cause: buildError },
    );
  }
  const rollbackErrors = [];
  if (stagePromoted) {
    try {
      await rm(distRoot, { recursive: true });
      stagePromoted = false;
    } catch (error) {
      rollbackErrors.push(error);
    }
  }
  if (liveBackedUp) {
    try {
      await rename(backupRoot, distRoot);
      liveBackedUp = false;
    } catch (error) {
      rollbackErrors.push(error);
    }
  }
  if (stageCreated) {
    try {
      await rm(stageRoot, { recursive: true });
      stageCreated = false;
    } catch (error) {
      rollbackErrors.push(error);
    }
  }
  if (rollbackErrors.length > 0) {
    throw new AggregateError([buildError, ...rollbackErrors], "DRS build failed and rollback was incomplete");
  }
  throw buildError;
} finally {
  if (stageCreated) await rm(stageRoot, { recursive: true, force: true });
}

console.log(`Built ${deployNodes.length} DRS routes with ${transformedAssets.size} allowlisted assets at ${assetPublicRoot}`);
