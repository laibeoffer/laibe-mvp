# PCM Hero Typography Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 修正 PCM 公開首頁在 1001–1180px 雙欄區間的主標擁擠問題，同時保留文案、Hero 比例與既有視覺契約。

**Architecture:** 以一個限定寬度的 CSS media query 覆寫全域 `h1` 排版參數，不修改 HTML 或 Hero grid。先加入靜態 CSS 回歸測試並確認紅燈，再加入最小 CSS 規則轉綠，最後於 1082 × 912 實際頁面確認閱讀性與無溢位。

**Tech Stack:** 靜態 HTML、CSS、Node.js `node:test`、本機 in-app browser。

## Global Constraints

- 只調整 1001–1180px 的 PCM 公開首頁主標規則。
- 主標文案、Logo、配色、字體家族、CTA、右側六步驟海報、Hero grid、路由、錨點與無障礙語意不變。
- 1000px 以下與 1181px 以上的既有規則不變。
- 不加入人工 `<br>`、套件、動畫、圖像或新色彩。
- 不執行 Git；目前沒有獨立 Git 工作封包授權。
- 所有命令使用 `C:\Users\J\.codex\worktrees\laibe_pcm_a0` 作為明確 workdir。

---

### Task 1: 修正中型桌機主標排版

**Files:**
- Modify: `tests/pcm-public-home.test.mjs`
- Modify: `src/stitch_laibe_landing_onboarding/pcm_standalone/public_home/styles.css`

**Interfaces:**
- Consumes: 現有全域 `h1` 規則與 `@media (max-width: 1000px)` 單欄切換。
- Produces: `@media (min-width: 1001px) and (max-width: 1180px)` 內的主標排版覆寫。

- [ ] **Step 1: 寫入失敗的主標響應式回歸測試**

在 `tests/pcm-public-home.test.mjs` 的 Hero 版型測試附近新增：

```js
test("public homepage keeps the medium desktop hero headline readable", async () => {
  const css = await readPcmFile("public_home/styles.css");

  assert.match(
    css,
    /@media\s*\(min-width:\s*1001px\)\s*and\s*\(max-width:\s*1180px\)[\s\S]*?h1\s*\{[^}]*font-size:\s*clamp\(3\.4rem,\s*5\.4vw,\s*3\.8rem\);[^}]*letter-spacing:\s*-0\.045em;[^}]*line-height:\s*1\.08;[^}]*text-wrap:\s*pretty;/i,
  );
});
```

- [ ] **Step 2: 執行單一測試並確認紅燈**

Run:

```powershell
node --test --test-name-pattern="medium desktop hero headline" tests/pcm-public-home.test.mjs
```

Expected: FAIL，原因是 `styles.css` 尚未存在 1001–1180px 的 `h1` 覆寫。

- [ ] **Step 3: 加入最小 CSS 修正**

在 `styles.css` 的 `@media (max-width: 1000px)` 之前加入：

```css
@media (min-width: 1001px) and (max-width: 1180px) {
  h1 {
    font-size: clamp(3.4rem, 5.4vw, 3.8rem);
    letter-spacing: -0.045em;
    line-height: 1.08;
    text-wrap: pretty;
  }
}
```

- [ ] **Step 4: 執行單一測試並確認轉綠**

Run:

```powershell
node --test --test-name-pattern="medium desktop hero headline" tests/pcm-public-home.test.mjs
```

Expected: PASS，1 test、0 failures。

- [ ] **Step 5: 執行 PCM 公開首頁與完整測試**

Run:

```powershell
node --test tests/pcm-public-home.test.mjs
```

Expected: PASS，0 failures。

Run:

```powershell
$allPcmTests = Get-ChildItem -LiteralPath 'tests' -Filter '*.test.mjs' -File | Sort-Object Name | ForEach-Object { $_.FullName }
node --test $allPcmTests
```

Expected: PASS，0 failures。

- [ ] **Step 6: 檢查既有 JavaScript 與禁用文案**

Run:

```powershell
node --check src\stitch_laibe_landing_onboarding\pcm_standalone\public_home\app.js
```

Expected: exit code 0。

Run a case-sensitive content scan against `public_home/code.html` for `DB`、`API`、`n8n`、`GitHub`、`debug`、`mock-only`、`本機候選`、`無 DB 寫入`、`API 未開`、`stack trace`、`老屋`、`投資報酬`、`翻修獲利`、`裝修理財`、`金流託管`、`支付託管`、`代收代付`。

Expected: 0 user-facing matches。

- [ ] **Step 7: 驗收 1082 × 912 畫面**

重新載入：

```text
http://127.0.0.1:8766/src/stitch_laibe_landing_onboarding/pcm_standalone/public_home/code.html#top
```

在 1082 × 912 viewport 確認：

- `h1` computed font size 約 58px、line height 約 63px。
- 主標行距清楚，沒有裁切或與副標重疊。
- Hero 仍維持左右雙欄，右側六步驟海報比例不變。
- `document.documentElement.scrollWidth === document.documentElement.clientWidth`。
- console 無 warning 或 error。

完成後重設臨時 viewport，並保留首頁分頁供使用者檢查。
