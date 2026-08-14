import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

const pageRoot = new URL(
  "../src/stitch_laibe_landing_onboarding/pcm_standalone/public_home/",
  import.meta.url,
);
const htmlUrl = new URL("code.html", pageRoot);
const cssUrl = new URL("styles.css", pageRoot);
const appUrl = new URL("app.js", pageRoot);
const heroDrsMarkUrl = new URL("assets/d_rs_03_compact_d0e0e3.svg", pageRoot);
const governanceUrl = new URL(
  "../docs/governance/pcm-owner-first-execution-manifest.v1.json",
  import.meta.url,
);
const planUrl = new URL(
  "../docs/superpowers/plans/2026-08-03-laibe-pcm-end-to-end-flow-integration.md",
  import.meta.url,
);

class RouteTestElement {
  constructor(route) {
    this.dataset = { route };
    this.attributes = new Map([["data-route", route]]);
  }

  setAttribute(name, value) {
    const stringValue = String(value);
    this.attributes.set(name, stringValue);
    if (name === "data-route-state") this.dataset.routeState = stringValue;
  }

  removeAttribute(name) {
    this.attributes.delete(name);
    if (name === "data-route-state") delete this.dataset.routeState;
  }

  getAttribute(name) {
    return this.attributes.get(name) ?? null;
  }
}

Object.defineProperty(globalThis, "Element", {
  configurable: true,
  value: RouteTestElement,
});

function makeRouteControl(route) {
  return new RouteTestElement(route);
}

function assertRouteClosed(control) {
  assert.equal(control.getAttribute("href"), null);
  assert.equal(control.getAttribute("aria-disabled"), "true");
  assert.equal(control.getAttribute("tabindex"), "-1");
  assert.equal(control.dataset.routeState, "planned");
}

function readSection(markup, id) {
  const idPosition = markup.indexOf(`id="${id}"`);
  const start = markup.lastIndexOf("<section", idPosition);
  const end = markup.indexOf("</section>", idPosition);
  return start >= 0 && end >= 0 ? markup.slice(start, end + 10) : "";
}

test("homepage follows the full-screen hero then owner decision hierarchy", async () => {
  const html = await readFile(htmlUrl, "utf8");
  const ids = [
    "hero",
    "decision-prompts",
    "pcm-scope",
    "result-example",
    "workspace-preview",
    "case-flow",
    "cooperation-scope",
    "application-check",
    "final-action",
  ];
  const positions = ids.map((id) => html.indexOf(`id="${id}"`));

  assert.ok(positions.every((position) => position >= 0));
  assert.deepEqual(positions, [...positions].sort((a, b) => a - b));
  assert.doesNotMatch(html, /給已取得乙方報價與施工圖的甲方/);
  assert.doesNotMatch(html, /目前可查看申請條件與乙方報價單/);
  assert.doesNotMatch(html, /data-hero-status/);
});

test("unregistered visitors receive an actionable four-stage DRS path immediately after the hero", async () => {
  const [html, css] = await Promise.all([
    readFile(htmlUrl, "utf8"),
    readFile(cssUrl, "utf8"),
  ]);
  const guide = readSection(html, "guest-guidance");
  const stages = [...guide.matchAll(/<li\b[^>]*data-guest-stage="(\d)"[^>]*>[\s\S]*?<strong>([^<]+)<\/strong>/g)];

  assert.ok(html.indexOf('id="guest-guidance"') > html.indexOf('id="hero"'));
  assert.ok(html.indexOf('id="guest-guidance"') < html.indexOf('id="decision-prompts"'));
  assert.match(guide, /LaiBE DRS/);
  assert.match(guide, /目前尚未建立案件/);
  assert.equal(stages.length, 4);
  assert.deepEqual(stages.map((stage) => stage[1]), ["1", "2", "3", "4"]);
  assert.match(guide, /data-guest-stage="1"[^>]*data-stage-state="active"/);
  assert.match(
    guide,
    /data-route="quoteCheck"[\s\S]*?href="\.\.\/quote_check\/code\.html"[\s\S]*?>\s*免費文件健檢\s*<\/a>/,
  );
  assert.match(css, /\.guest-guidance__stages\s*\{[^}]*grid-template-columns:\s*repeat\(4,\s*minmax\(0,\s*1fr\)\)/s);
  assert.match(css, /\.guest-guidance__stage\[data-stage-state="active"\]\s*\{/);
  assert.match(
    css,
    /@media\s*\(max-width:\s*680px\)[\s\S]*?\.guest-guidance__stages\s*\{[^}]*grid-template-columns:\s*1fr;/,
  );
});

test("owner-confirmed application check stays hash-bound after the approved heading refinement", async () => {
  const html = await readFile(htmlUrl, "utf8");
  const hashes = Object.fromEntries(
    ["application-check"].map((id) => [
      id,
      createHash("sha256").update(readSection(html, id)).digest("hex"),
    ]),
  );

  assert.deepEqual(hashes, {
    "application-check": "14a7e0927c59e0b8e80723614f50005676fc7fa41a2e09a730fdd54f7cb100a5",
  });
});

test("homepage hero adds the owner-approved smaller subtitle below the protected title", async () => {
  const [html, css] = await Promise.all([
    readFile(htmlUrl, "utf8"),
    readFile(cssUrl, "utf8"),
  ]);
  const heroCopy = html.match(/<div class="hero__copy">[\s\S]*?<\/div>\s*<div class="entry-choices"/)?.[0] ?? "";
  const heading = heroCopy.match(/<h1\b[^>]*id="hero-title"[\s\S]*?<\/h1>/)?.[0] ?? "";
  const subtitle = heroCopy.match(/<p class="hero-subtitle">[\s\S]*?<\/p>/)?.[0] ?? "";

  assert.match(heading, /在裝潢上，[\s\S]*專業的事讓專業[\s\S]*彼此核對。/);
  assert.match(heading, /重要的決定，由你來做。/);
  assert.doesNotMatch(heading, /hero-subtitle|公共工程|裝潢市場/);
  assert.match(heroCopy, /<\/h1>\s*<p class="hero-subtitle">/);
  assert.match(
    subtitle,
    /<span>在公共工程上，有PCM替政府審查專業流程。<\/span>\s*<span>在裝潢市場上，DRS系統是你做出決策的底氣。<\/span>\s*<span>AI時代的裝修過程，新手上路需要一位副駕駛。<\/span>/,
  );
  assert.equal((subtitle.match(/<span>/g) ?? []).length, 3);
  assert.match(css, /\.hero__copy\s*\{[^}]*position:\s*relative;/s);
  assert.match(
    css,
    /\.hero-subtitle\s*\{[^}]*position:\s*absolute;[^}]*color:\s*#DAAF8B;[^}]*font-size:\s*clamp\(0\.82rem,\s*1\.1vw,\s*1rem\);[^}]*text-wrap:\s*pretty;/s,
  );
  assert.match(css, /\.hero-subtitle\s+span\s*\{[^}]*display:\s*block;/s);
  assert.match(
    css,
    /@media\s*\(max-width:\s*680px\)[\s\S]*?\.hero-subtitle\s*\{[^}]*position:\s*relative;[^}]*font-size:\s*clamp\(0\.9rem,\s*3\.8vw,\s*1rem\);/s,
  );
});

test("homepage hero pairs the approved DRS mark with the pilot subtitle", async () => {
  const [html, css] = await Promise.all([
    readFile(htmlUrl, "utf8"),
    readFile(cssUrl, "utf8"),
  ]);
  const heroCopy = html.match(/<div class="hero__copy">[\s\S]*?<\/div>\s*<div class="entry-choices"/)?.[0] ?? "";
  const subtitle = heroCopy.match(/<p class="hero-subtitle">[\s\S]*?<\/p>/)?.[0] ?? "";

  await access(heroDrsMarkUrl);
  const markBytes = await readFile(heroDrsMarkUrl);
  assert.ok(markBytes.byteLength > 8000);
  assert.match(markBytes.toString("utf8"), /viewBox="0 0 560 420"/);
  assert.match(markBytes.toString("utf8"), /#d0e0e3/i);
  assert.match(markBytes.toString("utf8"), /#ff4a0b/i);
  assert.match(
    subtitle,
    /<img\s+class="hero-subtitle__brand-mark"\s+src="\.\/assets\/d_rs_03_compact_d0e0e3\.svg"\s+alt="D&amp;RS"\s+width="96"\s+height="72"\s+decoding="async"\s*\/>/,
  );
  assert.match(subtitle, /AI時代的裝修過程，新手上路需要一位副駕駛。/);
  assert.match(
    css,
    /\.hero-subtitle__brand-mark\s*\{[^}]*position:\s*absolute;[^}]*width:\s*96px;[^}]*height:\s*72px;[^}]*object-fit:\s*contain;/s,
  );
  assert.match(
    css,
    /@media\s*\(max-width:\s*680px\)[\s\S]*?\.hero-subtitle__brand-mark\s*\{[^}]*width:\s*72px;[^}]*height:\s*54px;/s,
  );
});

test("homepage five-stage choice removes the annotated heading copy", async () => {
  const html = await readFile(htmlUrl, "utf8");
  const entryChoices = html.match(/<div class="entry-choices"[\s\S]*?<\/div>\s*<\/div>/)?.[0] ?? "";

  assert.doesNotMatch(entryChoices, /entry-choices__heading/);
  assert.doesNotMatch(entryChoices, /從文件核對走進同一份案件|五個階段依序完成，先從現有資料開始/);
  assert.doesNotMatch(html, /aria-labelledby="entry-choice-title"/);
});

test("application check presents five ordered DRS decisions as engraved HERO-sequence blocks", async () => {
  const html = await readFile(htmlUrl, "utf8");
  const css = await readFile(cssUrl, "utf8");
  const section = html.match(
    /<section id="application-check"[\s\S]*?<\/section>/,
  )?.[0] ?? "";
  const steps = [
    "確認自己需要萊比決策系統輔助。",
    "已取得乙方報價單 PDF",
    "已取得施工圖 PDF，至少包含平面圖",
    "上傳檔案後取得基本報告",
    "萊比DRS系統只針對書面證據做第三方審核",
  ];
  const positions = steps.map((step) => section.indexOf(step));

  assert.match(section, /先確認手上資源，再認識萊比DRS。然後，才會有最準確的決策憑據。/);
  assert.equal((section.match(/data-qualification-item/g) ?? []).length, 5);
  assert.ok(positions.every((position) => position >= 0));
  assert.deepEqual(positions, [...positions].sort((a, b) => a - b));
  assert.match(section, /如果你有非常豐富的裝潢經驗，建議使用萊比的免費功能即可。/);
  assert.match(section, /需能看出項目、數量、單價或計價方式與版本。/);
  assert.match(section, /圖面需可讀，並能與報價所述施工範圍互相核對。/);
  assert.match(section, /輔助整體案件從設計到施工過程的書面審查，提供你做正確的決策。/);
  assert.match(section, /不是甲方的砍價武器，也不是挑乙方毛病的AI系統。/);
  assert.match(section, /class="qualification-showcase"/);
  assert.equal((section.match(/class="qualification-object"/g) ?? []).length, 5);
  assert.equal((section.match(/class="qualification-object__icon"/g) ?? []).length, 5);
  assert.equal((section.match(/class="qualification-object__shadow"/g) ?? []).length, 5);
  assert.equal((section.match(/class="qualification-object__side"/g) ?? []).length, 5);
  assert.equal((section.match(/class="qualification-object__bottom"/g) ?? []).length, 5);
  assert.equal((section.match(/class="qualification-object__face"/g) ?? []).length, 5);
  assert.doesNotMatch(section, /qualification-list__(?:cast-shadow|rear-body|side-plane|bottom-plane|front-face|physical-shadow)/);
  assert.doesNotMatch(section, /qualification-object__number-zero/);
  assert.equal((section.match(/class="qualification-object__lead"/g) ?? []).length, 5);
  assert.deepEqual(
    [...section.matchAll(/class="qualification-object__number-digit"[^>]*>([1-5])<\/span>/g)].map((match) => match[1]),
    ["1", "2", "3", "4", "5"],
  );
  assert.equal((section.match(/class="icon-accent"/g) ?? []).length, 5);
  assert.match(css, /--showcase-surface:\s*#101417/i);
  assert.match(css, /--showcase-face:\s*var\(--chapter-surface\)/i);
  assert.match(css, /--showcase-side:\s*#111519/i);
  assert.match(css, /--showcase-bottom:\s*#0c1013/i);
  assert.match(css, /--showcase-line:\s*rgba\(201, 209, 215, 0\.22\)/i);
  assert.match(css, /--showcase-digit:\s*var\(--object-accent, var\(--chapter-step-03\)\)/i);
  assert.match(css, /--showcase-ink:\s*var\(--chapter-ink\)/i);
  assert.match(css, /--showcase-muted:\s*var\(--chapter-copy\)/i);
  assert.doesNotMatch(css, /--showcase-digit:\s*#f4c51e/i);
  assert.match(css, /\.qualification-showcase\s*\{[^}]*padding:\s*clamp\(44px,\s*4\.2vw,\s*58px\)\s+clamp\(28px,\s*3\.1vw,\s*42px\)\s+clamp\(60px,\s*5\.4vw,\s*80px\)[^}]*border:\s*1px\s+solid\s+rgba\(244,\s*247,\s*248,\s*0\.1\)[^}]*border-radius:\s*6px[^}]*background:[^;]*var\(--showcase-surface\)[^}]*overflow:\s*hidden/s);
  assert.match(css, /\.qualification-list\s*\{[^}]*grid-template-columns:\s*repeat\(5,\s*minmax\(0,\s*1fr\)[^}]*gap:\s*clamp\(24px,\s*2\.2vw,\s*34px\)[^}]*padding:\s*0/s);
  assert.match(css, /\.qualification-object\s*\{[^}]*--object-lift:\s*-1px[^}]*aspect-ratio:\s*0\.84\s*\/\s*1[^}]*background:\s*transparent/s);
  assert.match(css, /\.qualification-object__face\s*\{[^}]*inset:\s*0\s+0\s+13px\s+10px[^}]*border:\s*1px\s+solid\s+color-mix\(in srgb, var\(--object-accent\) 34%, rgba\(244, 247, 248, 0\.12\)\)[^}]*border-radius:\s*11px[^}]*var\(--chapter-surface\)[^}]*inset\s+0\s+1px\s+0\s+rgba\(255,\s*255,\s*255,\s*0\.1\)/s);
  assert.match(css, /\.qualification-object__side\s*\{[^}]*inset:\s*6px\s+0\s+0\s+4px[^}]*border-radius:\s*12px[^}]*background:[^;]*var\(--showcase-side\)/s);
  assert.match(css, /\.qualification-object__bottom\s*\{[^}]*left:\s*10px[^}]*height:\s*13px[^}]*border-radius:\s*0\s+0\s+11px\s+11px[^}]*background:[^;]*var\(--showcase-bottom\)/s);
  const sideRule = css.match(/\.qualification-object__side\s*\{[^}]*\}/s)?.[0] ?? "";
  const bottomRule = css.match(/\.qualification-object__bottom\s*\{[^}]*\}/s)?.[0] ?? "";
  assert.doesNotMatch(sideRule, /clip-path/);
  assert.doesNotMatch(bottomRule, /clip-path/);
  assert.match(css, /\.qualification-object__shadow::before\s*\{[^}]*background:\s*rgba\(0,\s*0,\s*0,\s*0\.5\)[^}]*filter:\s*blur\(5px\)/s);
  assert.match(css, /\.qualification-object__shadow::after\s*\{[^}]*rgba\(0,\s*0,\s*0,\s*0\.34\)[^}]*filter:\s*blur\(14px\)/s);
  assert.match(css, /\.qualification-object:hover\s*\{[^}]*--object-lift:\s*-4px/s);
  assert.match(css, /\.qualification-object__number\s*\{[^}]*z-index:\s*3[^}]*inset:\s*0\s+0\s+13px\s+10px[^}]*overflow:\s*hidden[^}]*font-size:\s*clamp\(13rem,\s*16vw,\s*17rem\)[^}]*pointer-events:\s*none/s);
  assert.match(css, /\.qualification-object__number-digit\s*\{[^}]*position:\s*absolute[^}]*top:\s*10%[^}]*left:\s*0[^}]*line-height:\s*0\.82[^}]*color:\s*color-mix\(in srgb, var\(--showcase-digit\) 46%, #121619\)[^}]*text-shadow:\s*-1px\s+-1px\s+1px\s+rgba\(5,\s*9,\s*13,\s*0\.78\),\s*1px\s+1px\s+0\s+rgba\(255,\s*255,\s*255,\s*0\.14\),\s*0\s+2px\s+3px\s+rgba\(5,\s*9,\s*13,\s*0\.34\)[^}]*transform:\s*translateX\(-30%\)/s);
  assert.doesNotMatch(css, /\.qualification-object__number-zero/);
  assert.match(css, /\.qualification-object__icon\s*\{[^}]*z-index:\s*4[^}]*top:\s*31%[^}]*left:\s*62%[^}]*color:\s*color-mix\(in srgb, var\(--object-accent\) 62%, var\(--chapter-ink\)\)/i);
  assert.match(css, /\.qualification-object__copy\s*\{[^}]*z-index:\s*5[^}]*inset:\s*41%\s+14px\s+14px/s);
  assert.match(css, /\.qualification-object__lead\s*\{[^}]*color:\s*var\(--showcase-ink\)/s);
  assert.match(css, /\.qualification-object__detail\s*\{[^}]*color:\s*var\(--showcase-muted\)/s);
  assert.match(css, /@media\s*\(max-width:\s*1080px\)[\s\S]*?\.qualification-list\s*\{[^}]*grid-template-columns:\s*repeat\(6,/s);
  assert.match(css, /@media\s*\(max-width:\s*620px\)[\s\S]*?\.qualification-showcase\s*\{[^}]*padding:\s*24px\s+16px\s+30px[^}]*border-radius:\s*6px[^}]*\}\s*\.qualification-list\s*\{[^}]*width:\s*100%[^}]*grid-template-columns:\s*1fr[^}]*gap:\s*12px/s);
  assert.match(css, /@media\s*\(max-width:\s*620px\)[\s\S]*?\.qualification-object__number\s*\{[^}]*font-size:\s*clamp\(11rem,\s*48vw,\s*14rem\)[\s\S]*?\.qualification-object__copy\s*\{[^}]*inset:\s*42%\s+18px\s+12px\s+42%/s);
});

test("qualification objects round every visible plane and retain revealed details", async () => {
  const [html, css, script] = await Promise.all([
    readFile(htmlUrl, "utf8"),
    readFile(cssUrl, "utf8"),
    readFile(new URL("../src/stitch_laibe_landing_onboarding/pcm_standalone/public_home/app.js", import.meta.url), "utf8"),
  ]);
  const section = html.match(/<section id="application-check"[\s\S]*?<\/section>/)?.[0] ?? "";

  assert.match(html, /<script type="module" src="\.\/app\.js\?v=20260811-rounded-reveal"><\/script>/);
  assert.equal((section.match(/data-qualification-item/g) ?? []).length, 5);
  assert.equal((section.match(/tabindex="0"/g) ?? []).length, 5);
  assert.match(css, /\.qualification-object__detail\s*\{[^}]*opacity:\s*0[^}]*visibility:\s*hidden[^}]*transform:\s*translateY\(6px\)/s);
  assert.match(css, /\.qualification-object:hover\s+\.qualification-object__detail,[\s\S]*?\.qualification-object\.is-detail-revealed\s+\.qualification-object__detail\s*\{[^}]*opacity:\s*1[^}]*visibility:\s*visible[^}]*transform:\s*translateY\(0\)/s);
  assert.match(script, /export function bindQualificationDetailReveal/);
  assert.match(script, /addEventListener\("pointerenter",\s*reveal,\s*\{\s*once:\s*true\s*\}\)/s);
  assert.match(script, /addEventListener\("focusin",\s*reveal,\s*\{\s*once:\s*true\s*\}\)/s);
  assert.match(script, /classList\.add\("is-detail-revealed"\)/);
  assert.match(script, /bindQualificationDetailReveal\(root\)/);
});

test("three owner-facing chapters inherit the HERO palette, type hierarchy, and action language", async () => {
  const [html, css] = await Promise.all([
    readFile(htmlUrl, "utf8"),
    readFile(cssUrl, "utf8"),
  ]);
  const heroCopy = html.match(/<div class="hero__copy">[\s\S]*?<\/div>\s*<div class="entry-choices"/)?.[0] ?? "";

  assert.match(heroCopy, /在裝潢上，[\s\S]*專業的事讓專業[\s\S]*彼此核對。/);
  assert.match(heroCopy, /重要的決定，由你來做。/);
  assert.match(css, /--chapter-ink:\s*#f4f7f8/i);
  assert.match(css, /--chapter-copy:\s*#c9d1d7/i);
  assert.match(css, /--chapter-muted:\s*#8d979f/i);
  assert.match(css, /--chapter-surface:\s*#161a1d/i);
  assert.match(css, /--chapter-step-01:\s*#daaf8b/i);
  assert.match(css, /--chapter-step-02:\s*#5f7482/i);
  assert.match(css, /--chapter-step-03:\s*#335875/i);
  assert.match(css, /--chapter-step-04:\s*#42565f/i);
  assert.match(css, /--chapter-step-05:\s*#2f454e/i);

  assert.match(css, /\.decision-node:nth-child\(1\)\s*\{[^}]*--decision-step:\s*var\(--chapter-step-01\)/s);
  assert.match(css, /\.decision-node:nth-child\(4\)\s+\.decision-node__index\s*\{[^}]*color:\s*var\(--accent-orange\)/s);
  assert.match(css, /\.decision-node__tool-icon\s*\{[^}]*color:\s*#fff/s);
  assert.match(css, /\.qualification-object:nth-child\(1\)\s*\{[^}]*--object-accent:\s*var\(--chapter-step-01\)/s);
  assert.match(css, /\.qualification-object__face\s*\{[^}]*var\(--chapter-surface\)/s);
  assert.match(css, /\.risk-map__item:nth-child\(3\)\s*\{[^}]*--risk-step:\s*var\(--accent-orange\)/s);
  assert.match(css, /\.risk-map__card\s*\{[^}]*background:[^;}]*var\(--chapter-surface\)/s);
  assert.match(css, /\.risk-map__copy p\s*\{[^}]*color:\s*var\(--chapter-copy\)/s);
});

test("section 4 recreates the reference hub-and-five-branches risk map", async () => {
  const html = await readFile(htmlUrl, "utf8");
  const css = await readFile(cssUrl, "utf8");
  const section = readSection(html, "pcm-scope");
  const scopeStyles = css.slice(
    css.indexOf(".narrative-section--questions"),
    css.indexOf(".narrative-takeaway"),
  );

  assert.match(section, /DRS 在幫你做什麼/);
  assert.match(section, /裝潢最貴的，往往不是報價本身，[\s\S]*而是那些一開始沒說清楚的事。/);
  assert.match(section, /DRS是專業第三方，經由AI輔助鑑別，把你看不懂、不好意思說的問題找出來。/);
  assert.doesNotMatch(section, /DRS 在每個重要決定前，先替你把依據、缺漏、追加與責任核對清楚。/);
  assert.match(section, /你不需要自己變成工程專家，也不用只靠乙方口頭解釋來做決定。/);
  assert.equal((section.match(/data-owner-risk/g) ?? []).length, 5);
  for (const phrase of [
    "沒有白紙黑字，最後就只能各說各話。",
    "漏一張圖、漏一個項目，都可能變成後面的追加。",
    "這筆追加，你真的需要再付一次嗎？",
    "材料進場就付款30%，安全嗎?",
    "責任不清，事情最後就停在「要不要妥協」？",
  ]) {
    assert.match(section, new RegExp(phrase));
  }
  assert.match(section, /磁磚貼好了，才問防水有沒有測？錢付了，才發現這期其實沒驗？ 裝潢真正危險的，往往不是沒有驗收，而是錯過了「還看得到、還能要求改善」的時間點。/);
  assert.match(section, /乙方提出追加或變更時，DRS 先對回原報價、圖說與約定範圍，確認這到底是新增工作，還是原本就應該包含的內容？單價是否合理？/);
  assert.match(section, /甲乙雙方的信任破裂，往往出現在甲方不好意思開口，乙方認為你沒說就算了。但是，問題只是正在滾雪球/);
  assert.equal((section.match(/class="risk-map__core"/g) ?? []).length, 1);
  assert.equal((section.match(/class="risk-map__trunk"/g) ?? []).length, 1);
  assert.equal((section.match(/class="risk-map__branch"/g) ?? []).length, 5);
  assert.equal((section.match(/class="risk-map__card"/g) ?? []).length, 5);
  assert.equal((section.match(/class="risk-map__icon"/g) ?? []).length, 5);
  assert.equal((section.match(/risk-map__item--far/g) ?? []).length, 3);
  assert.equal((section.match(/risk-map__item--near/g) ?? []).length, 2);
  const riskCards = [...section.matchAll(/<article class="risk-map__card">([\s\S]*?)<\/article>/g)]
    .map((match) => match[1]);
  assert.equal(riskCards.length, 5);
  for (const card of riskCards) {
    assert.ok(card.indexOf("risk-map__copy") < card.indexOf("risk-map__number"));
  }
  assert.match(scopeStyles, /--map-bg:\s*#101417;/);
  assert.match(scopeStyles, /--map-card:\s*var\(--chapter-surface\);/);
  assert.match(scopeStyles, /--map-line:\s*rgba\(201, 209, 215, 0\.32\);/);
  assert.match(scopeStyles, /--map-ink:\s*var\(--chapter-ink\);/);
  assert.match(scopeStyles, /--map-core-size:\s*clamp\(152px, 17vw, 184px\);/);
  assert.match(scopeStyles, /--map-row-height:\s*148px;/);
  assert.match(scopeStyles, /--map-row-gap:\s*14px;/);
  assert.match(scopeStyles, /--map-row-shift:\s*28px;/);
  assert.match(scopeStyles, /--map-core-offset:\s*24px;/);
  assert.match(scopeStyles, /--map-arrow-depth:\s*56px;/);
  assert.match(scopeStyles, /max-width:\s*1040px;/);
  assert.match(scopeStyles, /padding:\s*42px 34px 42px 14px;/);
  assert.match(scopeStyles, /\.risk-map__item--far\s*\{[^}]*--item-shift:\s*var\(--map-row-shift\);/s);
  assert.match(scopeStyles, /\.risk-map__item--near\s*\{[^}]*--item-shift:\s*0px;/s);
  assert.match(scopeStyles, /\.risk-map__core::after\s*\{[^}]*width:\s*calc\(\(var\(--map-core-column\) - var\(--map-core-size\)\) \/ 2 \+ var\(--map-link-column\) \/ 2\);/s);
  assert.match(scopeStyles, /\.risk-map__core\s*\{[^}]*transform:\s*translateY\(var\(--map-core-offset\)\);/s);
  assert.match(scopeStyles, /\.risk-map__card\s*\{[^}]*grid-template-columns:\s*minmax\(0, 1fr\) clamp\(62px, 6vw, 74px\);/s);
  assert.match(scopeStyles, /\.risk-map__card\s*\{[^}]*border:\s*1px solid color-mix\(in srgb, var\(--risk-step\) 36%, rgba\(244, 247, 248, 0\.12\)\);/s);
  assert.match(scopeStyles, /\.risk-map__icon\s*\{[^}]*width:\s*clamp\(72px, 8vw, 82px\);/s);
  assert.doesNotMatch(scopeStyles, /\.risk-map__card::after/);
  assert.doesNotMatch(scopeStyles, /\.risk-map__card\s*\{[^}]*border:\s*2px solid var\(--map-bg\)/s);
  assert.match(scopeStyles, /\.narrative-section--questions\s*\{[^}]*background:\s*transparent;/s);
  assert.match(scopeStyles, /\.risk-map-heading h2\s*\{[^}]*color:\s*var\(--map-ink\);/s);
  assert.match(scopeStyles, /\.risk-map-heading__copy\s*\{[^}]*color:\s*var\(--chapter-copy\);/s);
  assert.doesNotMatch(scopeStyles, /#FF5809|--risk-accent|clip-path/);
});

test("owner annotations refine the application heading and warm only the lead risk copy", async () => {
  const [html, css] = await Promise.all([
    readFile(htmlUrl, "utf8"),
    readFile(cssUrl, "utf8"),
  ]);
  const application = readSection(html, "application-check");
  const scope = readSection(html, "pcm-scope");

  assert.ok(application.includes('<h2 id="application-check-title">先看現在是否適合開始</h2>'));
  assert.doesNotMatch(application, /先看你現在是否適合開始/);
  assert.ok(
    scope.includes("<p>DRS是專業第三方，經由AI輔助鑑別，把你看不懂、不好意思說的問題找出來。</p>"),
  );
  assert.match(
    css,
    /\.risk-map-heading__copy p:first-child\s*\{[^}]*color:\s*#DAAF8B;[^}]*font-weight:\s*760;/s,
  );
  assert.match(css, /\.risk-map-heading__copy\s*\{[^}]*color:\s*var\(--chapter-copy\);/s);
});

test("section 5 reduces reviewed material to four owner-facing results", async () => {
  const html = await readFile(htmlUrl, "utf8");
  const section = readSection(html, "result-example");

  assert.match(section, /DRS 審查之後/);
  assert.match(section, /複雜的資料交給 DRS[\s\S]*你只負責決策自己的需求/);
  assert.doesNotMatch(section, /你只看決策需要的結果/);
  assert.equal((section.match(/data-decision-result/g) ?? []).length, 4);
  for (const label of [
    "有沒有依據",
    "哪裡有差異",
    "還缺什麼",
    "你現在要決定什麼",
  ]) {
    assert.match(section, new RegExp(label));
  }
  assert.doesNotMatch(section, /Decision Ready/);
});

test("section 6 presents the six facts needed for an owner decision", async () => {
  const html = await readFile(htmlUrl, "utf8");
  const section = readSection(html, "workspace-preview");

  assert.match(section, /甲方的決策畫面/);
  assert.match(section, /不用自己拼答案[\s\S]*DRS 把決策需要的事放在同一頁/);
  assert.equal((section.match(/data-decision-fact/g) ?? []).length, 6);
  for (const label of [
    "DRS 怎麼看",
    "依據在哪裡",
    "哪裡不一致",
    "還缺什麼",
    "選了會怎樣",
    "最後由你決定",
  ]) assert.match(section, new RegExp(label));
  assert.match(section, /專業的事，讓專業彼此核對[\s\S]*重要的決定，由你來做/);
});

test("result and workspace sections remove only the owner-directed right narrative copy", async () => {
  const html = await readFile(htmlUrl, "utf8");
  const resultSection = readSection(html, "result-example");
  const workspaceSection = readSection(html, "workspace-preview");

  assert.match(resultSection, /DRS 審查之後/);
  assert.match(resultSection, /複雜的資料交給 DRS[\s\S]*你只負責決策自己的需求/);
  assert.doesNotMatch(resultSection, /你只看決策需要的結果/);
  assert.doesNotMatch(resultSection, /DRS 的工作不是再製造一份更難懂的工程報告/);
  assert.doesNotMatch(resultSection, /它把散落在報價、圖說、追加與紀錄裡的內容/);
  assert.equal((resultSection.match(/narrative-heading__copy/g) ?? []).length, 0);
  assert.equal((resultSection.match(/data-decision-result/g) ?? []).length, 4);

  assert.match(workspaceSection, /甲方的決策畫面/);
  assert.match(workspaceSection, /不用自己拼答案[\s\S]*DRS 把決策需要的事放在同一頁/);
  assert.doesNotMatch(workspaceSection, /需要你確認時，DRS 不只丟回一堆原始檔案/);
  assert.doesNotMatch(workspaceSection, /甲方先看到結論、差異、缺件與影響/);
  assert.equal((workspaceSection.match(/narrative-heading__copy/g) ?? []).length, 0);
  assert.equal((workspaceSection.match(/data-decision-fact/g) ?? []).length, 6);
});

test("section 7 keeps DRS active through four documented decision stages", async () => {
  const html = await readFile(htmlUrl, "utf8");
  const section = readSection(html, "case-flow");

  assert.match(section, /從第一次核對，到每一次重要決定/);
  assert.match(section, /工程一直往前[\s\S]*DRS 就一直替你守住決策依據/);
  assert.deepEqual(
    [...section.matchAll(/data-home-stage="([1-4])"/g)].map((match) => match[1]),
    ["1", "2", "3", "4"],
  );
  for (const phrase of [
    "先看現有資料",
    "建立共同依據",
    "每個重要節點重新核對",
    "決定與紀錄一起留下",
  ]) {
    assert.match(section, new RegExp(phrase));
  }
  assert.doesNotMatch(section, /文件先行，服務契約與乙方邀請在後/);
});

test("section 8 assigns one clear responsibility to the contractor, DRS, and owner", async () => {
  const html = await readFile(htmlUrl, "utf8");
  const section = readSection(html, "cooperation-scope");

  assert.match(section, /三方各做自己最擅長的事/);
  assert.match(
    section,
    /<h2 id="roles-title">乙方放大自己的專業，<br \/>DRS負責核對，<br \/>決策你來做。<\/h2>/,
  );
  assert.doesNotMatch(section, /乙方專心做專業，[\s\S]*DRS 專心替你核對，[\s\S]*最後由你決定。/);
  assert.doesNotMatch(section, /乙方專心做專業，[\s\S]*DRS負責核對，[\s\S]*決策你來做。/);
  assert.equal((section.match(/data-collaboration-role/g) ?? []).length, 3);
  assert.match(section, /乙方[\s\S]*提出專業內容/);
  assert.match(
    section,
    /<article class="role-band__drs" data-collaboration-role><span>DRS<\/span><strong>專業與專業對口<\/strong>/,
  );
  assert.doesNotMatch(section, /<strong>專業對專業核對<\/strong>/);
  assert.match(
    section,
    /<article data-collaboration-role><span>甲方<\/span><strong>掌握結果，作最後決定，一切留痕。<\/strong>/,
  );
  assert.doesNotMatch(section, /<strong>掌握結果，作最後決定<\/strong>/);
  assert.match(section, /DRS 替甲方把關/);
  assert.match(section, /不代替甲乙雙方進行現場查驗/);
});

test("section 9 leads with the first document review rather than login technology", async () => {
  const html = await readFile(htmlUrl, "utf8");
  const section = readSection(html, "final-action");

  assert.match(section, /從你手上的資料開始/);
  assert.match(section, /不用先相信 DRS[\s\S]*先讓 DRS 替你核對一次/);
  assert.match(section, /直接試做報價健檢/);
  assert.match(section, /登入／進入工作台/);
  assert.match(section, /data-route="quoteCheck"[\s\S]*href="\.\.\/quote_check\/code\.html"/);
  assert.match(section, /data-route="accountAccess"[\s\S]*data-route-state="planned"/);
  assert.doesNotMatch(section, /申請 Email 一次性登入/);
});

test("homepage presents five truthful entry stages in the confirmed order", async () => {
  const html = await readFile(htmlUrl, "utf8");
  const css = await readFile(cssUrl, "utf8");
  const sectionStart = html.indexOf('class="entry-choices"');
  const sectionEnd = html.indexOf('class="same-fact-rail"', sectionStart);
  const section = html.slice(sectionStart, sectionEnd);
  const labels = [
    "報價資料健檢",
    "簽署服務契約",
    "邀請乙方加入",
    "案件決策輔助",
    "撥款驗收書面審核",
  ];
  const positions = labels.map((label) => section.indexOf(label));

  assert.ok(positions.every((position) => position >= 0));
  assert.deepEqual(positions, [...positions].sort((a, b) => a - b));
  assert.equal((section.match(/data-entry-step=/g) ?? []).length, 5);
  assert.doesNotMatch(section, /查看圖說檢討|甲方登入／乙方受邀/);

  for (const [step, route, label] of [
    ["01", "quoteCheck", "報價資料健檢"],
    ["02", "serviceContract", "簽署服務契約"],
  ]) {
    const control = html.match(
      new RegExp(`<a\\b(?=[^>]*data-entry-step="${step}")(?=[^>]*data-route="${route}")[^>]*>[\\s\\S]*?${label}[\\s\\S]*?<\\/a>`),
    )?.[0] ?? "";
    assert.match(control, /aria-disabled="true"/);
    assert.match(control, /data-route-state="planned"/);
    assert.doesNotMatch(control, /\shref=/);
  }

  for (const [step, label, status] of [
    ["03", "邀請乙方加入", "完成契約後開放"],
    ["04", "案件決策輔助", "進入案件後使用"],
    ["05", "撥款驗收書面審核", "書面確認後進行"],
  ]) {
    const planned = section.match(
      new RegExp(`<div\\b(?=[^>]*data-entry-step="${step}")(?=[^>]*data-entry-state="planned")[^>]*>[\\s\\S]*?${label}[\\s\\S]*?${status}[\\s\\S]*?<\\/div>`),
    )?.[0] ?? "";
    assert.match(planned, /aria-disabled="true"/);
    assert.doesNotMatch(planned, /\shref=|data-route=/);
  }

  assert.match(css, /\.entry-choice::before\s*\{[^}]*clip-path:\s*polygon\(7% 0,\s*93% 0,\s*100% 50%,\s*93% 100%,\s*7% 100%,\s*0 50%\);/s);
  assert.match(css, /\.entry-choice__number\s*\{[^}]*clip-path:\s*polygon\(25% 0,\s*75% 0,\s*100% 50%,\s*75% 100%,\s*25% 100%,\s*0 50%\);/s);
  assert.match(css, /@media\s*\(max-width:\s*680px\)[\s\S]*?\.entry-choice\s*\{/);
  assert.match(html, /href="\.\/styles\.css\?v=20260813-hero-subtitle-warm"/);
});

test("entry stages reproduce the owner-approved interlocking honeycomb infographic without changing the protected hero copy", async () => {
  const html = await readFile(htmlUrl, "utf8");
  const css = await readFile(cssUrl, "utf8");
  const protectedCopy = html.match(/<div class="hero__copy">[\s\S]*?<\/div>\s*<div class="entry-choices"/)?.[0] ?? "";

  assert.match(protectedCopy, /<span>在裝潢上，<\/span>\s*<span>專業的事讓專業<\/span>\s*<span>彼此核對。<\/span>/);
  assert.match(protectedCopy, /class="hero-title__vertical">重要的決定，由你來做。<\/span>/);
  assert.match(css, /\.hero\s*\{[^}]*grid-template-columns:\s*minmax\(0,\s*62fr\)\s+minmax\(0,\s*38fr\);/s);
  assert.match(css, /@media\s*\(min-width:\s*1001px\)[\s\S]*?\.entry-choices\s*\{[^}]*width:\s*min\(100%,\s*420px\);[^}]*justify-self:\s*start;/);

  assert.match(css, /\.entry-choices__list\s*\{[^}]*gap:\s*10px;[^}]*padding:\s*14px 12px;[^}]*background:\s*transparent;[^}]*box-shadow:\s*none;/s);
  assert.match(css, /\.entry-choice\s*\{[^}]*min-height:\s*94px;[^}]*overflow:\s*visible;[^}]*background:\s*transparent;/s);
  assert.match(css, /\.entry-choice::before\s*\{[^}]*inset:\s*7px 0;[^}]*clip-path:\s*polygon\(7% 0,\s*93% 0,\s*100% 50%,\s*93% 100%,\s*7% 100%,\s*0 50%\);[^}]*background:\s*linear-gradient\(105deg,\s*#557a14 0%,\s*#86a90b 48%,\s*#bfd318 100%\);/s);
  assert.match(css, /\.entry-choice:nth-child\(even\)::before\s*\{[^}]*background:\s*linear-gradient\(105deg,\s*#bfd318 0%,\s*#86a90b 52%,\s*#557a14 100%\);/s);
  assert.match(css, /\.entry-choice__number\s*\{[^}]*width:\s*112px;[^}]*height:\s*104px;[^}]*clip-path:\s*polygon\(25% 0,\s*75% 0,\s*100% 50%,\s*75% 100%,\s*25% 100%,\s*0 50%\);[^}]*background:\s*linear-gradient\(145deg,\s*#ffffff 0%,\s*#f7f7f2 38%,\s*#c7cbc2 72%,\s*#ffffff 100%\);/s);
  assert.match(css, /\.entry-choice__number\s*\{[^}]*filter:\s*drop-shadow\(-2px -2px 0 rgba\(255, 255, 255, 0\.72\)\)\s*drop-shadow\(2px 3px 1px rgba\(82, 91, 55, 0\.4\)\)\s*drop-shadow\(7px 10px 8px rgba\(20, 27, 5, 0\.5\)\);/s);
  assert.match(css, /\.entry-choice__number::before\s*\{[^}]*inset:\s*9px;[^}]*background:\s*linear-gradient\(145deg,\s*rgba\(255, 255, 255, 0\.26\),\s*transparent 34%\),\s*linear-gradient\(135deg,\s*#688f0d,\s*#bad116\);[^}]*box-shadow:[^}]*inset 2px 2px 2px rgba\(255, 255, 255, 0\.28\)[^}]*inset -3px -4px 5px rgba\(57, 74, 8, 0\.34\);/s);
  assert.match(css, /\.entry-choice:nth-child\(odd\) \.entry-choice__number\s*\{[^}]*left:\s*62%;/s);
  assert.match(css, /\.entry-choice:nth-child\(even\) \.entry-choice__number\s*\{[^}]*left:\s*38%;/s);
  assert.match(css, /\.entry-choice__number\s*\{[^}]*font-family:\s*"Arial Narrow",\s*"Roboto Condensed",\s*"Noto Sans TC",\s*sans-serif;[^}]*font-size:\s*2\.35rem;/s);
  assert.match(css, /\.entry-choice:nth-child\(odd\) \.entry-choice__copy\s*\{[^}]*left:\s*6%;[^}]*width:\s*43%;/s);
  assert.match(css, /\.entry-choice:nth-child\(even\) \.entry-choice__copy\s*\{[^}]*right:\s*6%;[^}]*width:\s*43%;/s);
  assert.doesNotMatch(css, /@media\s*\(max-width:\s*420px\)\s*\{[\s\S]*?\.entry-choice::before\s*\{[^}]*width:\s*74px;/);
  assert.doesNotMatch(css, /@media\s*\(max-width:\s*420px\)\s*\{[\s\S]*?\.entry-choice::after\s*\{[^}]*left:\s*74px;/);
});

test("entry stage kickers move into the alternating blank tips as bold vermilion labels", async () => {
  const html = await readFile(htmlUrl, "utf8");
  const css = await readFile(cssUrl, "utf8");
  const kickerLabels = ["文件核對", "服務確認", "成員加入", "案件治理", "驗收確認"];

  assert.match(html, /href="\.\/styles\.css\?v=20260813-hero-subtitle-warm"/);

  for (const [index, label] of kickerLabels.entries()) {
    const step = String(index + 1).padStart(2, "0");
    assert.match(
      html,
      new RegExp(`data-entry-step="${step}"[\\s\\S]*?>\\s*<span class="entry-choice__kicker">${label}<\\/span>\\s*<div class="entry-choice__copy">`),
    );
  }

  assert.doesNotMatch(html, /<div class="entry-choice__copy">\s*<span class="entry-choice__kicker">/);
  assert.match(
    css,
    /\.entry-choice__kicker\s*\{[^}]*display:\s*grid;[^}]*width:\s*2\.6em;[^}]*height:\s*2\.3em;[^}]*place-items:\s*center;[^}]*color:\s*#D94600;[^}]*font-size:\s*clamp\(1rem,\s*1\.4vw,\s*1\.125rem\);[^}]*font-weight:\s*900;[^}]*letter-spacing:\s*0\.02em;[^}]*line-height:\s*1\.05;[^}]*white-space:\s*normal;[^}]*overflow-wrap:\s*anywhere;[^}]*text-shadow:\s*0 1px 1px rgba\(18,\s*25,\s*4,\s*0\.28\);[^}]*transform:\s*translateY\(-50%\);/s,
  );
  assert.match(css, /\.entry-choice:nth-child\(odd\)\s*>\s*\.entry-choice__kicker\s*\{[^}]*right:\s*9%;[^}]*text-align:\s*center;/s);
  assert.match(css, /\.entry-choice:nth-child\(even\)\s*>\s*\.entry-choice__kicker\s*\{[^}]*left:\s*9%;[^}]*text-align:\s*center;/s);
});

test("entry stage cards keep supporting copy visible in the editorial reading flow", async () => {
  const html = await readFile(htmlUrl, "utf8");
  const css = await readFile(cssUrl, "utf8");
  const sectionStart = html.indexOf('class="entry-choices"');
  const sectionEnd = html.indexOf('class="same-fact-rail"', sectionStart);
  const section = html.slice(sectionStart, sectionEnd);
  const entryMobileStart = css.indexOf("@media (max-width: 680px)", css.indexOf(".entry-choice"));
  const entryMobileEnd = css.indexOf("@media (max-width: 420px)", entryMobileStart);
  const entryMobile = css.slice(entryMobileStart, entryMobileEnd);

  assert.equal((section.match(/class="entry-choice__details"/g) ?? []).length, 5);
  assert.match(section, /class="entry-choice__details">\s*<small>核對報價範圍、缺漏與版本差異<\/small>\s*<span class="entry-choice__status">可先查看<\/span>/);
  assert.match(section, /class="entry-choice__details">\s*<small>先閱讀服務範圍，確認必要資料後再完成簽署<\/small>\s*<span class="entry-choice__status">先閱讀服務契約<\/span>/);
  assert.match(section, /class="entry-choice__details">\s*<small>核對驗收紀錄、缺失改善與撥款依據是否齊備<\/small>\s*<span class="entry-choice__status">書面確認後進行<\/span>/);
  assert.match(css, /\.entry-choice__details\s*\{[^}]*max-height:\s*none;[^}]*overflow:\s*visible;[^}]*opacity:\s*1/s);
  assert.match(css, /\.entry-choices__list\s*\{[^}]*display:\s*grid/s);
  assert.match(entryMobile, /\.entry-choice__details\s*\{[^}]*max-height:\s*none;[^}]*opacity:\s*1/s);
});

test("homepage hero composes the secondary horizontal line and primary vertical line into a square", async () => {
  const html = await readFile(htmlUrl, "utf8");
  const css = await readFile(cssUrl, "utf8");
  const heading = html.match(/<h1\b[^>]*id="hero-title"[\s\S]*?<\/h1>/)?.[0] ?? "";

  assert.match(heading, /class="hero-title-lockup"/);
  assert.match(
    heading,
    /aria-label="在裝潢上，專業的事讓專業彼此核對。重要的決定，由你來做。"/,
  );
  assert.match(heading, /class="hero-title__horizontal"/);
  assert.match(heading, /class="hero-title__vertical">重要的決定，由你來做。<\/span>/);
  assert.match(css, /\.hero-title-lockup\s*\{[^}]*aspect-ratio:\s*1/s);
  assert.match(css, /\.hero-title__horizontal\s*\{[^}]*font-weight:\s*680/s);
  assert.match(css, /\.hero-title__vertical\s*\{[^}]*writing-mode:\s*vertical-rl/s);
  assert.match(
    css,
    /\.hero-title__vertical\s*\{[^}]*font-family:\s*"Noto Serif TC",\s*"Noto Serif HK",\s*"PMingLiU",\s*serif;/s,
  );
  assert.match(css, /\.hero-title__vertical\s*\{[^}]*font-weight:\s*950/s);
  assert.match(
    css,
    /\.hero-title__vertical\s*\{[^}]*min-height:\s*0;[^}]*font-size:\s*clamp\(2\.45rem,\s*3\.4vw,\s*2\.68rem\)/s,
  );
  assert.match(css, /--hero-title-secondary:\s*#cbd3da/);
  assert.match(css, /--hero-title-primary:\s*#f8fbff/);
  assert.match(
    css,
    /@media\s*\(max-width:\s*680px\)[\s\S]*?\.hero-title-lockup\s*\{[^}]*aspect-ratio:\s*auto;[\s\S]*?\.hero-title__vertical\s*\{[^}]*writing-mode:\s*horizontal-tb;/,
  );
});

test("homepage hero gives the narrative text priority over three-fifths banners", async () => {
  const css = await readFile(cssUrl, "utf8");

  assert.match(
    css,
    /\.hero\s*\{[^}]*grid-template-columns:\s*minmax\(0,\s*62fr\)\s+minmax\(0,\s*38fr\);/s,
  );
  assert.match(
    css,
    /@media\s*\(min-width:\s*1001px\)\s*and\s*\(max-width:\s*1180px\)\s*\{[\s\S]*?\.hero\s*\{[^}]*grid-template-columns:\s*minmax\(0,\s*58fr\)\s+minmax\(0,\s*42fr\);[^}]*gap:\s*36px;/,
  );
  assert.match(
    css,
    /@media\s*\(min-width:\s*1001px\)[\s\S]*?\.hero__copy\s*\{[^}]*place-items:\s*center;[\s\S]*?\.hero-title-lockup\s*\{[^}]*width:\s*min\(100%,\s*720px\);[^}]*transform:\s*none;[\s\S]*?\.hero-title__horizontal\s*\{[^}]*font-size:\s*clamp\(2\.8rem,\s*4\.5vw,\s*3\.8rem\);[\s\S]*?\.hero-title__vertical\s*\{[^}]*font-size:\s*clamp\(2\.7rem,\s*3\.7vw,\s*3\.15rem\);[\s\S]*?\.entry-choices\s*\{[^}]*width:\s*min\(100%,\s*420px\);[^}]*justify-self:\s*start;/,
  );
  assert.doesNotMatch(css, /\.entry-choices\s*\{[^}]*width:\s*min\(100%,\s*700px\)/s);
  assert.doesNotMatch(css, /\.entry-choices__list\s*\{[^}]*transform:\s*scale|width:\s*60%/s);
});

test("homepage turns five owner concerns into a central DRS decision path", async () => {
  const html = await readFile(htmlUrl, "utf8");
  const css = await readFile(cssUrl, "utf8");
  const hero = html.match(/<section\b[^>]*id="hero"[\s\S]*?<\/section>/)?.[0] ?? "";
  const decisionSection = html.match(/<section\b[^>]*id="decision-prompts"[\s\S]*?<\/section>/)?.[0] ?? "";
  const nodes = [...decisionSection.matchAll(/<li\b[^>]*class="decision-node decision-node--(?:left|right)(?: decision-node--action)?"[\s\S]*?<\/li>/g)].map(
    (match) => match[0],
  );

  assert.doesNotMatch(hero, /hero__decision-prompts|hero__actions|data-hero-status/);
  assert.ok(html.indexOf('id="decision-prompts"') > html.indexOf('id="hero"'));
  assert.match(decisionSection, /aria-labelledby="decision-prompts-title"/);
  assert.match(decisionSection, /class="eyebrow">裝潢決策前的專業問題<\/p>/);
  assert.match(decisionSection, /<h2 id="decision-prompts-title">你真正需要確認的，不應該只是總價。<\/h2>/);
  assert.doesNotMatch(decisionSection, /你真正需要確認的，不只是一個價格。/);
  assert.match(decisionSection, /材料、報價、圖說與追加，只要有一處不清楚，都是工程中增加費用與爭議的種子。/);
  assert.doesNotMatch(decisionSection, /材料、報價、圖說與追加，只要有一處沒說清楚，都可能在施工後變成多花的時間、費用與爭議。/);
  assert.match(css, /\.decision-prompts__lead\s*\{[\s\S]*?font-size: clamp\(1rem, 1\.4vw, 17px\);/);
  assert.match(css, /\.decision-prompts__intro \.eyebrow\s*\{[\s\S]*?font-size: 18px;/);
  assert.match(decisionSection, /class="decision-path__questions-stage">\s*<span class="decision-path__spine"[^>]*><\/span>\s*<ol class="decision-path__questions"/);
  assert.match(decisionSection, /class="decision-path__questions"/);
  assert.match(decisionSection, /aria-label="開始決策前需要核對的五個問題"/);
  assert.equal(nodes.length, 5);
  assert.deepEqual(
    nodes.map((node) => node.match(/data-decision-node="(Q0[1-5])"/)?.[1]),
    ["Q01", "Q02", "Q03", "Q04", "Q05"],
  );
  assert.match(nodes[0], /材料是否安全？[\s\S]*?文件是否清楚交代材料型號、規格與可供核對的資料？[\s\S]*?沒有書面依據，就不能只靠一句「應該沒問題」。/);
  assert.match(nodes[1], /報價合不合理？[\s\S]*?總價只是最後一個數字。[\s\S]*?項目、數量、單價、計價方式與版本是否完整一致，才是判斷前需要先看清楚的事。/);
  assert.match(nodes[2], /圖說是否缺漏？[\s\S]*?報價寫到的工作，圖面有沒有交代；[\s\S]*?圖面畫到的內容，報價有沒有列入，都需要互相對照。/);
  assert.match(nodes[3], /追加是否正常？[\s\S]*?追加提出時，要先對回原報價、圖說與約定範圍。[\s\S]*?確認這是新增工作，還是原本就應該包含的內容。/);
  assert.match(nodes[4], /class="decision-node decision-node--left decision-node--action"[\s\S]*?<h3>合約是否公平？<\/h3>[\s\S]*?定型化契約與乙方提供的契約版本，每期付款金額過大，這是所有屋主在契約上的痛點。/);
  assert.ok(nodes.every((node) => /class="decision-node__ring"[\s\S]*?class="decision-node__core"/.test(node)));
  assert.match(decisionSection, /class="decision-convergence"/);
  assert.match(decisionSection, /這些專業問題，先讓萊比幫你對回書面依據。/);
  assert.match(decisionSection, /DRS 不替你猜，也不替任何一方說話。/);
  assert.match(decisionSection, /它會整理哪些內容已有依據、哪些資訊仍有缺漏，以及下一步需要誰補充，讓你不必只靠口頭解釋做決定。/);
  assert.match(decisionSection, /class="decision-path__arrow"/);
  assert.match(decisionSection, /class="decision-cta__microcopy">先從手上的報價單與施工圖開始<\/p>/);
  assert.match(decisionSection, /data-route="quoteCheck"[\s\S]*?href="\.\.\/quote_check\/code\.html"[\s\S]*?<span class="decision-cta__primary-label">直接試做報價健檢<\/span>[\s\S]*?<\/a>/);
  assert.match(decisionSection, /<a class="decision-cta__secondary decision-cta__glass decision-cta__glass--info" href="#pcm-scope">[\s\S]*?先看 DRS 如何核對[\s\S]*?<\/a>/);
  assert.doesNotMatch(decisionSection, /關於萊比？/);
  assert.match(css, /\.hero\s*\{[^}]*width:\s*min\(calc\(100% - 40px\),\s*1480px\);[^}]*min-height:\s*calc\(100svh - var\(--header-height\)\);[^}]*grid-template-columns:\s*minmax\(0,\s*62fr\)\s+minmax\(0,\s*38fr\)/s);
  assert.match(css, /\.decision-prompts-section\s*\{[^}]*--decision-node:\s*var\(--chapter-step-03\);[^}]*--decision-line:\s*rgba\(201,\s*209,\s*215,\s*0\.3\);[^}]*--decision-ink:\s*var\(--chapter-ink\);[^}]*--decision-muted:\s*var\(--chapter-copy\);[^}]*--decision-glass-cyan:\s*rgba\(79,\s*133,\s*154,\s*0\.26\);[^}]*--decision-glass-warm:\s*rgba\(255,\s*138,\s*28,\s*0\.12\);/is);
  assert.match(css, /\.decision-prompts-section\s*\{[^}]*scroll-margin-top:\s*calc\(var\(--header-height\)\s*\+\s*80px\)/s);
  assert.match(css, /\.decision-path__questions-stage\s*\{[^}]*position:\s*relative/s);
  assert.match(css, /\.decision-path__spine\s*\{[^}]*bottom:\s*calc\(-1\s*\*\s*clamp\(74px,\s*7\.5vw,\s*98px\)\)[^}]*left:\s*50%;[^}]*background:\s*var\(--decision-line\)[^}]*animation:\s*decision-spine-draw/s);
  assert.match(css, /\.decision-node\s*\{[^}]*grid-template-columns:\s*minmax\(0,\s*1fr\)\s+clamp\(72px,\s*7vw,\s*92px\)\s+minmax\(0,\s*1fr\)/s);
  assert.match(css, /\.decision-node--left\s+\.decision-node__copy\s*\{[^}]*grid-column:\s*1/s);
  assert.match(css, /\.decision-node--right\s+\.decision-node__copy\s*\{[^}]*grid-column:\s*3/s);
  assert.match(css, /\.decision-node__copy\s*\{[^}]*border:\s*0;[^}]*background:\s*transparent/s);
  assert.match(css, /\.decision-node\s*\{[^}]*--decision-title-line-y:\s*clamp\(81px,\s*calc\(61px\s*\+\s*2\.25vw\),\s*96px\)/s);
  assert.match(css, /\.decision-node__copy h3::after\s*\{[^}]*bottom:\s*0[^}]*height:\s*1px[^}]*background:\s*linear-gradient[^}]*animation:\s*decision-branch-draw/s);
  assert.match(css, /\.decision-node--left\s+\.decision-node__copy h3::after\s*\{[^}]*left:\s*0[^}]*width:\s*calc\(100%\s*\+\s*clamp\(30px,\s*3\.2vw,\s*44px\)\)/s);
  assert.match(css, /\.decision-node--right\s+\.decision-node__copy h3::after\s*\{[^}]*right:\s*0[^}]*width:\s*calc\(100%\s*\+\s*clamp\(30px,\s*3\.2vw,\s*44px\)\)/s);
  assert.match(css, /\.decision-node__ring,\s*\.decision-convergence__ring\s*\{[^}]*border:\s*1px\s+solid\s+color-mix\(in srgb, var\(--decision-step, var\(--chapter-step-03\)\) 58%, var\(--chapter-copy\)\)[^}]*background:[^}]*radial-gradient\(circle at 68% 76%,\s*var\(--decision-glass-cyan\),\s*transparent 42%\)[^}]*box-shadow:[^}]*0 0 18px color-mix\(in srgb, var\(--decision-step, var\(--chapter-step-03\)\) 20%, transparent\)[^}]*backdrop-filter:\s*blur\(8px\)\s+saturate\(150%\)/s);
  assert.match(css, /\.decision-node__ring::before,\s*\.decision-convergence__ring::before\s*\{[^}]*background:\s*linear-gradient\(135deg,\s*rgba\(255,\s*255,\s*255,\s*0\.72\),\s*transparent 54%\)/s);
  assert.match(css, /\.decision-node__ring::after,\s*\.decision-convergence__ring::after\s*\{[^}]*filter:\s*blur\(8px\)[^}]*background:\s*conic-gradient/s);
  assert.match(css, /\.decision-node__core\s*\{[^}]*background:[^}]*radial-gradient\(circle at 68% 74%,\s*rgba\(93,\s*226,\s*236,\s*0\.48\),\s*transparent 46%\)/s);
  assert.match(css, /\.decision-node__ring\s*\{[^}]*margin-top:\s*calc\(var\(--decision-title-line-y\)\s*-\s*clamp\(21px,\s*2vw,\s*27px\)\)/s);
  assert.match(css, /\.decision-convergence\s*\{[^}]*text-align:\s*center/s);
  assert.match(css, /\.decision-convergence__copy\s*\{[^}]*position:\s*relative;[^}]*z-index:\s*2[^}]*background:\s*transparent/s);
  assert.match(css, /\.decision-path__arrow::before\s*\{[^}]*height:\s*30px[^}]*background:\s*var\(--decision-line\)/s);
  assert.match(css, /@keyframes\s+decision-spine-draw\s*\{/);
  assert.match(css, /@keyframes\s+decision-node-reveal\s*\{/);
  assert.doesNotMatch(css, /hero-question-flip|\.hero__questions|\.hero__decision-answer/);
  assert.match(
    css,
    /@media\s*\(max-width:\s*680px\)[\s\S]*?\.decision-path__spine\s*\{[^}]*bottom:\s*-62px;[^}]*left:\s*20px[\s\S]*?\.decision-node\s*\{[^}]*--decision-title-line-y:\s*81px;[^}]*grid-template-columns:\s*40px\s+minmax\(0,\s*1fr\)[\s\S]*?\.decision-node--left\s+\.decision-node__copy,[\s\S]*?\.decision-node--right\s+\.decision-node__copy\s*\{[^}]*grid-column:\s*2/s,
  );
  assert.match(css, /@media\s*\(max-width:\s*680px\)[\s\S]*?\.decision-node__ring\s*\{[^}]*margin-top:\s*calc\(var\(--decision-title-line-y\)\s*-\s*20px\)/s);
  assert.match(css, /@media\s*\(max-width:\s*680px\)[\s\S]*?\.decision-node--left\s+\.decision-node__copy h3::after,[\s\S]*?\.decision-node--right\s+\.decision-node__copy h3::after\s*\{[^}]*left:\s*-40px;[^}]*width:\s*calc\(100%\s*\+\s*40px\)/s);
  assert.match(css, /@media\s*\(max-width:\s*680px\)[\s\S]*?\.decision-prompts-section\s*\{[^}]*scroll-margin-top:\s*calc\(var\(--header-height\)\s*\+\s*120px\)/s);
  assert.match(css, /@media\s*\(prefers-reduced-motion:\s*reduce\)[\s\S]*?\.decision-path__spine,[\s\S]*?\.decision-node,[\s\S]*?\.decision-convergence,[\s\S]*?\.decision-cta\s*\{[^}]*animation:\s*none/s);
});

test("four decision branches end in aqua-glass actions with truthful destinations", async () => {
  const html = await readFile(htmlUrl, "utf8");
  const css = await readFile(cssUrl, "utf8");
  const decisionSection = readSection(html, "decision-prompts");
  assert.match(html, /href="\.\/styles\.css\?v=20260813-hero-subtitle-warm"/);
  const nodes = [...decisionSection.matchAll(/<li\b[^>]*class="decision-node decision-node--(?:left|right)(?: decision-node--action)?"[\s\S]*?<\/li>/g)].map(
    (match) => match[0],
  );
  const quoteTools = [...decisionSection.matchAll(
    /<a\b(?=[^>]*class="decision-node__tool")(?=[^>]*data-decision-tool)(?=[^>]*data-route="quoteCheck")(?=[^>]*href="\.\.\/quote_check\/code\.html")[^>]*>[\s\S]*?<\/a>/g,
  )].map((match) => match[0]);
  const contractTool = decisionSection.match(
    /<a\b(?=[^>]*class="decision-node__tool")(?=[^>]*data-decision-tool="contract")(?=[^>]*data-route="serviceContract")(?=[^>]*href="\.\.\/service_contract\/code\.html")[^>]*>[\s\S]*?<\/a>/,
  )?.[0] ?? "";
  const tools = [...quoteTools, contractTool].filter(Boolean);

  assert.equal(nodes.length, 5);
  assert.equal(quoteTools.length, 3);
  assert.equal(tools.length, 4);
  assert.deepEqual(
    tools.map((tool) => ({
      subject: tool.match(/<span class="decision-node__tool-subject">([^<]+)<\/span>/)?.[1],
      action: tool.match(/<span class="decision-node__tool-action">([^<]+)<\/span>/)?.[1],
    })),
    [
      { subject: "規格", action: "檢查" },
      { subject: "報價", action: "健檢" },
      { subject: "圖說", action: "檢查" },
      { subject: "訂製化", action: "合約" },
    ],
  );
  assert.ok(tools.every((tool) => /<svg\b[^>]*class="decision-node__tool-icon"[^>]*aria-hidden="true"/.test(tool)));
  assert.match(nodes[0], /<h3>材料是否安全？<\/h3>[\s\S]*?data-decision-tool="specification"/);
  assert.match(nodes[1], /<h3>報價合不合理？<\/h3>[\s\S]*?data-decision-tool="quote"/);
  assert.match(nodes[2], /<h3>圖說是否缺漏？<\/h3>[\s\S]*?data-decision-tool="drawing"/);
  assert.doesNotMatch(nodes[3], /decision-node__tool|data-decision-tool/);
  assert.match(nodes[4], /<h3>合約是否公平？<\/h3>[\s\S]*?data-decision-tool="contract"/);
  assert.match(css, /\.decision-node__heading\s*\{[^}]*display:\s*inline-flex;[^}]*align-items:\s*flex-end/s);
  assert.match(css, /\.decision-node__heading h3\s*\{[^}]*margin:\s*1em 0 0/s);
  const toolCss = css.match(/\.decision-node__tool\s*\{[^}]*\}/s)?.[0] ?? "";
  assert.match(toolCss, /--tool-glass:[^;]*var\(--decision-step\)/s);
  assert.match(toolCss, /display:\s*inline-flex;[\s\S]*?min-height:\s*48px/);
  assert.match(toolCss, /border-radius:\s*var\(--pill\);[\s\S]*?overflow:\s*hidden/);
  assert.match(toolCss, /radial-gradient\(ellipse at 50% 88%/);
  assert.match(toolCss, /linear-gradient\([\s\S]*?var\(--tool-glass\)/);
  assert.match(toolCss, /box-shadow:[\s\S]*?inset 0 -12px 14px/);
  assert.match(toolCss, /font-weight:\s*800;[\s\S]*?letter-spacing:\s*0\.065em/);
  assert.match(css, /\.decision-node__tool::before\s*\{[^}]*inset:\s*3px 8px 52%;[^}]*border-radius:[^}]*background:\s*linear-gradient\(180deg,[^}]*rgba\(255,\s*255,\s*255,\s*0\.82\)[^}]*content:\s*""/s);
  assert.match(css, /\.decision-node__tool::after\s*\{[^}]*inset:\s*auto 14% -13px;[^}]*height:\s*20px;[^}]*background:[^}]*var\(--tool-glow\)[^}]*filter:\s*blur\(8px\)/s);
  assert.match(css, /\.decision-node__tool-label\s*\{[^}]*display:\s*inline-flex;[^}]*align-items:\s*baseline;[^}]*gap:\s*0\.14em;[^}]*transform:\s*translateY\(-1px\);[^}]*text-shadow:[^}]*rgba\(0,\s*0,\s*0,\s*0\.54\)/s);
  assert.match(css, /\.decision-node__tool-subject\s*\{[^}]*color:\s*#fff;[^}]*font-weight:\s*900/s);
  assert.match(css, /\.decision-node__tool-action\s*\{[^}]*color:\s*rgba\(245,\s*251,\s*253,\s*0\.82\);[^}]*font-weight:\s*720/s);
  assert.match(css, /\.decision-node__tool-icon\s*\{[^}]*z-index:\s*1;[^}]*stroke-width:\s*2\.35/s);
  assert.match(css, /\.decision-node:nth-child\(5\)\s+\.decision-node__tool\s*\{[^}]*--tool-glass:/s);
  assert.match(css, /\.decision-node--left\s+\.decision-node__tool\s*\{[^}]*order:\s*-1/s);
  assert.match(css, /\.decision-node--action\s+\.decision-node__copy p\s*\{[^}]*margin-top:\s*clamp\(34px,\s*3vw,\s*42px\)/s);
  assert.match(css, /\.decision-node__tool:hover\s*\{[^}]*transform:\s*translateY\(calc\(50%\s*-\s*2px\)\)/s);
  assert.match(css, /\.decision-node__tool:focus-visible\s*\{[^}]*outline:\s*2px solid #fff/s);
  assert.match(css, /@media\s*\(max-width:\s*680px\)[\s\S]*?\.decision-node--left\s+\.decision-node__tool\s*\{[^}]*order:\s*0/s);
  assert.match(css, /@media\s*\(max-width:\s*360px\)[\s\S]*?\.decision-node__tool\s*\{[^}]*min-height:\s*38px;[^}]*font-size:\s*0\.68rem/s);
});

test("primary quote-check action extends the decision glass language in orange", async () => {
  const html = await readFile(htmlUrl, "utf8");
  const css = await readFile(cssUrl, "utf8");
  const decisionSection = readSection(html, "decision-prompts");
  const primaryAction = decisionSection.match(
    /<a\b(?=[^>]*class="button button--primary")(?=[^>]*data-route="quoteCheck")(?=[^>]*href="\.\.\/quote_check\/code\.html")[^>]*>[\s\S]*?<\/a>/,
  )?.[0] ?? "";
  const glassCss = css.match(/\.decision-cta\s+\.button--primary\s*\{[^}]*\}/s)?.[0] ?? "";

  assert.match(primaryAction, /<span class="decision-cta__primary-label">直接試做報價健檢<\/span>/);
  assert.match(primaryAction, /<span class="decision-cta__primary-arrow" aria-hidden="true">→<\/span>/);
  assert.match(glassCss, /--cta-glass:\s*#ff5809/);
  assert.match(glassCss, /overflow:\s*hidden/);
  assert.match(glassCss, /radial-gradient\(ellipse at 50% 88%/);
  assert.match(glassCss, /linear-gradient\([\s\S]*?var\(--cta-glass\)/);
  assert.match(glassCss, /box-shadow:[\s\S]*?inset 0 -12px 16px/);
  assert.match(glassCss, /backdrop-filter:\s*blur\(12px\)\s+saturate\(150%\)/);
  assert.match(css, /\.decision-cta\s+\.button--primary::before\s*\{[^}]*inset:\s*3px 10px 52%;[^}]*background:\s*linear-gradient\(180deg,[^}]*rgba\(255,\s*255,\s*255,\s*0\.78\)/s);
  assert.match(css, /\.decision-cta\s+\.button--primary::after\s*\{[^}]*background:\s*var\(--cta-glow\)[^}]*filter:\s*blur\(10px\)/s);
  assert.match(css, /\.decision-cta__primary-label,\s*\.decision-cta__primary-arrow\s*\{[^}]*z-index:\s*1/s);
  assert.match(css, /\.decision-cta\s+\.button--primary:hover\s+\.decision-cta__primary-arrow,[\s\S]*?\.decision-cta\s+\.button--primary:focus-visible\s+\.decision-cta__primary-arrow\s*\{[^}]*transform:\s*translateX\(3px\)/s);
});

test("secondary DRS action keeps one restrained informational glass treatment", async () => {
  const html = await readFile(htmlUrl, "utf8");
  const css = await readFile(cssUrl, "utf8");
  const decisionSection = readSection(html, "decision-prompts");
  const glassActions = [...decisionSection.matchAll(
    /<a\b(?=[^>]*class="decision-cta__secondary decision-cta__glass decision-cta__glass--info")(?=[^>]*href="#pcm-scope")[^>]*>[\s\S]*?<\/a>/g,
  )].map((match) => match[0]);
  const glassCss = css.match(/\.decision-cta__glass\s*\{[^}]*\}/s)?.[0] ?? "";

  assert.equal(glassActions.length, 1);
  assert.match(glassActions[0], /decision-cta__glass--info[\s\S]*?<span class="decision-cta__glass-label">先看 DRS 如何核對<\/span>[\s\S]*?<span class="decision-cta__glass-arrow" aria-hidden="true">→<\/span>/);
  assert.match(css, /\.decision-cta__glass--info\s*\{[^}]*--cta-glass:\s*#335875/s);
  assert.doesNotMatch(decisionSection, /decision-cta__tertiary|decision-cta__glass--pink|decision-cta__glass--purple/);
  assert.match(glassCss, /min-width:\s*min\(100%,\s*292px\)/);
  assert.match(glassCss, /min-height:\s*52px/);
  assert.match(glassCss, /overflow:\s*hidden/);
  assert.match(glassCss, /radial-gradient\(ellipse at 50% 88%/);
  assert.match(glassCss, /box-shadow:[\s\S]*?inset 0 -11px 15px/);
  assert.match(glassCss, /backdrop-filter:\s*blur\(12px\)\s+saturate\(150%\)/);
  assert.match(css, /\.decision-cta__glass::before\s*\{[^}]*inset:\s*3px 9px 52%;[^}]*rgba\(255,\s*255,\s*255,\s*0\.76\)/s);
  assert.match(css, /\.decision-cta__glass::after\s*\{[^}]*background:\s*var\(--cta-glow\)[^}]*filter:\s*blur\(9px\)/s);
  assert.match(css, /\.decision-cta__glass:hover\s+\.decision-cta__glass-arrow,[\s\S]*?\.decision-cta__glass:focus-visible\s+\.decision-cta__glass-arrow\s*\{[^}]*transform:\s*translateX\(3px\)/s);
});

test("header starts fail closed and delegates the canonical shared account entry to route binding", async () => {
  const html = await readFile(htmlUrl, "utf8");
  const header = html.match(/<header\b[\s\S]*?<\/header>/)?.[0] ?? "";
  const accountEntry = header.match(
    /<a\b(?=[^>]*data-account-entry)(?=[^>]*data-route="accountAccess")(?=[^>]*data-canonical-route="\/account\/access")[^>]*>[\s\S]*?註冊／登入[\s\S]*?<\/a>/,
  )?.[0] ?? "";

  assert.notEqual(accountEntry, "");
  assert.match(accountEntry, /aria-disabled="true"/);
  assert.match(accountEntry, /tabindex="-1"/);
  assert.match(accountEntry, /data-route-state="planned"/);
  assert.doesNotMatch(accountEntry, /\shref=/);
});

test("mobile header keeps only the primary audit and account actions visible", async () => {
  const html = await readFile(htmlUrl, "utf8");
  const css = await readFile(cssUrl, "utf8");
  const header = html.match(/<header\b[\s\S]*?<\/header>/)?.[0] ?? "";
  const actions = [...header.matchAll(/class="header-action(?: [^"]*)?"/g)];

  assert.equal(actions.length, 4);
  assert.match(header, /開始健檢/);
  assert.match(header, /註冊／登入/);
  assert.match(header, /關於DRS/);
  assert.match(header, /DRS服務合約/);
  assert.doesNotMatch(header, /header-action--workspace|工作台[\s\S]*?甲／乙方/);
  assert.doesNotMatch(header, /完整流程|合作方式|里程碑治理|申請 Email 一次性登入|甲方登入／乙方受邀/);
  assert.match(css, /\.header-actions\s*\{[^}]*margin-left:\s*auto[^}]*justify-content:\s*flex-end/s);
  assert.match(css, /\.header-action\s*\{[^}]*flex:\s*0\s+0\s+auto[^}]*width:\s*auto/s);
  assert.match(css, /@media\s*\(max-width:\s*620px\)[\s\S]*?\.site-header\s*\{[^}]*height:\s*72px[^}]*flex-wrap:\s*nowrap[\s\S]*?\.header-actions\s*\{[^}]*display:\s*flex[\s\S]*?\.header-action--context\s*\{[^}]*display:\s*none/s);
  assert.doesNotMatch(css, /@media\s*\(max-width:\s*620px\)[\s\S]*?\.header-action\s*\{[^}]*width:\s*100%/s);
});

test("route binding activates only routes with a real href", async () => {
  const { bindPublicRoutes } = await import(`${appUrl.href}?bind=${Date.now()}`);
  const planned = makeRouteControl("quoteCheck");
  const active = makeRouteControl("serviceContract");
  const root = { querySelectorAll: () => [planned, active] };

  bindPublicRoutes(root, {
    quoteCheck: null,
    serviceContract: "../service_contract/code.html",
  });

  assert.equal(planned.getAttribute("href"), null);
  assert.equal(planned.getAttribute("aria-disabled"), "true");
  assert.equal(planned.getAttribute("tabindex"), "-1");
  assert.equal(planned.dataset.routeState, "planned");
  assert.equal(active.getAttribute("href"), "../service_contract/code.html");
  assert.equal(active.getAttribute("aria-disabled"), null);
  assert.equal(active.getAttribute("tabindex"), null);
  assert.equal(active.dataset.routeState, "active");
});

test("route binding rejects inherited, non-string, non-local, and unknown href values", async () => {
  const { bindPublicRoutes } = await import(`${appUrl.href}?closed=${Date.now()}`);
  const cases = [
    { control: makeRouteControl("quoteCheck"), routes: Object.create({ quoteCheck: "javascript:alert(1)" }) },
    { control: makeRouteControl("quoteCheck"), routes: { quoteCheck: "javascript:alert(1)" } },
    { control: makeRouteControl("quoteCheck"), routes: { quoteCheck: { href: "../quote_check/code.html" } } },
    { control: makeRouteControl("quoteCheck"), routes: { quoteCheck: " ../quote_check/code.html" } },
    { control: makeRouteControl("unknownRoute"), routes: { serviceContract: "../service_contract/code.html" } },
  ];

  for (const item of cases) {
    bindPublicRoutes({ querySelectorAll: () => [item.control] }, item.routes);
    assert.equal(item.control.getAttribute("href"), null);
    assert.equal(item.control.getAttribute("aria-disabled"), "true");
    assert.equal(item.control.dataset.routeState, "planned");
  }
});

test("route binding uses module-load captured DOM methods for exact href writes and closed removal", async () => {
  const { bindPublicRoutes } = await import(`${appUrl.href}?dom-methods=${Date.now()}`);
  const setDescriptor = Object.getOwnPropertyDescriptor(RouteTestElement.prototype, "setAttribute");
  const removeDescriptor = Object.getOwnPropertyDescriptor(RouteTestElement.prototype, "removeAttribute");
  const getDescriptor = Object.getOwnPropertyDescriptor(RouteTestElement.prototype, "getAttribute");
  const trusted = makeRouteControl("accountAccess");
  const closed = makeRouteControl("unknownRoute");
  closed.attributes.set("href", "javascript:alert(2)");
  let poisonedSetCalls = 0;
  let poisonedRemoveCalls = 0;
  let poisonedGetCalls = 0;

  try {
    Object.defineProperty(RouteTestElement.prototype, "setAttribute", {
      ...setDescriptor,
      value(name, value) {
        poisonedSetCalls += 1;
        this.attributes.set(name, name === "href" ? "javascript:alert(1)" : String(value));
      },
    });
    Object.defineProperty(RouteTestElement.prototype, "removeAttribute", {
      ...removeDescriptor,
      value() {
        poisonedRemoveCalls += 1;
      },
    });
    Object.defineProperty(RouteTestElement.prototype, "getAttribute", {
      ...getDescriptor,
      value() {
        poisonedGetCalls += 1;
        return "javascript:alert(3)";
      },
    });

    assert.doesNotThrow(() => {
      bindPublicRoutes(
        { querySelectorAll: () => [trusted, closed] },
        { accountAccess: "../account_access/code.html" },
      );
    });

    assert.equal(trusted.attributes.get("href"), "../account_access/code.html");
    assert.equal(trusted.attributes.has("aria-disabled"), false);
    assert.equal(trusted.attributes.has("tabindex"), false);
    assert.equal(trusted.attributes.get("data-route-state"), "active");
    assert.equal(closed.attributes.has("href"), false);
    assert.equal(closed.attributes.get("aria-disabled"), "true");
    assert.equal(closed.attributes.get("tabindex"), "-1");
    assert.equal(closed.attributes.get("data-route-state"), "planned");
    assert.equal(poisonedSetCalls, 0);
    assert.equal(poisonedRemoveCalls, 0);
    assert.equal(poisonedGetCalls, 0);

    const throwingTrusted = makeRouteControl("accountAccess");
    const throwingClosed = makeRouteControl("unknownRoute");
    throwingClosed.attributes.set("href", "data:text/html,unsafe");
    Object.defineProperty(RouteTestElement.prototype, "setAttribute", {
      ...setDescriptor,
      value() {
        throw new Error("polluted setAttribute");
      },
    });
    Object.defineProperty(RouteTestElement.prototype, "removeAttribute", {
      ...removeDescriptor,
      value() {
        throw new Error("polluted removeAttribute");
      },
    });
    Object.defineProperty(RouteTestElement.prototype, "getAttribute", {
      ...getDescriptor,
      value() {
        throw new Error("polluted getAttribute");
      },
    });

    assert.doesNotThrow(() => {
      bindPublicRoutes(
        { querySelectorAll: () => [throwingTrusted, throwingClosed] },
        { accountAccess: "../account_access/code.html" },
      );
    });
    assert.equal(throwingTrusted.attributes.get("href"), "../account_access/code.html");
    assert.equal(throwingTrusted.attributes.get("data-route-state"), "active");
    assert.equal(throwingClosed.attributes.has("href"), false);
    assert.equal(throwingClosed.attributes.get("aria-disabled"), "true");
    assert.equal(throwingClosed.attributes.get("tabindex"), "-1");
    assert.equal(throwingClosed.attributes.get("data-route-state"), "planned");
  } finally {
    Object.defineProperty(RouteTestElement.prototype, "setAttribute", setDescriptor);
    Object.defineProperty(RouteTestElement.prototype, "removeAttribute", removeDescriptor);
    Object.defineProperty(RouteTestElement.prototype, "getAttribute", getDescriptor);
  }
});

test("route binding ignores post-load shared intrinsic and collection forEach pollution", async () => {
  const { bindPublicRoutes } = await import(`${appUrl.href}?intrinsics=${Date.now()}`);
  const trimDescriptor = Object.getOwnPropertyDescriptor(String.prototype, "trim");
  const testDescriptor = Object.getOwnPropertyDescriptor(RegExp.prototype, "test");
  const arrayForEachDescriptor = Object.getOwnPropertyDescriptor(Array.prototype, "forEach");
  let trimCalls = 0;
  let regexpCalls = 0;
  let nodeListForEachReads = 0;

  try {
    Object.defineProperty(String.prototype, "trim", {
      ...trimDescriptor,
      value() {
        trimCalls += 1;
        throw new Error("polluted String.prototype.trim");
      },
    });
    Object.defineProperty(RegExp.prototype, "test", {
      ...testDescriptor,
      value() {
        regexpCalls += 1;
        throw new Error("polluted RegExp.prototype.test");
      },
    });
    Object.defineProperty(Array.prototype, "forEach", {
      ...arrayForEachDescriptor,
      value() {
        throw new Error("polluted Array.prototype.forEach");
      },
    });

    const arrayControl = makeRouteControl("serviceContract");
    assert.doesNotThrow(() => {
      bindPublicRoutes(
        { querySelectorAll: () => [arrayControl] },
        { serviceContract: "https://untrusted.example/contract" },
      );
    });
    assertRouteClosed(arrayControl);

    const nodeListControl = makeRouteControl("serviceContract");
    const pollutedNodeListPrototype = Object.create(null, {
      forEach: {
        configurable: true,
        get() {
          nodeListForEachReads += 1;
          throw new Error("polluted NodeList.prototype.forEach");
        },
      },
    });
    const nodeListLike = Object.create(pollutedNodeListPrototype);
    nodeListLike[0] = nodeListControl;
    nodeListLike.length = 1;
    assert.doesNotThrow(() => {
      bindPublicRoutes(
        { querySelectorAll: () => nodeListLike },
        { serviceContract: "https://untrusted.example/contract" },
      );
    });
    assertRouteClosed(nodeListControl);
    assert.equal(nodeListForEachReads, 0);
    assert.equal(trimCalls, 0);
    assert.equal(regexpCalls, 0);
  } finally {
    Object.defineProperty(String.prototype, "trim", trimDescriptor);
    Object.defineProperty(RegExp.prototype, "test", testDescriptor);
    Object.defineProperty(Array.prototype, "forEach", arrayForEachDescriptor);
  }
});

test("route binding requires an exact trusted route name and href pair", async () => {
  const { bindPublicRoutes } = await import(`${appUrl.href}?trusted=${Date.now()}`);
  const closedCases = [
    ["unknownRoute", "../service_contract/code.html"],
    ["serviceContract", "../../../../outside.html"],
    ["process", "#missing-fragment"],
    ["serviceContract", "http://untrusted.example/contract"],
    ["serviceContract", "https://untrusted.example/contract"],
    ["serviceContract", "data:text/html,untrusted"],
    ["serviceContract", "javascript:alert(1)"],
  ];

  for (const [routeName, candidateHref] of closedCases) {
    const control = makeRouteControl(routeName);
    bindPublicRoutes(
      { querySelectorAll: () => [control] },
      { [routeName]: candidateHref },
    );
    assertRouteClosed(control);
  }

  const active = makeRouteControl("serviceContract");
  bindPublicRoutes(
    { querySelectorAll: () => [active] },
    { serviceContract: "../service_contract/code.html" },
  );
  assert.equal(active.getAttribute("href"), "../service_contract/code.html");
  assert.equal(active.getAttribute("aria-disabled"), null);
  assert.equal(active.getAttribute("tabindex"), null);
  assert.equal(active.dataset.routeState, "active");

  const activeQuote = makeRouteControl("quoteCheck");
  bindPublicRoutes(
    { querySelectorAll: () => [activeQuote] },
    { quoteCheck: "../quote_check/code.html" },
  );
  assert.equal(activeQuote.getAttribute("href"), "../quote_check/code.html");
  assert.equal(activeQuote.getAttribute("aria-disabled"), null);
  assert.equal(activeQuote.getAttribute("tabindex"), null);
  assert.equal(activeQuote.dataset.routeState, "active");

  const activeDrawing = makeRouteControl("drawingCheck");
  bindPublicRoutes(
    { querySelectorAll: () => [activeDrawing] },
    { drawingCheck: "../drawing_check/code.html" },
  );
  assert.equal(activeDrawing.getAttribute("href"), "../drawing_check/code.html");
  assert.equal(activeDrawing.getAttribute("aria-disabled"), null);
  assert.equal(activeDrawing.getAttribute("tabindex"), null);
  assert.equal(activeDrawing.dataset.routeState, "active");

  const appSource = await readFile(appUrl, "utf8");
  assert.match(appSource, /case "quoteCheck":/);
  assert.match(appSource, /case "drawingCheck":/);
});

test("footer links only to the visible DRS decision narrative sections", async () => {
  const html = await readFile(htmlUrl, "utf8");
  const footer = html.match(/<footer\b[\s\S]*?<\/footer>/)?.[0] ?? "";

  assert.match(footer, /href="#pcm-scope"[^>]*>\s*DRS 怎麼運作\s*<\/a>/);
  assert.match(footer, /href="#case-flow"[^>]*>\s*持續核對\s*<\/a>/);
  assert.match(footer, /href="#cooperation-scope"[^>]*>\s*三方分工\s*<\/a>/);
  assert.match(html, /<section\s+id="pcm-scope"/);
  assert.match(html, /<section\s+id="case-flow"/);
  assert.match(html, /<section\s+id="cooperation-scope"/);
});

test("T5 DOM-method correction receipts stay bound to the admitted immutable evidence commit", () => {
  const repositoryRoot = new URL("../", import.meta.url);
  const gitText = (...args) => execFileSync("git", args, {
    cwd: repositoryRoot,
    encoding: "utf8",
  }).trim();
  const reviewTarget = "64539be0b93170a916106dbd61e9ca5841f83b2b";
  const manifestPath = "docs/governance/pcm-owner-first-execution-manifest.v1.json";
  const manifestBytes = execFileSync(
    "git",
    ["show", `${reviewTarget}:${manifestPath}`],
    { cwd: repositoryRoot, encoding: null },
  );
  const manifest = JSON.parse(manifestBytes.toString("utf8"));
  const correction = manifest.t5SourceIntegration.domMethodCorrection;
  const expectedPaths = [
    "tests/pcm-owner-first-public-home.test.mjs",
    "docs/governance/pcm-owner-first-execution-manifest.v1.json",
    "docs/superpowers/specs/2026-08-03-pcm-owner-first-full-site-design.md",
    "docs/superpowers/plans/2026-08-03-laibe-pcm-end-to-end-flow-integration.md",
  ].sort();

  assert.equal(
    correction.reviewTarget,
    "CORRECTION_COMMIT_CONTAINING_THIS_MANIFEST",
  );
  assert.equal(correction.correctionParent, "b64238044b480e5570ef99dbc7a807e59b893b6e");
  assert.equal(gitText("rev-parse", `${reviewTarget}^`), correction.correctionParent);
  assert.deepEqual([...correction.writeSet].sort(), expectedPaths);
  assert.equal(correction.outsideWriteSet, 0);
  const changedPaths = gitText(
    "diff",
    "--name-only",
    `${correction.correctionParent}..${reviewTarget}`,
  ).split(/\r?\n/u).filter(Boolean).sort();
  assert.deepEqual(changedPaths, expectedPaths);
  assert.deepEqual(correction.red, {
    command:
      "node --test --test-name-pattern='T5 DOM-method correction receipts' tests/pcm-owner-first-public-home.test.mjs",
    tests: 1,
    passed: 0,
    failed: 1,
    exitCode: 1,
    actualFailure:
      "receipt verifier read mutable checkout bytes and lacked immutable review-target provenance",
  });
  assert.deepEqual(correction.focusedGreen, {
    command:
      "node --test tests/pcm-owner-first-route-manifest.test.mjs tests/pcm-owner-first-public-home.test.mjs",
    tests: 36,
    passed: 36,
    failed: 0,
    exitCode: 0,
  });
  assert.deepEqual(correction.fullSuite, {
    command: "fresh enumeration of tests/pcm-*.test.mjs",
    files: 13,
    tests: 243,
    passed: 243,
    failed: 0,
    exitCode: 0,
  });

  assert.deepEqual(
    correction.artifactReceipts.map((receipt) => receipt.path).sort(),
    expectedPaths.filter((path) => path !== manifestPath),
  );

  const verifyImmutableReceipt = (receipt) => {
    assert.equal(receipt.scope, "review_target_commit_blob_bytes", receipt.path);
    assert.doesNotThrow(() => execFileSync(
      "git",
      ["cat-file", "-e", `${receipt.gitBlobSha1}^{blob}`],
      { cwd: repositoryRoot, stdio: "pipe" },
    ));
    const commitBlob = gitText("rev-parse", `${reviewTarget}:${receipt.path}`);
    assert.equal(commitBlob, receipt.gitBlobSha1, receipt.path);
    const bytes = execFileSync("git", ["cat-file", "blob", receipt.gitBlobSha1], {
      cwd: repositoryRoot,
      encoding: null,
    });
    const sha256 = createHash("sha256").update(bytes).digest("hex");
    const gitBlobSha1 = createHash("sha1")
      .update(`blob ${bytes.length}\0`)
      .update(bytes)
      .digest("hex");
    assert.equal(receipt.bytes, bytes.length, receipt.path);
    assert.equal(receipt.sha256, sha256, receipt.path);
    assert.equal(receipt.gitBlobSha1, gitBlobSha1, receipt.path);
    return bytes;
  };

  for (const receipt of correction.artifactReceipts) {
    const immutableBytes = verifyImmutableReceipt(receipt);
    const inMemoryDrift = Buffer.concat([
      immutableBytes,
      Buffer.from("\nMUTABLE_CHECKOUT_DRIFT", "utf8"),
    ]);
    assert.notEqual(
      createHash("sha256").update(inMemoryDrift).digest("hex"),
      receipt.sha256,
      receipt.path,
    );
    assert.deepEqual(verifyImmutableReceipt(receipt), immutableBytes, receipt.path);
  }

  const firstReceipt = correction.artifactReceipts[0];
  const secondReceipt = correction.artifactReceipts[1];
  assert.throws(
    () => verifyImmutableReceipt({
      ...firstReceipt,
      gitBlobSha1: secondReceipt.gitBlobSha1,
    }),
    { name: "AssertionError" },
  );
  assert.throws(
    () => verifyImmutableReceipt({
      ...firstReceipt,
      gitBlobSha1: "f".repeat(40),
    }),
  );

  const normalized = JSON.parse(manifestBytes.toString("utf8"));
  normalized.t3.selfRecorderReceipt.sha256 = "0".repeat(64);
  normalized.t3.selfRecorderReceipt.gitBlobSha1 = "0".repeat(40);
  const normalizedBytes = Buffer.from(`${JSON.stringify(normalized, null, 2)}\n`, "utf8");
  const selfReceipt = manifest.t3.selfRecorderReceipt;
  assert.equal(selfReceipt.bytes, manifestBytes.length);
  assert.equal(selfReceipt.normalizedBytes, normalizedBytes.length);
  assert.equal(
    selfReceipt.sha256,
    createHash("sha256").update(normalizedBytes).digest("hex"),
  );
  assert.equal(
    selfReceipt.gitBlobSha1,
    createHash("sha1")
      .update(`blob ${normalizedBytes.length}\0`)
      .update(normalizedBytes)
      .digest("hex"),
  );
});

test("T2 evidence distinguishes current exact-five writes from the authorized historical hold", async () => {
  const manifest = JSON.parse(await readFile(governanceUrl, "utf8"));

  assert.equal(manifest.t2.outsideWriteSet, 0);
  assert.equal(manifest.t2.outsideWriteSetScope, "current_repository_git_diff_only");
  assert.equal(manifest.t2.recovery.currentWrite, false);
  assert.equal(manifest.t2.recovery.classification, "authorized_historical_external_hold");
});

test("T2 correction evidence is bound to its immutable admitted commit", async () => {
  const manifest = JSON.parse(await readFile(governanceUrl, "utf8"));
  const plan = await readFile(planUrl, "utf8");
  const expectedPaths = [
    "src/stitch_laibe_landing_onboarding/pcm_standalone/public_home/app.js",
    "src/stitch_laibe_landing_onboarding/pcm_standalone/public_home/code.html",
    "tests/pcm-owner-first-public-home.test.mjs",
    "docs/governance/pcm-owner-first-execution-manifest.v1.json",
    "docs/superpowers/plans/2026-08-03-laibe-pcm-end-to-end-flow-integration.md",
  ].sort();
  const correction = manifest.t2Correction;

  assert.equal(correction.status, "admitted_g1_ui_source_only_historical");
  assert.equal(correction.commit, "3c525bb6625e8a6a8c30fecc1f9b7f506f313ad7");
  assert.equal(correction.tree, "44ab599c45d6f167cb171846e345761f75fe0937");
  assert.equal(correction.parent, "ba22b765c727732b774a60259f111ac6a361f941");
  const repositoryRoot = new URL("../", import.meta.url);
  const gitText = (...args) => execFileSync("git", args, {
    cwd: repositoryRoot,
    encoding: "utf8",
  }).trim();
  assert.equal(gitText("rev-parse", `${correction.commit}^`), correction.parent);
  assert.equal(gitText("show", "-s", "--format=%T", correction.commit), correction.tree);
  assert.equal(
    gitText("show", "-s", "--format=%T", correction.parent),
    correction.parentTree,
  );
  assert.deepEqual([...correction.writeSet].sort(), expectedPaths);
  assert.equal(correction.outsideWriteSet, 0);
  assert.ok(correction.tdd.red.failed > 0);
  assert.equal(correction.tdd.red.exitCode, 1);
  assert.equal(correction.tdd.green.failed, 0);
  assert.equal(correction.tdd.green.exitCode, 0);

  const receipts = [
    ...correction.artifactReceipts,
    correction.selfRecorderReceipt,
  ];
  assert.deepEqual(receipts.map((receipt) => receipt.path).sort(), expectedPaths);
  assert.equal(correction.receiptConvention.artifactScope, "immutable_t2_commit_blobs");
  assert.equal(correction.receiptConvention.immutableCommit, correction.commit);
  const expectedBlobs = new Map([
    ["src/stitch_laibe_landing_onboarding/pcm_standalone/public_home/app.js", "6f016dbe23c4da7ac2496c90e4e34edb4305f25e"],
    ["src/stitch_laibe_landing_onboarding/pcm_standalone/public_home/code.html", "ff81381c3ae98bbbd3fb3e5934f2c232e025a696"],
    ["tests/pcm-owner-first-public-home.test.mjs", "a926130d0dda76387d2e39c8b94948e146eeccc0"],
    ["docs/superpowers/plans/2026-08-03-laibe-pcm-end-to-end-flow-integration.md", "5a799ee533d4d624ab0ef03f70933dddb2b195aa"],
  ]);
  for (const receipt of correction.artifactReceipts) {
    const bytes = execFileSync("git", ["show", `${correction.commit}:${receipt.path}`], {
      cwd: repositoryRoot,
      encoding: null,
    });
    const sha256 = createHash("sha256").update(bytes).digest("hex");
    const gitBlobSha1 = createHash("sha1")
      .update(`blob ${bytes.length}\0`)
      .update(bytes)
      .digest("hex");
    assert.equal(receipt.bytes, bytes.length, receipt.path);
    assert.equal(receipt.sha256, sha256, receipt.path);
    assert.equal(receipt.gitBlobSha1, gitBlobSha1, receipt.path);
    assert.equal(receipt.gitBlobSha1, expectedBlobs.get(receipt.path), receipt.path);
    assert.equal(receipt.scope, "immutable_t2_commit_blob");
  }
  assert.equal(correction.selfRecorderReceipt.scope, "immutable_t2_commit_manifest_snapshot");
  const historicalManifestBytes = execFileSync(
    "git",
    ["show", `${correction.commit}:${correction.selfRecorderReceipt.path}`],
    { cwd: repositoryRoot, encoding: null },
  );
  const historicalManifest = JSON.parse(historicalManifestBytes.toString("utf8"));
  historicalManifest.t2Correction.selfRecorderReceipt.sha256 = "0".repeat(64);
  historicalManifest.t2Correction.selfRecorderReceipt.gitBlobSha1 = "0".repeat(40);
  const normalizedHistoricalBytes = Buffer.from(
    `${JSON.stringify(historicalManifest, null, 2)}\n`,
    "utf8",
  );
  assert.equal(correction.selfRecorderReceipt.bytes, historicalManifestBytes.length);
  assert.equal(
    correction.selfRecorderReceipt.normalizedBytes,
    normalizedHistoricalBytes.length,
  );
  assert.equal(
    correction.selfRecorderReceipt.sha256,
    createHash("sha256").update(normalizedHistoricalBytes).digest("hex"),
  );
  assert.equal(
    correction.selfRecorderReceipt.gitBlobSha1,
    createHash("sha1")
      .update(`blob ${normalizedHistoricalBytes.length}\0`)
      .update(normalizedHistoricalBytes)
      .digest("hex"),
  );
  assert.equal(
    correction.selfRecorderReceipt.snapshotGitBlobSha1,
    "26add6c71469cd15aaa7de7233a90396b32e021a",
  );

  const t2Plan = plan.match(/### Task T2:[\s\S]*?(?=\n---)/)?.[0] ?? "";
  assert.doesNotMatch(t2Plan, /Exact proposed write set|\- \[ \]/);
  assert.match(t2Plan, /Actual bounded correction write set/);
  for (const path of expectedPaths) {
    assert.match(t2Plan, new RegExp(path.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }
  assert.deepEqual(correction.freshVerification.focused, {
    tests: 16,
    passed: 16,
    failed: 0,
    exitCode: 0,
  });
  assert.deepEqual(correction.freshVerification.homepagePair, {
    tests: 38,
    passed: 38,
    failed: 0,
    exitCode: 0,
  });
  assert.deepEqual(correction.freshVerification.currentTrain, {
    files: 9,
    tests: 132,
    passed: 132,
    failed: 0,
    exitCode: 0,
  });
  assert.deepEqual(correction.freshVerification.fullSuiteTruth, {
    files: 10,
    tests: 153,
    passed: 152,
    failed: 1,
    exitCode: 1,
    onlyFailure:
      "tests/pcm-governance-pages.test.mjs frozen A3 cumulative-path admission assertion",
  });
  assert.match(t2Plan, /152\/153[\s\S]*frozen A3 cumulative-path/);
});

test("DRS responsibility boundary, final actions, local links, and accessible control floors remain truthful", async () => {
  const html = await readFile(htmlUrl, "utf8");
  const css = await readFile(cssUrl, "utf8");
  const visibleMarkup = html.replace(/<template\b[\s\S]*?<\/template>/gi, "");
  const visibleText = visibleMarkup.replace(/<[^>]+>/g, "").replace(/\s+/g, " ");

  assert.doesNotMatch(visibleText, /canonical/i);
  assert.match(
    visibleText,
    /DRS 提供書面資料審查與決策輔助，不代替甲乙雙方進行現場查驗，也不保證施工品質或取代法定專業判定/,
  );
  assert.doesNotMatch(
    visibleMarkup,
    /代收|不託管|付款授權|金流託管|代收代付|付款保障/,
  );
  assert.match(html, /DRS 替甲方把關，[\s\S]*但不替甲方作主/);
  assert.match(html, /DRS 提供書面資料審查與決策輔助，不代替甲乙雙方進行現場查驗/);
  assert.match(html, /id="final-action"[\s\S]*data-route="quoteCheck"[\s\S]*直接試做報價健檢[\s\S]*data-route="accountAccess"[\s\S]*登入／進入工作台/);
  assert.match(html, /\.\.\/shared\/owner-first-shell\.css/);
  const entryMinimum = css.match(
    /\.entry-choice\s*\{[^}]*min-height:\s*(\d+)px/,
  );
  assert.ok(Number(entryMinimum?.[1]) >= 44);
  assert.match(css, /@media\s*\(max-width:\s*768px\)/);
  assert.match(css, /@media\s*\(max-width:\s*420px\)/);

  for (const href of [...html.matchAll(/href="([^"]+)"/g)].map((match) => match[1])) {
    if (href.startsWith("#")) {
      assert.match(html, new RegExp(`id="${href.slice(1)}"`));
      continue;
    }
    await access(new URL(href.split("#")[0], htmlUrl));
  }
});

test("homepage consolidates the owner journey into one truthful conversion hierarchy", async () => {
  const [html, css] = await Promise.all([
    readFile(htmlUrl, "utf8"),
    readFile(cssUrl, "utf8"),
  ]);
  const ids = [
    "hero",
    "decision-prompts",
    "pcm-scope",
    "result-example",
    "workspace-preview",
    "case-flow",
    "cooperation-scope",
    "application-check",
    "final-action",
  ];
  const positions = ids.map((id) => html.indexOf(`id="${id}"`));
  const header = html.match(/<header\b[\s\S]*?<\/header>/)?.[0] ?? "";
  const decisionSection = readSection(html, "decision-prompts");
  const scopeSection = readSection(html, "pcm-scope");
  const finalSection = readSection(html, "final-action");
  const convergenceActions = [...decisionSection.matchAll(/<a\b[^>]*class="(?:button button--primary|decision-cta__secondary decision-cta__glass decision-cta__glass--info)"[^>]*>/g)];

  assert.ok(positions.every((position) => position >= 0));
  assert.deepEqual(positions, [...positions].sort((a, b) => a - b));
  assert.match(header, /class="header-action header-action--primary"[\s\S]*?data-route="quoteCheck"[\s\S]*?href="\.\.\/quote_check\/code\.html"[\s\S]*?>開始健檢<\/a>/);
  assert.match(header, /class="header-action header-action--account"[\s\S]*?data-account-entry[\s\S]*?>註冊／登入<\/a>/);
  assert.doesNotMatch(header, /header-action--workspace|<span>工作台<\/span>/);
  assert.equal(convergenceActions.length, 2);
  assert.match(decisionSection, /decision-cta__glass--info[\s\S]*?先看 DRS 如何核對/);
  assert.doesNotMatch(decisionSection, /decision-cta__tertiary|decision-cta__glass--pink|decision-cta__glass--purple/);
  assert.match(scopeSection, /依現有書面資料協助核對，不代替現場查驗與法定專業判定。/);
  assert.match(finalSection, /data-route="quoteCheck"[\s\S]*?href="\.\.\/quote_check\/code\.html"[\s\S]*?直接試做報價健檢/);
  assert.match(finalSection, /data-account-entry[\s\S]*?data-route="accountAccess"[\s\S]*?登入／進入工作台/);
  assert.match(css, /--bg-black:\s*#05080a/i);
  assert.match(css, /--accent-orange:\s*#ff5809/i);
  assert.match(css, /\.narrative-section--results,\s*\.narrative-section--decision\s*\{[^}]*background:[^;]*radial-gradient/s);
  assert.match(css, /\.application-check \.section-heading--split h2\s*\{[^}]*font-family:\s*"Noto Sans TC"/s);
  assert.match(css, /@media\s*\(max-width:\s*620px\)[\s\S]*?\.header-action--context\s*\{[^}]*display:\s*none/s);
  assert.match(css, /@media\s*\(max-width:\s*620px\)[\s\S]*?\.qualification-list\s*\{[^}]*width:\s*100%[^}]*gap:\s*12px/s);
  assert.match(css, /@media\s*\(max-width:\s*620px\)[\s\S]*?\.qualification-object\s*\{[^}]*min-height:\s*184px[^}]*aspect-ratio:\s*auto/s);
});
