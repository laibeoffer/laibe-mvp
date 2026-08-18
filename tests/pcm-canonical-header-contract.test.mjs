import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

const repositoryRoot = new URL("../", import.meta.url);
const stitchRoot = new URL(
  "src/stitch_laibe_landing_onboarding/",
  repositoryRoot,
);
const pcmRoot = new URL("pcm_standalone/", stitchRoot);
const routeManifestUrl = new URL("public/pcm-flow-route-manifest.js", pcmRoot);

const pages = Object.freeze([
  Object.freeze({
    id: "home",
    label: "Public Home",
    html: "pcm_standalone/public_home/code.html",
    css: "pcm_standalone/public_home/styles.css",
    cssHeader: ".site-header",
    brandRouteId: null,
    dynamicBrandMarker: null,
  }),
  Object.freeze({
    id: "quoteCheck",
    label: "Quote Check",
    html: "pcm_standalone/quote_check/code.html",
    css: "pcm_standalone/quote_check/styles.css",
    cssHeader: ".quote-header",
    brandRouteId: "quoteCheckBrandToHome",
    dynamicBrandMarker: null,
  }),
  Object.freeze({
    id: "accountAccess",
    label: "Account Access",
    html: "pcm_standalone/account_access/code.html",
    css: "pcm_standalone/account_access/styles.css",
    cssHeader: ".site-header",
    brandRouteId: "accountAccessBrandToHome",
    dynamicBrandMarker: null,
  }),
  Object.freeze({
    id: "aboutDrs",
    label: "About DRS",
    html: "pcm_standalone/about_drs/code.html",
    css: "pcm_standalone/about_drs/styles.css",
    cssHeader: ".about-header",
    brandRouteId: "aboutDrsBrandToHome",
    dynamicBrandMarker: null,
  }),
  Object.freeze({
    id: "serviceContract",
    label: "Service Contract",
    html: "pcm_standalone/service_contract/code.html",
    css: "pcm_standalone/service_contract/styles.css",
    cssHeader: ".site-header",
    brandRouteId: "serviceContractBrandToHome",
    dynamicBrandMarker: "data-service-brand-link",
  }),
  Object.freeze({
    id: "ownerWorkspace",
    label: "Owner Workspace",
    html: "client_awarding_dashboard/code.html",
    css: "client_awarding_dashboard/styles.css",
    cssHeader: ".workspace-header",
    brandRouteId: "ownerWorkspaceBrandToHome",
    dynamicBrandMarker: "data-owner-brand-link",
  }),
  Object.freeze({
    id: "vendorWorkspace",
    label: "Vendor Workspace",
    html: "pcm_standalone/vendor_workspace/code.html",
    css: "pcm_standalone/vendor_workspace/styles.css",
    cssHeader: ".vendor-header",
    brandRouteId: "vendorWorkspaceBrandToHome",
    dynamicBrandMarker: null,
  }),
]);

function readStitchFile(relativePath) {
  return readFile(new URL(relativePath, stitchRoot), "utf8");
}

function topHeader(source, label) {
  const header = source.match(/<header\b[^>]*\bid="top"[^>]*>[\s\S]*?<\/header>/iu)?.[0];
  assert.ok(header, `${label} top header`);
  return header;
}

function attribute(openingTag, name) {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = openingTag.match(new RegExp(`\\s${escaped}(?:="([^"]*)")?(?=\\s|>|/)`, "iu"));
  return match ? (match[1] ?? "") : null;
}

function headerAnchors(header) {
  return [...header.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/giu)].map(
    ([source, attributes, content]) => ({
      source,
      openingTag: `<a${attributes}>`,
      content,
      label: content
        .replace(/<[^>]+>/gu, " ")
        .replace(/&amp;/gu, "&")
        .replace(/\s+/gu, " ")
        .trim(),
    }),
  );
}

function headerNavigation(header, label) {
  const navigation = header.match(/<nav\b[^>]*>[\s\S]*?<\/nav>/iu)?.[0];
  assert.ok(navigation, `${label} navigation`);
  return navigation;
}

function brandAnchor(header, label) {
  const matches = headerAnchors(header).filter(
    ({ openingTag }) => attribute(openingTag, "aria-label") === "LaiBE DRS 首頁",
  );
  assert.equal(matches.length, 1, `${label} brand count`);
  return matches[0];
}

function byIdExactlyOnce(manifest, routeId) {
  const matches = manifest.canonicalLinks.filter(({ id }) => id === routeId);
  assert.equal(matches.length, 1, `${routeId} unique`);
  return matches[0];
}

test("seven product headers share one LaiBE DRS brand identity and canonical home target", async () => {
  const { PCM_FLOW_ROUTE_MANIFEST, getActiveCanonicalLinkHref } = await import(
    `${routeManifestUrl.href}?cross-page-brand=${Date.now()}`
  );
  const sharedBrandCss = await readStitchFile("pcm_standalone/shared/drs-brand.css");

  assert.equal(PCM_FLOW_ROUTE_MANIFEST.version, "1.9.1");
  assert.match(sharedBrandCss, /\.drs-brand-lockup/u);
  assert.match(sharedBrandCss, /\.drs-brand-wordmark/u);
  assert.match(sharedBrandCss, /\.drs-brand-name/u);

  for (const page of pages) {
    const [html, css] = await Promise.all([
      readStitchFile(page.html),
      readStitchFile(page.css),
    ]);
    const header = topHeader(html, page.label);
    const brand = brandAnchor(header, page.label);

    assert.match(brand.content, /assets\/logo\/laibe_offer\.svg/u, `${page.label} logo`);
    assert.match(brand.content, /aria-label="Decision &amp; Record System"/u, `${page.label} English identity`);
    assert.match(brand.content, />裝潢決策系統<\/small>/u, `${page.label} Chinese identity`);
    assert.match(html, /shared\/drs-brand\.css/u, `${page.label} shared brand CSS`);
    assert.ok(css.includes(page.cssHeader), `${page.label} header CSS source`);

    const href = attribute(brand.openingTag, "href");
    if (page.id === "home") {
      assert.equal(href, "#top");
      continue;
    }

    const route = byIdExactlyOnce(PCM_FLOW_ROUTE_MANIFEST, page.brandRouteId);
    assert.equal(route.fromPage, page.id, page.label);
    assert.equal(route.toPage, "home", page.label);
    assert.equal(route.trigger, "LaiBE DRS 品牌標誌", page.label);
    assert.equal(route.targetAnchor, "#top", page.label);
    assert.equal(route.routeState, "active", page.label);
    assert.equal(getActiveCanonicalLinkHref(page.brandRouteId), route.relativeHref, page.label);
    await access(new URL(route.relativeHref.split(/[?#]/u, 1)[0], routeManifestUrl));

    if (page.dynamicBrandMarker) {
      assert.equal(attribute(brand.openingTag, page.dynamicBrandMarker), "", page.label);
      assert.equal(href, null, `${page.label} is runtime-bound, not missing`);
    } else {
      assert.equal(href, route.relativeHref, page.label);
      assert.notEqual(href, "#top", `${page.label} must not self-link`);
    }
  }
});

test("page and role context stays explicit while header routes match the real manifest", async () => {
  const { PCM_FLOW_ROUTE_MANIFEST, getActiveCanonicalLinkHref } = await import(
    `${routeManifestUrl.href}?cross-page-context=${Date.now()}`
  );
  const htmlById = new Map(
    await Promise.all(pages.map(async (page) => [page.id, await readStitchFile(page.html)])),
  );
  const headerById = new Map(
    pages.map((page) => [page.id, topHeader(htmlById.get(page.id), page.label)]),
  );
  const homeLinks = headerAnchors(headerNavigation(headerById.get("home"), "Public Home"));
  const homeRouteIds = homeLinks
    .map(({ openingTag }) => attribute(openingTag, "data-route"))
    .filter(Boolean);

  assert.deepEqual(homeLinks.map(({ label }) => label), [
    "文件健檢",
    "登入／進入工作台",
    "關於 DRS",
    "DRS 契約管理",
  ]);
  assert.deepEqual(homeRouteIds, [
    "quoteCheck",
    "accountAccess",
    "homeHeaderServiceContractToOwnerContractManagement",
  ]);
  assert.deepEqual(homeRouteIds, [...new Set(homeRouteIds)], "Public Home header route IDs are unique");
  assert.doesNotMatch(headerById.get("home"), /href="[^"]*service_contract/iu);
  assert.doesNotMatch(headerById.get("home"), />\s*PCM 服務契約\s*</iu);

  const aboutHeaderLink = byIdExactlyOnce(PCM_FLOW_ROUTE_MANIFEST, "homeHeaderAboutDrsToAboutDrs");
  assert.equal(aboutHeaderLink.trigger, "關於 DRS");
  assert.equal(aboutHeaderLink.relativeHref, "../about_drs/code.html");
  assert.equal(homeLinks[2].label, aboutHeaderLink.trigger);
  assert.equal(attribute(homeLinks[2].openingTag, "href"), aboutHeaderLink.relativeHref);
  await access(new URL(aboutHeaderLink.relativeHref, routeManifestUrl));

  const homeContract = byIdExactlyOnce(
    PCM_FLOW_ROUTE_MANIFEST,
    "homeHeaderServiceContractToOwnerContractManagement",
  );
  const ownerContractAccessHref = "../account_access/code.html?intent=owner-contract-management";
  assert.equal(homeContract.trigger, homeLinks[3].label);
  assert.equal(attribute(homeLinks[3].openingTag, "data-route"), homeContract.id);
  assert.equal(attribute(homeLinks[3].openingTag, "href"), ownerContractAccessHref);
  assert.equal(homeContract.toPage, "accountAccess");
  assert.equal(homeContract.relativeHref, ownerContractAccessHref);
  assert.doesNotMatch(homeContract.relativeHref, /client_awarding_dashboard|owner-dashboard-panel-contract/u);
  assert.equal(getActiveCanonicalLinkHref(homeContract.id), homeContract.relativeHref);

  assert.match(headerById.get("quoteCheck"), /aria-current="page"[^>]*>文件健檢<\/a>/u);
  assert.match(headerById.get("accountAccess"), /href="\.\.\/quote_check\/code\.html\?mode=quote#document-workspace">開始文件健檢<\/a>/u);
  assert.match(headerById.get("aboutDrs"), /aria-current="page">關於 DRS<\/span>/u);
  assert.match(headerById.get("serviceContract"), /data-service-header-return[^>]*>返回 DRS 首頁<\/a>/u);
  assert.match(headerById.get("ownerWorkspace"), /工作台角色[\s\S]*?>甲方<[\s\S]*?>案件<[\s\S]*?>服務契約</u);
  assert.match(headerById.get("vendorWorkspace"), /目前角色與授權狀態/u);
  assert.match(headerById.get("vendorWorkspace"), /受邀乙方｜設計師／統包/u);
  assert.match(headerById.get("vendorWorkspace"), /身分與案件範圍尚待確認/u);

  const invitation = PCM_FLOW_ROUTE_MANIFEST.nodes.find(({ id }) => id === "vendorInvitation");
  assert.equal(invitation?.lifecycle, "planned");
  assert.equal(invitation?.href, null);
  assert.doesNotMatch(htmlById.get("vendorWorkspace"), /vendor_invitation/iu);
});

test("runtime-bound headers use approved selectors and keep service and project contracts separate", async () => {
  const [publicApp, serviceApp, ownerApp, ownerBootstrap, vendorApp, serviceHtml, ownerHtml, vendorHtml] = await Promise.all([
    readStitchFile("pcm_standalone/public_home/app.js"),
    readStitchFile("pcm_standalone/service_contract/app.js"),
    readStitchFile("client_awarding_dashboard/app.js"),
    readStitchFile("client_awarding_dashboard/owner-workspace-bootstrap.js"),
    readStitchFile("pcm_standalone/vendor_workspace/app.js"),
    readStitchFile("pcm_standalone/service_contract/code.html"),
    readStitchFile("client_awarding_dashboard/code.html"),
    readStitchFile("pcm_standalone/vendor_workspace/code.html"),
  ]);

  assert.match(publicApp, /case "homeHeaderServiceContractToOwnerContractManagement":/u);
  assert.match(publicApp, /querySelectorAll\("\[data-route\]"\)/u);

  assert.match(serviceHtml, /<a class="brand" data-service-brand-link aria-label="LaiBE DRS 首頁">/u);
  assert.match(serviceHtml, /data-service-header-return>返回 DRS 首頁<\/a>/u);
  assert.doesNotMatch(serviceHtml, /data-service-(?:brand-link|header-return)[^>]*\shref=/u);
  for (const routeId of [
    "serviceContractBrandToHome",
    "serviceContractHeaderHomeToHome",
    "serviceContractTrustedOwnerReturnToOwnerContractManagement",
  ]) {
    assert.match(serviceApp, new RegExp(`getCanonicalHref\\(\\s*"${routeId}"`, "u"), routeId);
  }

  assert.match(ownerHtml, /<a\s+class="brand"\s+data-owner-brand-link\s+aria-label="LaiBE DRS 首頁"/u);
  assert.doesNotMatch(ownerHtml, /data-owner-brand-link[^>]*\shref=/u);
  assert.match(ownerApp, /selector: "\[data-owner-brand-link\]",\s*routeId: "ownerWorkspaceBrandToHome"/u);
  assert.match(ownerBootstrap, /bindOwnerWorkspaceCanonicalLinks\(root, getActiveCanonicalLinkHref\)/u);

  assert.match(vendorHtml, /data-canonical-link="vendorWorkspaceAccessRecoveryToAccountAccess"/u);
  assert.match(vendorApp, /"vendorWorkspaceAccessRecoveryToAccountAccess"/u);
  assert.doesNotMatch(vendorApp, /["']vendor_invitation["']/iu);

  assert.match(ownerHtml, /class="contract-kind-card contract-kind-card--project"[\s\S]*?本案甲乙契約/u);
  assert.match(ownerHtml, /data-shared-contract-preview\s+href="\.\.\/\.\.\/\.\.\/site\/standard_contract_editor\/code\.html\?contractType=DESIGN_BUILD&amp;returnTo=owner"/u);
  assert.match(ownerHtml, /data-owner-service-contract-link[\s\S]*?>了解並確認 DRS 服務契約<\/a>/u);
  assert.doesNotMatch(
    ownerHtml,
    /data-owner-service-contract-link[^>]*standard_contract_editor/iu,
  );
});
