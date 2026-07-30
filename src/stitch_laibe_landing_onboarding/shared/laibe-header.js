(function () {
  if (document.getElementById("lb-unified-header")) return;
  // 內嵌情境（pro_dashboard 以 ?embed=1 內嵌內容頁）不渲染共用 header
  try { if (/[?&]embed=1\b/.test(location.search)) return; } catch (e) {}

  var css = ''
    + '#lb-unified-header.lb-hdr{position:sticky;top:0;z-index:1000;border-bottom:1px solid rgba(255,255,255,.08);background:rgba(6,8,10,.86);-webkit-backdrop-filter:blur(18px);backdrop-filter:blur(18px);font-family:"Noto Sans TC","Microsoft JhengHei",system-ui,sans-serif;}'
    + '.lb-hdr *{box-sizing:border-box;}'
    + '.lb-hdr .lb-inner{width:min(1180px,calc(100% - 48px));min-height:76px;margin:0 auto;display:flex;align-items:center;gap:18px;}'
    + '.lb-hdr .lb-logo{display:inline-flex;align-items:center;flex-shrink:0;}'
    + '.lb-hdr .lb-logo img{width:120px;max-height:56px;object-fit:contain;display:block;}'
    + '.lb-hdr .lb-nav{flex:1 1 auto;display:flex;align-items:center;gap:10px;flex-wrap:wrap;}'
    + '.lb-hdr .lb-link,.lb-hdr .lb-menu>summary{list-style:none;cursor:pointer;min-height:40px;display:inline-flex;align-items:center;gap:8px;padding:0 13px;border:1px solid rgba(255,255,255,.12);border-radius:999px;background:linear-gradient(180deg,rgba(255,255,255,.075),rgba(255,255,255,.035)),rgba(8,10,12,.78);color:#f7f7f2;font-weight:850;font-size:13px;white-space:nowrap;text-decoration:none;}'
    + '.lb-hdr .lb-menu>summary::-webkit-details-marker{display:none;}'
    + '.lb-hdr .lb-link:hover,.lb-hdr .lb-menu>summary:hover,.lb-hdr .lb-menu[open]>summary{border-color:rgba(255,132,41,.52);background:linear-gradient(180deg,rgba(255,132,41,.20),rgba(255,132,41,.08)),rgba(8,10,12,.88);color:#fff;}'
    + '.lb-hdr .lb-ico{position:relative;width:19px;height:19px;display:inline-grid;place-items:center;border-radius:8px;background:linear-gradient(135deg,rgba(255,255,255,.34),rgba(255,255,255,.05) 48%),rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.30);box-shadow:inset 0 1px 0 rgba(255,255,255,.55),0 3px 9px rgba(0,0,0,.22),0 0 14px rgba(255,138,43,.16);-webkit-backdrop-filter:blur(9px);backdrop-filter:blur(9px);color:#ff8a2b;font-size:12px;overflow:hidden;}'
    + '.lb-hdr .lb-menu{position:relative;}'
    + '.lb-hdr .lb-panel{position:absolute;top:calc(100% + 12px);left:0;min-width:178px;display:grid;gap:4px;padding:8px;border:1px solid rgba(255,255,255,.14);border-radius:16px;background:rgba(5,7,9,.98);-webkit-backdrop-filter:blur(18px);backdrop-filter:blur(18px);box-shadow:0 24px 70px rgba(0,0,0,.45),inset 0 1px 0 rgba(255,255,255,.045);z-index:1001;}'
    + '.lb-hdr .lb-panel a{padding:10px 12px;border-radius:10px;color:#eaf2f8;font-weight:750;font-size:14px;text-decoration:none;white-space:nowrap;}'
    + '.lb-hdr .lb-panel a:hover{background:rgba(255,132,41,.16);color:#fff;}'
    + '.lb-hdr .lb-signin{margin-left:auto;}'
    + '.lb-hdr .lb-avatar{width:22px;height:22px;border-radius:50%;flex:none;display:inline-grid;place-items:center;font-weight:1000;font-size:12px;color:#2a1305;background:linear-gradient(135deg,#ffb46b,#ff7a3c);}'
    + '.lb-hdr .lb-panel-r{right:0;left:auto;}'
    + '@media (max-width:900px){.lb-hdr .lb-inner{width:min(100% - 24px,1180px);min-height:64px;gap:10px;}.lb-hdr .lb-logo img{width:98px;}.lb-hdr .lb-nav{gap:8px;}.lb-hdr .lb-link,.lb-hdr .lb-menu>summary{padding:0 11px;font-size:12px;min-height:38px;}.lb-hdr .lb-ico{width:17px;height:17px;font-size:11px;}}';

  var style = document.createElement("style");
  style.id = "lb-unified-header-style";
  style.textContent = css;
  document.head.appendChild(style);

  // 隱藏各頁原本的「純品牌/導覽」header，避免雙重標頭；
  // 但保留含功能性導覽（如主標籤列 .main-tabs，或標記 data-lb-keep）的 header
  var olds = document.querySelectorAll("header");
  for (var i = 0; i < olds.length; i++) {
    if (olds[i].querySelector(".main-tabs") || olds[i].hasAttribute("data-lb-keep")) continue;
    olds[i].style.display = "none";
    olds[i].setAttribute("data-lb-hidden", "1");
  }

  var b = "../";
  var hdr = document.createElement("header");
  hdr.id = "lb-unified-header";
  hdr.className = "lb-hdr";
  hdr.innerHTML =
    '<div class="lb-inner">' +
      '<a class="lb-logo" href="' + b + 'laibe_landing_desktop/code.html#top" aria-label="返回 LaiBE 首頁"><img src="' + b + '../../../assets/logo/laibe_offer.svg" alt="LaiBE offer"></a>' +
      '<nav class="lb-nav" aria-label="主選單">' +
        '<details class="lb-menu"><summary><span class="lb-ico" aria-hidden="true">⌂</span>入口</summary>' +
          '<div class="lb-panel">' +
            '<a href="' + b + 'onboard_ai_agent/code.html">發案方</a>' +
            '<a href="' + b + 'pro_dashboard/code.html">接案方</a>' +
          '</div>' +
        '</details>' +
        '<details class="lb-menu"><summary><span class="lb-ico" aria-hidden="true">⌕</span>工具</summary>' +
          '<div class="lb-panel">' +
            '<a href="' + b + 'preview_floor_plan/code.html">平面拼圖</a>' +
            '<a href="' + b + 'preview_budget/code.html">預算整理</a>' +
          '</div>' +
        '</details>' +
        '<a class="lb-link" href="' + b + 'laibe_landing_desktop/code.html#about-laibe-guide"><span class="lb-ico" aria-hidden="true">i</span>關於 LaiBE</a>' +
        (function(){
          var u = window.LB_AUTH;
          if (u && u.name) {
            var initial = (u.name || "").slice(0,1);
            return '<details class="lb-menu lb-signin"><summary><span class="lb-avatar" aria-hidden="true">' + initial + '</span>' + u.name + '</summary>' +
              '<div class="lb-panel lb-panel-r">' +
                '<a href="' + b + 'onboard_ai_agent/code.html">我的標案</a>' +
                '<a href="' + b + 'laibe_landing_desktop/code.html#top">帳戶設定</a>' +
                '<a href="' + b + 'laibe_landing_desktop/code.html#top">登出</a>' +
              '</div>' +
            '</details>';
          }
          return '<a class="lb-link lb-signin" href="' + b + 'laibe_landing_desktop/code.html#top"><span class="lb-ico" aria-hidden="true">⇲</span>註冊 / 登入</a>';
        })() +
      '</nav>' +
    '</div>';
  document.body.insertBefore(hdr, document.body.firstChild);

  // 點選單外自動收合
  document.addEventListener("click", function (e) {
    var menus = hdr.querySelectorAll("details.lb-menu[open]");
    for (var j = 0; j < menus.length; j++) {
      if (!menus[j].contains(e.target)) menus[j].removeAttribute("open");
    }
  });
})();
