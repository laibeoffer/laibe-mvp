import os

html_content = """<!DOCTYPE html>
<html class="light" lang="zh-TW"><head>
<meta charset="utf-8"/>
<meta content="width=device-width, initial-scale=1.0" name="viewport"/>
<title>LaiBE - 招標文件總覽</title>
<script src="https://cdn.tailwindcss.com?plugins=forms,container-queries"></script>
<link href="https://fonts.googleapis.com/css2?family=Manrope:wght@300;400;500;600;700;800&amp;display=swap" rel="stylesheet"/>
<link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght@100..700,0..1&amp;display=swap" rel="stylesheet"/>
<link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&amp;display=swap" rel="stylesheet"/>
<script id="tailwind-config">
        tailwind.config = {
            darkMode: "class",
            theme: {
                extend: {
                    colors: {
                        "primary": "#AD5A5A",
                        "background-light": "#f7f6f6",
                        "background-dark": "#1c1616",
                        "gold-card": "#FDF6E3",
                        "gold-border": "#D4AF37",
                        "gold-accent": "#B8860B"
                    },
                    fontFamily: {
                        "display": ["Manrope", "sans-serif"]
                    },
                    borderRadius: {
                        "DEFAULT": "0.5rem",
                        "lg": "0.5rem",
                        "xl": "0.75rem",
                        "full": "9999px"
                    },
                },
            },
        }
    </script>
<style>
        body { font-family: 'Manrope', 'Noto Sans TC', sans-serif; }
        .hide-scrollbar::-webkit-scrollbar { display: none; }
        .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        .document-shadow { box-shadow: 0 4px 20px -2px rgba(0,0,0,0.1); }
        .gold-gradient { background: linear-gradient(135deg, #FDF6E3 0%, #F5E9CC 100%); }
    </style>
</head>
<body class="bg-background-light dark:bg-background-dark text-slate-900 dark:text-slate-100 min-h-screen pb-24">
<!-- 頂部導航欄 -->
<header class="sticky top-0 z-50 w-full bg-white dark:bg-background-dark border-b border-slate-200 dark:border-slate-800 px-6 py-3">
<div class="max-w-[1440px] mx-auto flex items-center justify-between">
<div class="flex items-center gap-8">
<a href="../laibe_landing_desktop/code.html" class="flex items-center hover:opacity-80 transition" title="返回首頁">
    <img src="../../../assets/logo/laibe_header.png" alt="LaiBE Logo" class="h-[30px] md:h-[40px] w-auto object-contain" />
</a>
<nav class="hidden md:flex items-center gap-6">
<a class="text-sm font-semibold hover:text-primary transition-colors" href="#">導引討論</a>
<a class="text-sm font-semibold hover:text-primary transition-colors" href="#">平面配置</a>
<a class="text-sm font-semibold hover:text-primary transition-colors" href="#">預算編輯</a>
<a class="text-sm font-semibold text-primary border-b-2 border-primary pb-1" href="#">招標管理</a>
</nav>
</div>
<div class="flex items-center gap-4">
<div class="relative hidden sm:block">
<span class="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">search</span>
<input class="pl-10 pr-4 py-2 bg-slate-100 dark:bg-slate-800 border-none rounded-lg text-sm w-64 focus:ring-2 focus:ring-primary/50" placeholder="搜尋項目..." type="text"/>
</div>
<div class="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden border border-slate-200">
<img alt="使用者頭像" class="w-full h-full object-cover" src="https://lh3.googleusercontent.com/aida-public/AB6AXuBQIqZ9XF0wjvA6HQCbLIaJGmye72Le2Q76gWFckyHMHL2OtaPzL264WQpkQ3u2JwggWSlQ8pMo_ficKbRlkq9aqthjf7OLDaq4JmYaHbVEkuJtS1JN3m_wNQn3zmgv0x2y7brnq71842eKYyc4VoPeN41x-J5D6zZnR5nf2GbNe8-9Qex_2D8fmJiwOXtbz9ebDzvPTj5kuIFUmTaS-zNMXrpIYqWf1ErCS8IbEQeukGU7DZZVFwZZF4En5s2XcPQIsNcoHMsQjZw"/>
</div>
</div>
</div>
</header>

<main class="max-w-[1440px] mx-auto p-6 space-y-6">
<!-- Breadcrumbs / Page Title Section -->
<div class="flex flex-col md:flex-row md:items-end justify-between gap-4">
<div>
<nav class="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">
<a class="hover:text-primary transition-colors" href="#">專案管理</a>
<span class="material-symbols-outlined text-[14px]">chevron_right</span>
<span class="text-slate-600 dark:text-slate-300">現代簡約住宅招標</span>
</nav>
<h1 class="text-3xl font-extrabold tracking-tight">招標文件總覽</h1>
</div>
<div class="flex items-center gap-3">
<span class="px-3 py-1 bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 text-xs font-bold rounded-full border border-amber-100 dark:border-amber-800 flex items-center gap-1">
<span class="material-symbols-outlined text-sm">edit_document</span> 待發布狀態
            </span>
</div>
</div>

<!-- Stepper (Revised Steps) -->
<div class="flex items-center justify-between bg-white dark:bg-background-dark p-4 rounded-xl shadow-sm overflow-x-auto hide-scrollbar border border-slate-200 dark:border-slate-800">
<button class="flex items-center gap-2 text-slate-400 min-w-max cursor-not-allowed">
<span class="w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-xs font-bold">1</span>
<span class="text-sm font-medium">需求討論</span>
<span class="material-symbols-outlined text-sm mx-2">chevron_right</span>
</button>
<button class="flex items-center gap-2 text-slate-400 min-w-max cursor-not-allowed">
<span class="w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-xs font-bold">2</span>
<span class="text-sm font-medium">平面拼圖</span>
<span class="material-symbols-outlined text-sm mx-2">chevron_right</span>
</button>
<button class="flex items-center gap-2 text-slate-400 min-w-max cursor-not-allowed">
<span class="w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-xs font-bold">3</span>
<span class="text-sm font-medium">預算生成</span>
<span class="material-symbols-outlined text-sm mx-2">chevron_right</span>
</button>
<button class="flex items-center gap-2 text-primary min-w-max">
<span class="w-6 h-6 rounded-full bg-primary text-white flex items-center justify-center text-xs font-bold shadow-sm">4</span>
<span class="text-sm font-bold">合約生成</span>
<span class="material-symbols-outlined text-sm mx-2">chevron_right</span>
</button>
<button class="flex items-center gap-2 text-slate-400 min-w-max cursor-not-allowed">
<span class="w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-xs font-bold">4.5</span>
<span class="text-sm font-medium">PCM 治理</span>
<span class="material-symbols-outlined text-sm mx-2">chevron_right</span>
</button>
<button class="flex items-center gap-2 text-slate-400 min-w-max cursor-not-allowed">
<span class="w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-xs font-bold">5</span>
<span class="text-sm font-medium">發布招標</span>
</button>
</div>

<!-- Notice Text Block -->
<div class="bg-primary/5 border border-primary/20 rounded-xl p-4 flex gap-3 items-start">
<span class="material-symbols-outlined text-primary">info</span>
<div class="space-y-1">
    <p class="text-sm font-bold text-slate-800 dark:text-slate-200">文件確認不可逆警告</p>
    <p class="text-xs font-medium text-slate-600 dark:text-slate-400">
        本頁為最終發案前文件預覽頁，確認平面圖、預算明細、契約樣稿、招標須知與工法規格書後，系統將鎖定所有文件版本。確認無誤後，即可進入訂閱與繳納上架費流程。一旦進入繳費流程，將無法再次修改上述文件。
    </p>
</div>
</div>

<!-- Main Content Grid -->
<div class="grid grid-cols-12 gap-6 items-start">

<!-- Left Sidebar -->
<aside class="col-span-12 lg:col-span-3 space-y-4">
<div class="bg-white dark:bg-background-dark rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
<div class="p-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
<h3 class="font-bold text-sm flex items-center gap-2">
<span class="material-symbols-outlined text-primary text-xl">folder_open</span>
                        文件總覽選單
                    </h3>
</div>
<div class="p-2 space-y-1">
<button class="w-full text-left px-4 py-3 rounded-lg text-sm font-semibold transition-colors flex items-center justify-between group hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400">
<span class="flex items-center gap-3">
<span class="material-symbols-outlined text-lg">map</span>
                            平面圖總覽
                        </span>
<span class="bg-emerald-50 text-emerald-600 text-[10px] px-2 py-0.5 rounded font-bold">已鎖定</span>
</button>
<button class="w-full text-left px-4 py-3 rounded-lg text-sm font-semibold transition-colors flex items-center justify-between group hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400">
<span class="flex items-center gap-3">
<span class="material-symbols-outlined text-lg">list_alt</span>
                            預算明細總覽
                        </span>
<span class="bg-emerald-50 text-emerald-600 text-[10px] px-2 py-0.5 rounded font-bold">已鎖定</span>
</button>
<button class="w-full text-left px-4 py-3 rounded-lg text-sm font-bold transition-colors flex items-center justify-between group bg-primary/10 text-primary border border-primary/20">
<span class="flex items-center gap-3">
<span class="material-symbols-outlined text-lg fill-1">description</span>
                            契約樣稿總覽
                        </span>
<span class="material-symbols-outlined text-sm">chevron_right</span>
</button>
<button class="w-full text-left px-4 py-3 rounded-lg text-sm font-semibold transition-colors flex items-center justify-between group hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400">
<span class="flex items-center gap-3">
<span class="material-symbols-outlined text-lg">campaign</span>
                            招標須知
                        </span>
<span class="material-symbols-outlined text-sm opacity-0 group-hover:opacity-100 transition-opacity">chevron_right</span>
</button>
<button class="w-full text-left px-4 py-3 rounded-lg text-sm font-semibold transition-colors flex items-center justify-between group hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400">
<span class="flex items-center gap-3">
<span class="material-symbols-outlined text-lg">construction</span>
                            工法規格書
                        </span>
<span class="material-symbols-outlined text-sm opacity-0 group-hover:opacity-100 transition-opacity">chevron_right</span>
</button>
</div>
</div>

<!-- Context Info -->
<div class="p-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl space-y-3">
<p class="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">契約包含版本</p>
<div class="space-y-2">
<div class="flex items-center gap-2 text-xs font-bold text-slate-600 dark:text-slate-400">
<span class="w-1.5 h-1.5 rounded-full bg-primary"></span>
                        PCM 數位合約版本
                    </div>
<div class="flex items-center gap-2 text-xs font-bold text-slate-600 dark:text-slate-400">
<span class="w-1.5 h-1.5 rounded-full bg-primary"></span>
                        Offline 實體契約樣稿
                    </div>
</div>
</div>
</aside>

<!-- Right Content Area -->
<div class="col-span-12 lg:col-span-9 space-y-6">

<!-- PCM Section (Gold Card Style) -->
<div class="p-8 border border-gold-border/50 rounded-xl space-y-6 shadow-sm relative overflow-hidden gold-gradient">
    <div class="flex justify-between items-start border-b border-gold-border/20 pb-4">
        <div>
            <h2 class="text-2xl font-extrabold text-slate-800 mb-1">室內裝修承攬契約樣稿</h2>
            <p class="text-sm font-medium text-slate-600">標準版 | 系統自動生成以供招標使用，不得手動修改條文。</p>
        </div>
        <div class="flex items-center gap-2">
            <button class="px-4 py-2 bg-white/60 hover:bg-white text-slate-700 text-sm font-bold rounded-lg border border-gold-border/30 transition-colors flex items-center gap-2 shadow-sm">
                <span class="material-symbols-outlined text-lg">download</span>
                下載 PDF
            </button>
        </div>
    </div>
    
    <div class="bg-white rounded-lg p-6 md:p-10 shadow-inner border border-slate-100 max-h-[500px] overflow-y-auto text-sm text-slate-700 leading-relaxed font-medium space-y-6">
        <div class="text-center mb-8">
            <h3 class="text-xl font-bold mb-2">室內裝修承攬契約</h3>
            <p class="text-slate-500">（本草案僅作招標展示用，決標後將代入得標廠商資訊）</p>
        </div>
        
        <div class="space-y-4">
            <p><span class="font-bold">立契約書人：</span></p>
            <p>定作人（甲方）：[系統代入業主資訊]<br>
            承攬人（乙方）：[決標後代入得標廠商]</p>
        </div>
        
        <div class="space-y-2">
            <h4 class="font-bold text-base mt-6">第一條：工程名稱及地點</h4>
            <p>一、工程名稱：現代簡約住宅裝修工程<br>
            二、工程地點：依甲方指定之施工地址為準。</p>
        </div>

        <div class="space-y-2">
            <h4 class="font-bold text-base mt-6">第二條：工程範圍與規格</h4>
            <p>一、乙方應依據萊比平台(LaiBE)上鎖定之「平面圖總覽」、「預算明細總覽」及「工法規格書」進行施工。<br>
            二、任何非經 PCM (專業營建管理) 系統化審核通過之變更，皆不具備合約約束力。</p>
        </div>

        <div class="space-y-2">
            <h4 class="font-bold text-base mt-6">第三條：工程期限</h4>
            <p>依招標須知所訂定期限辦理，開工與完工日期將於決標後明訂於正式合約中。遲延完工依每日總工程款千分之一計罰違約金。</p>
        </div>
        
        <div class="space-y-2">
            <h4 class="font-bold text-base mt-6">第四條：付款辦法</h4>
            <p>一、本工程採分期付款方式，分為：訂金、粗驗款、細驗款、尾款四期。<br>
            二、各期款項需經 PCM 審查驗收節點，確認施工進度與品質符合規範後，由甲方透過平台或約定方式撥付。</p>
        </div>
    </div>
</div>

<!-- Bottom Action Bar -->
<div class="bg-white dark:bg-background-dark p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4 mt-8">
    <div class="flex items-center gap-3">
        <input type="checkbox" id="confirm_docs" class="w-5 h-5 rounded border-slate-300 text-primary focus:ring-primary cursor-pointer"/>
        <label for="confirm_docs" class="text-sm font-bold text-slate-700 dark:text-slate-300 cursor-pointer select-none">
            本人已詳閱且同意所有招標文件內容，並了解確認後將無法修改。
        </label>
    </div>
    
    <button class="w-full sm:w-auto px-8 py-3.5 bg-primary hover:bg-primary/90 text-white font-bold rounded-xl shadow-lg shadow-primary/30 transition-all flex items-center justify-center gap-2 group opacity-50 cursor-not-allowed" id="btn_proceed">
        前往繳納上架費
        <span class="material-symbols-outlined text-lg group-hover:translate-x-1 transition-transform">arrow_forward</span>
    </button>
</div>

</div>
</div>
</main>

<script>
    // 簡易前端互動：勾選後才啟用按鈕
    document.getElementById('confirm_docs').addEventListener('change', function(e) {
        const btn = document.getElementById('btn_proceed');
        if(e.target.checked) {
            btn.classList.remove('opacity-50', 'cursor-not-allowed');
            btn.classList.add('cursor-pointer');
        } else {
            btn.classList.add('opacity-50', 'cursor-not-allowed');
            btn.classList.remove('cursor-pointer');
        }
    });
</script>

</body></html>"""

WRITE_DESKTOP_COPY = False

path1 = r"c:\laibe_project\src\stitch_laibe_landing_onboarding\client_document_selection\code.html"
path2 = r"c:\Users\J\Desktop\for_ai_studio\public_owner_preflow\client_document_selection_code.html"

os.makedirs(os.path.dirname(path1), exist_ok=True)

with open(path1, "w", encoding="utf-8") as f:
    f.write(html_content)

if WRITE_DESKTOP_COPY:
    os.makedirs(os.path.dirname(path2), exist_ok=True)
    with open(path2, "w", encoding="utf-8") as f:
        f.write(html_content)

print("Files written successfully.")
