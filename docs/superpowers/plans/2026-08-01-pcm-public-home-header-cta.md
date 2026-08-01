# PCM Public Home Header and CTA Refresh Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Unify the PCM public homepage Header, navigation pills, and CTA hierarchy with the current LaiBE A2 readable visual language without changing copy, routes, information architecture, or non-CTA page layout.

**Architecture:** Keep the existing HTML and JavaScript contracts intact. Add one static contract test, then implement the visual change only in `public_home/styles.css`, using existing selectors plus decorative CSS data-SVG icons. Preserve all current `href` and `data-route` values and do not add a dropdown because the current page has none.

**Tech Stack:** Static HTML, CSS, vanilla JavaScript contracts, Node.js `node:test`, Codex in-app Browser acceptance.

## Global Constraints

- Work only in `C:\Users\J\.codex\worktrees\laibe_pcm_a0`; never access Z or UNC paths.
- Modify only Header, navigation, CTA styles, their static regression test, and this task's spec/plan documentation.
- Preserve all current copy, routes, Logo asset, information architecture, section order, `href`, `data-route`, and event behavior.
- Do not add packages, dropdown navigation, emoji icons, saturated colors, unrelated refactors, or page-wide styling.
- Use the existing `laibe_offer.svg`; desktop Logo width 118px and mobile width 94px.
- Header: sticky, 86px desktop, `rgba(3, 5, 7, 0.82)`, `blur(22px) saturate(130%)`, centered 1160px content region.
- Main CTA: 52px orange gradient with white text. View CTA: cyan auxiliary treatment. Quiet CTA: dark glass.
- At 980px and below Header may wrap; at 620px and below navigation must fit without horizontal overflow and Hero CTAs are 100% width.
- Maintain `:focus-visible`, `:active`, disabled, `aria-busy`, 44px touch targets, and `prefers-reduced-motion` support.

---

### Task 1: Lock the Header and CTA visual contract

**Files:**
- Modify: `tests/pcm-public-home.test.mjs`
- Test: `tests/pcm-public-home.test.mjs`

**Interfaces:**
- Consumes: `readPcmFile("public_home/code.html")` and `readPcmFile("public_home/styles.css")`.
- Produces: one regression test proving the approved A2 Header/CTA CSS contract and unchanged navigation destinations.

- [ ] **Step 1: Write the failing test**

Append this test after the existing LaiBE token/accessibility test:

```js
test("public homepage aligns Header and CTA controls with the current LaiBE visual language", async () => {
  const html = await readPcmFile("public_home/code.html");
  const css = await readPcmFile("public_home/styles.css");
  const header = html.match(/<header class="site-header"[\s\S]*?<\/header>/)?.[0] ?? "";

  for (const href of [
    "#case-flow",
    "#service-fee",
    "#milestone-governance",
    "../owner_start/code.html",
  ]) {
    assert.ok(header.includes(`href="${href}"`));
  }

  assert.match(css, /--header-height:\s*86px/i);
  assert.match(css, /\.site-header\s*\{[^}]*z-index:\s*90;[^}]*background:[\s\S]*rgba\(3,\s*5,\s*7,\s*0\.82\);[^}]*backdrop-filter:\s*blur\(22px\)\s*saturate\(130%\);/i);
  assert.match(css, /\.brand img\s*\{[^}]*width:\s*118px;/i);
  assert.match(css, /\.site-header nav\s*\{[^}]*gap:\s*12px;/i);
  assert.match(css, /\.site-header nav > a\s*\{[^}]*min-height:\s*44px;[^}]*border-radius:\s*var\(--pill\);/i);
  const navIconRule = css.match(/\.site-header nav > a::before\s*\{([\s\S]*?)\}/i)?.[1] ?? "";
  assert.match(navIconRule, /width:\s*19px/i);
  assert.match(navIconRule, /data:image\/svg\+xml/i);
  assert.match(css, /\.button--primary\s*\{[^}]*min-height:\s*52px;[^}]*linear-gradient\(135deg,\s*#ffb145,\s*#ff711f 46%,\s*#ff4925\);[^}]*color:\s*#fff;/i);
  assert.match(css, /\.button--quiet\s*\{[^}]*min-height:\s*52px;[^}]*rgba\(10,\s*12,\s*14,\s*0\.78\);/i);
  assert.match(css, /\.hero__actions \.text-link\s*\{[^}]*min-height:\s*52px;[^}]*rgba\(101,\s*216,\s*255,\s*0\.1\);[^}]*#bdf1ff;/i);
  assert.match(css, /:focus-visible[\s\S]*outline:\s*2px solid #bdf1ff/i);
  assert.match(css, /\[aria-disabled="true"\][\s\S]*pointer-events:\s*none/i);
  assert.match(css, /\[aria-busy="true"\][\s\S]*pointer-events:\s*none/i);
  assert.match(css, /@media\s*\(max-width:\s*980px\)[\s\S]*?\.site-header\s*\{[^}]*flex-wrap:\s*wrap;/i);
  assert.match(css, /@media\s*\(max-width:\s*620px\)[\s\S]*?\.brand img\s*\{[^}]*width:\s*94px;[\s\S]*?\.hero__actions \.button,[\s\S]*?\.hero__actions \.text-link\s*\{[^}]*width:\s*100%;/i);
});
```

- [ ] **Step 2: Run the targeted test to verify RED**

Run:

```powershell
node --test --test-name-pattern="aligns Header and CTA controls" tests/pcm-public-home.test.mjs
```

Expected: FAIL because the current stylesheet still uses a 76px Header, old gradient, dark primary text, no data-SVG navigation icons, and no 980/620 Header contract.

---

### Task 2: Implement the A2 Header, navigation, and CTA styles

**Files:**
- Modify: `src/stitch_laibe_landing_onboarding/pcm_standalone/public_home/styles.css`
- Test: `tests/pcm-public-home.test.mjs`

**Interfaces:**
- Consumes: existing `.site-header`, `.brand`, `.button`, `.button--primary`, `.button--quiet`, `.hero__actions`, and `.text-link` markup.
- Produces: approved visual states without HTML or JavaScript changes.

- [ ] **Step 1: Replace only the Header and CTA declarations**

Implement these exact contracts in the existing selector blocks:

```css
:root {
  --header-height: 86px;
}

.site-header {
  position: sticky;
  z-index: 90;
  top: 0;
  display: flex;
  width: 100%;
  height: var(--header-height);
  padding-inline: max(20px, calc((100vw - 1160px) / 2));
  align-items: center;
  justify-content: space-between;
  gap: 22px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.085);
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.045), transparent), rgba(3, 5, 7, 0.82);
  backdrop-filter: blur(22px) saturate(130%);
  box-shadow: 0 1px 0 rgba(255, 255, 255, 0.035), 0 18px 52px rgba(0, 0, 0, 0.22);
}

.brand img { width: 118px; }

.site-header nav { gap: 12px; }

.site-header nav > a {
  min-height: 44px;
  padding: 0 13px;
  gap: 8px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.075), rgba(255, 255, 255, 0.035)), rgba(8, 10, 12, 0.78);
  color: #f7f7f2;
  font-size: 13px;
  font-weight: 850;
}

.site-header nav > a::before {
  width: 19px;
  height: 19px;
  flex: 0 0 auto;
  border: 1px solid rgba(255, 255, 255, 0.24);
  border-radius: 8px;
  background: var(--nav-icon) center / 13px 13px no-repeat, linear-gradient(145deg, rgba(255, 255, 255, 0.18), rgba(255, 255, 255, 0.05));
  content: "";
}

.site-header nav > a:hover,
.site-header nav > a[aria-current="page"] {
  border-color: rgba(255, 132, 41, 0.52);
  background: linear-gradient(180deg, rgba(255, 132, 41, 0.2), rgba(255, 132, 41, 0.08)), rgba(8, 10, 12, 0.88);
  transform: translateY(-1px);
}

.button {
  min-height: 44px;
  padding: 0 18px;
  font-size: 14px;
  font-weight: 950;
}

.button--primary {
  min-height: 52px;
  padding: 0 22px;
  background: linear-gradient(135deg, #ffb145, #ff711f 46%, #ff4925);
  color: #fff;
  box-shadow: 0 18px 42px rgba(255, 73, 37, 0.24), inset 0 1px 0 rgba(255, 255, 255, 0.22);
}

.button--quiet {
  min-height: 52px;
  padding: 0 22px;
  border-color: rgba(255, 255, 255, 0.13);
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.085), rgba(255, 255, 255, 0.035)), rgba(10, 12, 14, 0.78);
  color: #fff;
}

.hero__actions .text-link {
  min-height: 52px;
  padding: 0 22px;
  border: 1px solid rgba(101, 216, 255, 0.28);
  border-radius: var(--pill);
  background: rgba(101, 216, 255, 0.1);
  color: #bdf1ff;
  text-decoration: none;
}
```

Assign a distinct `--nav-icon` data-SVG to the four existing Header anchors using `:nth-child(1)` through `:nth-child(4)`. Each SVG must use `stroke='%23ff8a2b'`, `fill='none'`, and a 16×16 viewBox; do not put emoji or readable text in the pseudo-element.

- [ ] **Step 2: Add state and responsive contracts**

Add these rules without changing non-Header responsive blocks:

```css
a:focus-visible,
button:focus-visible {
  outline: 2px solid #bdf1ff;
  outline-offset: 3px;
}

button:disabled,
.button[aria-disabled="true"],
.site-header nav > a[aria-disabled="true"] {
  pointer-events: none;
  cursor: not-allowed;
  opacity: 0.48;
}

.button[aria-busy="true"],
.site-header nav > a[aria-busy="true"] {
  pointer-events: none;
  cursor: progress;
  opacity: 0.72;
}

@media (max-width: 980px) {
  .site-header {
    height: auto;
    min-height: var(--header-height);
    padding: 12px 20px;
    flex-wrap: wrap;
  }

  .site-header nav {
    width: 100%;
    flex-wrap: wrap;
    justify-content: flex-start;
  }
}

@media (max-width: 620px) {
  .site-header { padding-inline: 12px; gap: 10px; }
  .brand img { width: 94px; }
  .site-header nav { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; }
  .site-header nav > a { width: 100%; min-height: 44px; padding: 0 10px; font-size: 12px; }
  .site-header nav > a::before { width: 17px; height: 17px; }
  .hero__actions .button,
  .hero__actions .text-link { width: 100%; min-height: 52px; justify-content: center; }
}
```

Remove the old `@media (max-width: 1000px)` rule that hides non-button Header links. Retain all unrelated 1000px and 680px layout rules.

- [ ] **Step 3: Run targeted and homepage tests to verify GREEN**

Run:

```powershell
node --test --test-name-pattern="aligns Header and CTA controls" tests/pcm-public-home.test.mjs
node --test tests/pcm-public-home.test.mjs
```

Expected: targeted test PASS; homepage suite 21/21 PASS.

---

### Task 3: Browser acceptance and bounded implementation commit

**Files:**
- Verify: `src/stitch_laibe_landing_onboarding/pcm_standalone/public_home/code.html`
- Verify: `src/stitch_laibe_landing_onboarding/pcm_standalone/public_home/styles.css`
- Verify: `src/stitch_laibe_landing_onboarding/pcm_standalone/public_home/app.js`
- Commit: `src/stitch_laibe_landing_onboarding/pcm_standalone/public_home/styles.css`
- Commit: `tests/pcm-public-home.test.mjs`
- Commit: `docs/superpowers/plans/2026-08-01-pcm-public-home-header-cta.md`

**Interfaces:**
- Consumes: the C-slot preview at `http://127.0.0.1:8766/src/stitch_laibe_landing_onboarding/pcm_standalone/public_home/code.html#top`.
- Produces: screenshots, computed typography/control metrics, overflow/collision/console evidence, file SHA256 values, and one bounded local commit SHA.

- [ ] **Step 1: Run complete static verification**

Run:

```powershell
node --test tests/*.test.mjs
node --check src/stitch_laibe_landing_onboarding/pcm_standalone/public_home/app.js
```

Expected: all tests pass and syntax check exits 0. If no `package.json` exists, report build/lint/typecheck as not configured rather than inventing commands.

- [ ] **Step 2: Verify the live page at five widths**

Use the existing in-app Browser binding. Reload the page from the C-slot service and capture 1440×912, 1082×912, 980×912, 620×900, and 390×844.

At every size collect:

- Header position, height/min-height, background, blur, z-index, Logo width.
- Navigation count, min-height, font size, wrapping/grid state, and horizontal overflow.
- Primary, quiet, and Hero auxiliary CTA min-height, colors, border radius, and text overflow.
- Document horizontal overflow, Header/Logo/nav collisions, Hero CTA collisions, Logo load state.
- Console warning/error entries.

Expected: no horizontal overflow, no collisions, no clipped labels, correct 118px/94px Logo breakpoints, 86px desktop Header, wrapped ≤980 Header, two-column mobile navigation, full-width Hero CTAs ≤620, and empty warning/error console.

- [ ] **Step 3: Confirm immutable route and source boundaries**

Compare `code.html` and `app.js` hashes before/after and confirm they are unchanged. Confirm the Header still contains exactly the same four `href` values and Hero actions still point to `../owner_start/code.html` and `#case-flow`.

- [ ] **Step 4: Create the bounded implementation commit**

Stage only:

```powershell
git add -- src/stitch_laibe_landing_onboarding/pcm_standalone/public_home/styles.css tests/pcm-public-home.test.mjs docs/superpowers/plans/2026-08-01-pcm-public-home-header-cta.md
git diff --cached --name-only
git diff --cached --check
git commit -m "feat(pcm): align public header and CTA controls"
```

Expected staged names: exactly the three listed files. Report the full commit SHA and SHA256 of each file to A0; do not merge, push, or claim formal completion.
