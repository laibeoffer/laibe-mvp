import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

const packageUrl = new URL(
  "../src/stitch_laibe_landing_onboarding/pcm_standalone/",
  import.meta.url,
);

function readPcmFile(relativePath) {
  return readFile(new URL(relativePath, packageUrl), "utf8");
}

test("public contract exposes an owner-first entry and no public vendor intake", async () => {
  const { PUBLIC_IDENTITIES, PUBLIC_ROUTES } = await import(
    new URL("public/public-contract.js", packageUrl).href
  );

  assert.deepEqual(
    PUBLIC_IDENTITIES.map(({ id }) => id),
    ["owner"],
  );
  assert.deepEqual(Object.keys(PUBLIC_ROUTES).sort(), [
    "basicReport",
    "home",
    "process",
    "startCase",
  ]);
  assert.equal(PUBLIC_ROUTES.startCase, "../owner_start/code.html");
  assert.equal(PUBLIC_ROUTES.basicReport, "../basic_report/code.html");
  assert.equal(PUBLIC_ROUTES.process, "../public_home/code.html#case-flow");
  assert.equal(
    Object.values(PUBLIC_ROUTES).some((route) =>
      /(?:vendor_portal|vendor_(?:register|intake)|pcm.*(?:login|workspace))/i
        .test(route)
    ),
    false,
  );
});

test("superseded public portal candidates are absent and unreachable", async () => {
  for (
    const path of [
      "owner_portal/code.html",
      "vendor_portal/code.html",
      "public/portal.js",
      "public/portal.css",
    ]
  ) {
    await assert.rejects(access(new URL(path, packageUrl)), {
      code: "ENOENT",
    });
  }

  const contract = await readPcmFile("public/public-contract.js");
  assert.doesNotMatch(
    contract,
    /PORTAL_LANES|getPortalModel|signed_out|登入後/,
  );
});

test("public homepage sends every owner call to truthful application preparation", async () => {
  const html = await readPcmFile("public_home/code.html");

  assert.match(html, /assets\/logo\/laibe_offer\.svg/);
  assert.match(
    html,
    /在裝潢上，專業的事讓專業彼此核對。\s*重要的決定，由你來做。/,
  );
  assert.match(
    html,
    /PCM 是甲方的決策顧問，替你審查報價、圖說、追加與施工紀錄。先過濾差異與缺漏，再把清楚的結果交給你確認。/,
  );
  assert.doesNotMatch(
    html,
    /先把乙方報價與施工圖交給萊比，再決定要不要簽 PCM 服務/,
  );
  assert.equal((html.match(/data-kind="primary"/g) ?? []).length, 2);
  assert.equal((html.match(/查看申請與文件準備/g) ?? []).length, 3);
  assert.equal(
    (
      html.match(
        /data-kind="primary"[\s\S]{0,180}>[\s\n]*查看申請與文件準備[\s\n]*</g,
      ) ?? []
    ).length,
    2,
  );
  assert.equal(
    (html.match(/href="\.\.\/owner_start\/code\.html"/g) ?? []).length,
    3,
  );
  assert.match(
    html,
    /目前可查看申請條件與乙方報價單、施工圖兩份 PDF 的準備方式；正式註冊與文件收件開放後，才可送出。/,
  );
  assert.doesNotMatch(
    html,
    /註冊並上傳文件|立即送件|已可註冊|已可上傳/,
  );
});

test("public homepage puts the owner action before the pre-contract status and keeps CTA wording consistent", async () => {
  const html = await readPcmFile("public_home/code.html");
  const heroMarkup = html.match(
    /<section id="hero"[\s\S]*?<\/section>/,
  )?.[0] ?? "";
  const headerMarkup = html.match(
    /<header class="site-header"[\s\S]*?<\/header>/,
  )?.[0] ?? "";

  const leadIndex = heroMarkup.indexOf('class="hero__lead"');
  const actionsIndex = heroMarkup.indexOf('class="hero__actions"');
  const statusIndex = heroMarkup.indexOf("data-hero-status");

  assert.ok(leadIndex >= 0);
  assert.ok(actionsIndex > leadIndex);
  assert.ok(statusIndex > actionsIndex);
  assert.match(
    heroMarkup,
    /data-hero-status[\s\S]*目前可查看申請條件[\s\S]*正式註冊與文件收件開放後，才可送出/,
  );
  assert.match(
    headerMarkup,
    /data-route="startCase"[\s\S]{0,180}>[\s\n]*查看申請與文件準備[\s\n]*</,
  );
});

test("public homepage separates the six-step summary from the detailed traceable flow", async () => {
  const html = await readPcmFile("public_home/code.html");
  const processMarkup = html.match(
    /<div class="same-fact-rail"[\s\S]*?<\/ol>\s*<\/div>/,
  )?.[0] ?? "";
  const flowMarkup = html.match(
    /<section id="case-flow"[\s\S]*?<\/section>/,
  )?.[0] ?? "";

  assert.doesNotMatch(processMarkup, /<p>/);
  assert.equal((flowMarkup.match(/留下：/g) ?? []).length, 6);
  assert.equal((flowMarkup.match(/下一位：/g) ?? []).length, 6);
});

test("public homepage orders value, process, evidence, roles, and commercial details by owner intent", async () => {
  const html = await readPcmFile("public_home/code.html");
  const orderedSectionIds = [
    "pcm-scope",
    "case-flow",
    "workspace-preview",
    "role-entry",
    "service-fee",
  ];
  const positions = orderedSectionIds.map((id) =>
    html.indexOf(`id="${id}"`)
  );

  assert.ok(positions.every((position) => position >= 0));
  assert.deepEqual(positions, [...positions].sort((a, b) => a - b));
});

test("public homepage is owner-primary and makes the vendor invite-only", async () => {
  const html = await readPcmFile("public_home/code.html");

  assert.match(html, />主要服務對象</);
  assert.doesNotMatch(html, /選擇身分/);
  assert.match(html, /data-public-role="owner"/);
  assert.doesNotMatch(html, /data-public-role="vendor"/);
  assert.match(html, /PCM 獨立上線先服務甲方/);
  assert.match(html, /乙方不從公開頁接案或自行加入/);
  assert.match(html, /甲方完成 PCM 服務簽署後[\s\S]*邀請乙方/);
  assert.doesNotMatch(html, /href="[^"]*(?:owner_portal|vendor_portal)/);
  assert.doesNotMatch(
    html,
    /(?:PCM|AI PCM)[^<]{0,20}(?:登入|註冊|申請帳號|工作台入口)/i,
  );
});

test("public homepage states pre-contract upload requirements and basic-review boundary", async () => {
  const html = await readPcmFile("public_home/code.html");

  assert.match(html, /個人工作室／自然人簽約/);
  assert.match(html, /簽約前先提供乙方報價單與施工圖/);
  assert.match(html, /乙方報價單 PDF/);
  assert.match(html, /施工圖 PDF/);
  assert.match(html, /至少包含平面圖/);
  assert.match(html, /收到基本檢討後再決定/);
  assert.match(html, /看完報告後再決定是否簽約/);
  assert.match(
    html,
    /data-route="basicReport"[\s\S]{0,180}>[\s\n]*查看基本檢討報告格式[\s\n]*</,
  );
  assert.doesNotMatch(
    html,
    /服務提供者(?:姓名|名稱)[：:]\s*[^<\s]+|09\d{8}|[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}/,
  );
});

test("basic-review separates four report outputs from the owner's next action", async () => {
  const html = await readPcmFile("public_home/code.html");
  const css = await readPcmFile("public_home/styles.css");
  const outputMarkup = html.match(
    /<ul class="output-list"[\s\S]*?<\/ul>/,
  )?.[0] ?? "";

  assert.equal(
    (outputMarkup.match(/class="output-list__number"/g) ?? []).length,
    4,
  );
  assert.equal(
    (outputMarkup.match(/class="output-list__icon"/g) ?? []).length,
    4,
  );
  assert.equal(
    (outputMarkup.match(/class="output-list__copy"/g) ?? []).length,
    4,
  );
  assert.deepEqual(
    [...outputMarkup.matchAll(
      /class="output-list__number"[^>]*>(\d)<\/span>/g,
    )].map(([, number]) => number),
    ["1", "2", "3", "4"],
  );
  for (
    const title of [
      "文件完整性",
      "範圍對照",
      "初步風險",
      "補件清單",
    ]
  ) {
    assert.match(outputMarkup, new RegExp(`<strong>${title}</strong>`));
  }

  for (
    const color of [
      "#ffc44d",
      "#ff666b",
      "#58a9c8",
      "#1e6d8d",
    ]
  ) {
    assert.match(css, new RegExp(color, "i"));
  }
  assert.match(
    css,
    /\.output-list\s*\{[^}]*grid-template-columns:\s*repeat\(4,\s*minmax\(0,\s*1fr\)\);[^}]*background:\s*#f5f4f1;[^}]*overflow:\s*hidden;/i,
  );
  assert.match(
    css,
    /\.output-list li\s*\{[^}]*position:\s*relative;[^}]*min-height:\s*300px;[^}]*background:\s*#fff;[^}]*box-shadow:\s*-14px 0 24px rgba\(0,\s*0,\s*0,\s*0\.14\);[^}]*overflow:\s*hidden;/i,
  );
  assert.match(
    css,
    /\.output-list__number\s*\{[^}]*position:\s*absolute;[^}]*font-size:\s*clamp\(10rem,\s*15vw,\s*12\.8rem\);[^}]*color:\s*var\(--output-color\);/i,
  );
  assert.match(
    css,
    /@media\s*\(max-width:\s*1000px\)[\s\S]*?\.output-list\s*\{[^}]*grid-template-columns:\s*repeat\(2,\s*minmax\(0,\s*1fr\)\);/i,
  );
  assert.match(
    css,
    /@media\s*\(max-width:\s*680px\)[\s\S]*?\.output-list\s*\{[^}]*grid-template-columns:\s*1fr;/i,
  );
  assert.doesNotMatch(outputMarkup, /決策下一步/);
  assert.match(
    html,
    /class="output-next"[\s\S]*甲方接著可以怎麼做[\s\S]*data-route="basicReport"[\s\S]*查看基本檢討報告格式/,
  );
  assert.match(css, /\.output-next\s*\{[^}]*display:\s*grid;/i);
});

test("illustrative result is explicitly synthetic and not a guarantee", async () => {
  const html = await readPcmFile("public_home/code.html");
  const previewSection = html.match(
    /<section\s+id="workspace-preview"[\s\S]*?<\/section>/,
  )?.[0];

  assert.match(
    previewSection,
    /示意成果／非真實客戶案件／不代表效果保證/,
  );
  assert.match(previewSection, /版本依據/);
  assert.match(previewSection, /待確認事項/);
  assert.match(previewSection, /目前處理者/);
  assert.match(previewSection, /下一步/);
});

test("public homepage preserves LaiBE tokens and accessibility floors", async () => {
  const css = await readPcmFile("public_home/styles.css");

  for (
    const token of [
      "#050607",
      "#0b0d10",
      "#f4f7f8",
      "#c9d1d7",
      "#8d979f",
      "#ff8a1c",
      "#ff4d1f",
      "#79d8ff",
    ]
  ) {
    assert.match(css, new RegExp(token, "i"));
  }
  assert.match(css, /--header-height:\s*86px/i);
  assert.match(css, /height:\s*var\(--header-height\)/i);
  assert.match(css, /max-width:\s*1180px/i);
  assert.match(css, /min-height:\s*44px/i);
  assert.match(css, /@media\s*\(max-width:\s*1000px\)/i);
  assert.match(css, /@media\s*\(max-width:\s*680px\)/i);
  assert.match(css, /@media\s*\(prefers-reduced-motion:\s*reduce\)/i);
});

test("public homepage aligns Header and CTA controls with the current LaiBE visual language", async () => {
  const html = await readPcmFile("public_home/code.html");
  const css = await readPcmFile("public_home/styles.css");
  const header = html.match(
    /<header class="site-header"[\s\S]*?<\/header>/,
  )?.[0] ?? "";

  for (
    const href of [
      "#case-flow",
      "#service-fee",
      "#milestone-governance",
      "../owner_start/code.html",
    ]
  ) {
    assert.ok(header.includes(`href="${href}"`));
  }

  assert.match(
    css,
    /\.site-header\s*\{[^}]*z-index:\s*90;[^}]*padding-inline:\s*max\(20px,\s*calc\(\(100vw - 1160px\) \/ 2\)\);[^}]*background:[^}]*rgba\(3,\s*5,\s*7,\s*0\.82\);[^}]*backdrop-filter:\s*blur\(22px\)\s*saturate\(130%\);/i,
  );
  assert.match(css, /\.brand img\s*\{[^}]*width:\s*118px;/i);
  assert.match(css, /\.site-header nav\s*\{[^}]*gap:\s*12px;/i);
  assert.match(
    css,
    /\.site-header nav > a\s*\{[^}]*min-height:\s*44px;[^}]*padding:\s*0 13px;[^}]*border-radius:\s*var\(--pill\);/i,
  );
  const navIconRule = css.match(
    /\.site-header nav > a::before\s*\{[^}]*\}/i,
  )?.[0] ?? "";
  assert.match(navIconRule, /width:\s*19px;/i);
  assert.match(navIconRule, /data:image\/svg\+xml/i);
  assert.match(
    css,
    /\.button--primary\s*\{[^}]*min-height:\s*52px;[^}]*linear-gradient\(135deg,\s*#ffb145,\s*#ff711f 46%,\s*#ff4925\);[^}]*color:\s*#fff;/i,
  );
  assert.match(
    css,
    /\.button--quiet\s*\{[^}]*min-height:\s*52px;[^}]*rgba\(10,\s*12,\s*14,\s*0\.78\);[^}]*color:\s*#fff;/i,
  );
  assert.match(
    css,
    /\.hero__actions \.text-link\s*\{[^}]*min-height:\s*52px;[^}]*background:\s*rgba\(101,\s*216,\s*255,\s*0\.1\);[^}]*color:\s*#bdf1ff;/i,
  );
  assert.match(
    css,
    /a:focus-visible,[\s\S]*?button:focus-visible\s*\{[^}]*outline:\s*2px solid #bdf1ff;[^}]*outline-offset:\s*3px;/i,
  );
  assert.match(
    css,
    /\.button\[aria-disabled="true"\][\s\S]*?pointer-events:\s*none;/i,
  );
  assert.match(
    css,
    /\.button\[aria-busy="true"\][\s\S]*?pointer-events:\s*none;/i,
  );
  assert.match(
    css,
    /@media\s*\(max-width:\s*980px\)[\s\S]*?\.site-header\s*\{[^}]*flex-wrap:\s*wrap;/i,
  );
  assert.match(
    css,
    /@media\s*\(max-width:\s*620px\)[\s\S]*?\.brand img\s*\{[^}]*width:\s*94px;[\s\S]*?\.hero__actions \.button,[\s\S]*?\.hero__actions \.text-link\s*\{[^}]*width:\s*100%;[^}]*min-height:\s*52px;/i,
  );
  assert.doesNotMatch(
    css,
    /@media\s*\(max-width:\s*1000px\)[\s\S]*?\.site-header nav > a:not\(\.button\)\s*\{[^}]*display:\s*none;/i,
  );
});

test("public homepage composes the desktop hero to keep the action and all six summary steps in view", async () => {
  const css = await readPcmFile("public_home/styles.css");

  assert.match(
    css,
    /\.hero\s*\{[^}]*padding-block:\s*clamp\(32px,\s*4vw,\s*56px\);[^}]*grid-template-columns:\s*minmax\(0,\s*1fr\)\s*minmax\(420px,\s*0\.62fr\);[^}]*align-items:\s*start;/i,
  );
  assert.match(
    css,
    /\.same-fact-rail li\s*\{[^}]*min-height:\s*clamp\(96px,\s*7\.6vw,\s*112px\);/i,
  );
  assert.match(
    css,
    /\.process-step__copy\s*\{[^}]*min-height:\s*clamp\(96px,\s*7\.6vw,\s*112px\);/i,
  );
  assert.match(
    css,
    /h1\s*\{[^}]*font-size:\s*clamp\(3\.25rem,\s*6\.7vw,\s*6\.2rem\);/i,
  );
});

test("public homepage keeps the medium desktop hero headline readable", async () => {
  const css = await readPcmFile("public_home/styles.css");

  assert.match(
    css,
    /@media\s*\(min-width:\s*1001px\)\s*and\s*\(max-width:\s*1180px\)[\s\S]*?h1\s*\{[^}]*font-size:\s*clamp\(3\.4rem,\s*5\.4vw,\s*3\.8rem\);[^}]*letter-spacing:\s*-0\.045em;[^}]*line-height:\s*1\.08;[^}]*text-wrap:\s*pretty;/i,
  );
});

test("public homepage lays out the detailed six-step flow in complete responsive rows", async () => {
  const css = await readPcmFile("public_home/styles.css");

  assert.match(
    css,
    /\.flow-list\s*\{[^}]*display:\s*grid;[^}]*grid-template-columns:\s*repeat\(3,\s*minmax\(0,\s*1fr\)\);/i,
  );
  assert.match(
    css,
    /@media\s*\(max-width:\s*1000px\)[\s\S]*?\.flow-list\s*\{[^}]*grid-template-columns:\s*repeat\(2,\s*minmax\(0,\s*1fr\)\);/i,
  );
  assert.match(
    css,
    /@media\s*\(max-width:\s*680px\)[\s\S]*?\.flow-list\s*\{[^}]*grid-template-columns:\s*1fr;/i,
  );
});

test("public homepage declares the existing LaiBE logo as its favicon", async () => {
  const html = await readPcmFile("public_home/code.html");

  assert.match(
    html,
    /<link\s+rel="icon"\s+type="image\/svg\+xml"\s+href="\.\.\/\.\.\/\.\.\/\.\.\/assets\/logo\/laibe_offer\.svg"\s*\/>/i,
  );
});

test("public homepage maps the owner-first lifecycle in a six-step offset poster", async () => {
  const html = await readPcmFile("public_home/code.html");
  const css = await readPcmFile("public_home/styles.css");
  const processMarkup = html.match(
    /<div class="same-fact-rail"[\s\S]*?<\/ol>\s*<\/div>/,
  )?.[0] ?? "";

  const processSteps = [
    ...processMarkup.matchAll(
      /<li\b([^>]*)>[\s\S]*?<small>([^<]+)<\/small>/g,
    ),
  ];

  assert.equal(processSteps.length, 6);
  assert.deepEqual(
    processSteps.map(([, attributes]) =>
      attributes.match(/data-process-step="([^"]+)"/)?.[1]
    ),
    ["01", "02", "03", "04", "05", "06"],
  );
  assert.deepEqual(
    processSteps.map(([, , label]) => label.trim()),
    [
      "資格確認",
      "註冊上傳",
      "基本檢討",
      "服務簽署",
      "邀請乙方",
      "里程碑治理",
    ],
  );
  assert.equal(
    (processMarkup.match(/class="process-step__copy"/g) ?? []).length,
    6,
  );
  assert.match(css, /--process-yellow:\s*#ffd62a/i);
  assert.match(css, /--process-graphite:\s*#4b5050/i);
  assert.match(
    css,
    /\.same-fact-rail\s*\{[^}]*border:\s*0;[^}]*border-radius:\s*0;/i,
  );
  assert.match(
    css,
    /\.same-fact-rail li\s*\{[^}]*--cut-top:[^;]+;[^}]*--cut-bottom:[^;]+;[^}]*--number-x:[^;]+;[^}]*--copy-width:[^;]+;/i,
  );
  assert.equal(
    (
      css.match(
        /\.same-fact-rail li:nth-child\(\d\)\s*\{[^}]*--cut-top:[^;]+;[^}]*--cut-bottom:[^;]+;[^}]*--number-x:[^;]+;/gi,
      ) ?? []
    ).length,
    6,
  );
  assert.match(
    css,
    /\.same-fact-rail li::before\s*\{[^}]*clip-path:\s*polygon\(\s*0 0,\s*var\(--cut-top\) 0,\s*var\(--cut-bottom\) 100%,\s*0 100%\s*\);/i,
  );
  assert.match(
    css,
    /\.same-fact-rail li::after\s*\{[^}]*content:\s*attr\(data-process-step\);[^}]*clip-path:\s*polygon\(\s*var\(--cut-top\) 0,\s*100% 0,\s*100% 100%,\s*var\(--cut-bottom\) 100%\s*\);/i,
  );
  assert.match(
    css,
    /\.rail-index\s*\{[^}]*position:\s*absolute;[^}]*left:\s*var\(--number-x\);[^}]*font-size:\s*clamp\(/i,
  );
  assert.match(
    css,
    /\.process-step__copy\s*\{[^}]*width:\s*var\(--copy-width\);[^}]*margin-left:\s*auto;[^}]*text-align:\s*center;/i,
  );
  assert.match(
    css,
    /@media\s*\(min-width:\s*681px\)\s*and\s*\(max-width:\s*1000px\)[\s\S]*\.same-fact-rail ol\s*\{[^}]*grid-template-columns:\s*repeat\(2,\s*minmax\(0,\s*1fr\)\);/i,
  );
  assert.match(
    css,
    /@media\s*\(max-width:\s*680px\)[\s\S]*\.same-fact-rail ol\s*\{[^}]*grid-template-columns:\s*1fr;/i,
  );
  assert.match(
    css,
    /@media\s*\(max-width:\s*680px\)[\s\S]*\.same-fact-rail li\s*\{[^}]*min-height:\s*76px;[^}]*grid-template-columns:\s*46px\s+minmax\(0,\s*1fr\);/i,
  );
  assert.match(
    css,
    /@media\s*\(max-width:\s*680px\)[\s\S]*\.process-step__copy\s*\{[^}]*grid-template-columns:\s*minmax\(72px,\s*88px\)\s+minmax\(0,\s*1fr\);/i,
  );
  assert.match(
    css,
    /@media\s*\(max-width:\s*680px\)[\s\S]*\.same-fact-rail li::after\s*\{[^}]*display:\s*none;/i,
  );
  assert.doesNotMatch(
    css,
    /\.same-fact-rail li::before[\s\S]{0,320}calc\(100%\s*-\s*(?:38|26)px\)/i,
  );

  for (
    const sentence of [
      "先確認你已有乙方報價與施工圖",
      "建立甲方帳號並提供兩份 PDF",
      "萊比先整理版本、缺件與初步風險",
      "看完報告後再決定是否簽約",
      "由甲方邀請乙方加入同一案件",
      "甲乙方與 PCM 都回到同一份案件紀錄",
    ]
  ) {
    assert.match(processMarkup, new RegExp(sentence));
  }
});

test("public homepage explains fees, public governance and guarded termination", async () => {
  const html = await readPcmFile("public_home/code.html");

  assert.match(
    html,
    /PCM 服務費為甲乙確認並納入契約的乙方報價版本之 3%/,
  );
  assert.match(html, /簽約時支付 PCM 總服務費的 10%/);
  assert.match(html, /其餘 90% 依里程碑比例/);
  assert.match(html, /萊比不代收、不託管，也不撥付甲乙方工程款/);
  assert.match(html, /甲方提出異議或證據/);
  assert.match(html, /PCM 必須逐項檢查並回復/);
  assert.match(
    html,
    /甲乙方與 PCM 的案件訊息對案件參與者公開/,
  );
  assert.match(html, /保存在萊比後台/);
  assert.match(html, /甲方可提出暫緩驗收[\s\S]*乙方明示同意/);
  assert.match(html, /甲方依甲乙雙方協議自行確認本里程碑/);
  assert.match(html, /PCM 書面審查結果仍為條件不成立/);
  assert.match(html, /48 小時補正/);
  assert.match(html, /文件可讀取與下載/);
  assert.match(html, /尚未發生的 PCM 服務費停止請款/);
  assert.match(html, /PCM 與甲方同意服務契約自動解除/);
  assert.match(html, /已支付的 10% 簽約款抵充已完成服務/);
  assert.match(html, /不另行退款或追加請款/);
  assert.match(html, /書面治理條件失效/);
  assert.match(html, /PCM 不再介入/);
});

test("public homepage contains no fake live messaging or forbidden claims", async () => {
  const source = [
    await readPcmFile("public_home/code.html"),
    await readPcmFile("public_home/app.js"),
  ].join("\n");

  assert.doesNotMatch(
    source,
    /聊天室|綁定 LINE|LINE 登入|付款保障|資金託管|代收代付|最低價|零風險|杜絕詐騙|老屋投資|翻修獲利/,
  );
  assert.doesNotMatch(source, /專用 LINE 管道/);
  assert.doesNotMatch(source, /localStorage|sessionStorage/);
  assert.doesNotMatch(
    source,
    />[^<]*(?:DB|API|GitHub|debug|mock|stack trace|MVP)[^<]*</i,
  );
});

test("homepage consumes A5 and A14 through fail-closed product readiness", async () => {
  const app = await import(
    new URL("public_home/app.js", packageUrl).href
  );
  const status = app.resolvePublicIntegrationStatus({});
  const html = await readPcmFile("public_home/code.html");

  assert.deepEqual(status, {
    caseData: {
      available: false,
      message: "案件知識與留痕功能正在整理中，正式開放後會提供完整操作入口。",
    },
    notifications: {
      available: false,
      bindingLabel: "設定完成後開放",
      message: "案件通知入口將於設定完成後開放。",
    },
  });
  assert.match(html, /data-case-data-readiness/);
  assert.match(html, /data-notification-readiness/);
  assert.doesNotMatch(html, />[^<]*(?:A5|A14|PR #112|2c441830)[^<]*</i);
});

test("every configured public route resolves inside the PCM package", async () => {
  const { PUBLIC_ROUTES } = await import(
    new URL("public/public-contract.js", packageUrl).href
  );

  for (const route of Object.values(PUBLIC_ROUTES)) {
    const pathOnly = route.split(/[?#]/, 1)[0];
    await access(new URL(pathOnly, new URL("public/", packageUrl)));
  }
});

test("public homepage exposes the PCM service contract as the fifth header entry", async () => {
  const html = await readPcmFile("public_home/code.html");
  const css = await readPcmFile("public_home/styles.css");
  const headerNav = html.match(
    /<nav\b[^>]*>[\s\S]*?<\/nav>/i,
  )?.[0] ?? "";
  const links = [...headerNav.matchAll(/<a\b[^>]*href="([^"]+)"[^>]*>/gi)];

  assert.match(html, /href="\.\.\/service_contract\/code\.html"/);
  assert.match(html, />PCM ??憟?<\/a>/);
  assert.match(html, /3\.5%/);
  assert.doesNotMatch(html, /(?<![\d.])3%(?![\d.])/);
  assert.equal(links.length, 5);
  assert.equal(links[4][1], "../service_contract/code.html");
  assert.equal(
    links.at(-1)?.[1],
    "../service_contract/code.html",
  );
  assert.match(
    css,
    /@media\s*\(max-width:\s*620px\)[\s\S]*?\.site-header nav\s*\{[\s\S]*?display:\s*grid;[\s\S]*?grid-template-columns:\s*repeat\(2,\s*minmax\(0,\s*1fr\)\);[\s\S]*?\}[\s\S]*?\.site-header nav\s*>\s*a:last-child\s*\{[\s\S]*?grid-column:\s*1\s*\/\s*-1;/i,
  );
});
