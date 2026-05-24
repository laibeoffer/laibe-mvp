import os

html_content = """<!DOCTYPE html>
<html lang="zh-TW">
<head>
<meta charset="utf-8"/>
<meta content="width=device-width, initial-scale=1.0" name="viewport"/>
<title>萊比 Laibe - 預算書預覽</title>
<!-- Tailwind CSS v3 with plugins -->
<script src="https://cdn.tailwindcss.com?plugins=forms,container-queries"></script>
<script>
    tailwind.config = {
      theme: {
        extend: {
          colors: {
            laibe: {
              red: '#AD5A5A',
              dark: '#3D4D4D',
              gold: '#E9C46A',
              light: '#F9F8F6',
              border: '#E2E8F0'
            }
          },
          fontFamily: {
            sans: ['Inter', 'Manrope', 'Noto Sans TC', 'sans-serif'],
          }
        }
      }
    }
  </script>
<style data-purpose="custom-typography">
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Manrope:wght@400;500;600;700&family=Noto+Sans+TC:wght@400;500;700&display=swap');

    .document-shadow {
      box-shadow: 0 10px 30px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1);
    }

    .status-badge {
      display: inline-flex;
      align-items: center;
      padding: 0.25rem 0.75rem;
      border-radius: 9999px;
      font-size: 0.75rem;
      font-weight: 500;
    }
  </style>
</head>
<body class="bg-laibe-light font-sans text-slate-800 antialiased min-h-screen">
<!-- BEGIN: Navigation Header -->
<header class="bg-white border-b border-laibe-border sticky top-0 z-50">
<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
<div class="flex items-center gap-8">
<a href="../laibe_landing_desktop/code.html" class="flex items-center hover:opacity-80 transition" title="返回首頁">
    <img src="../../../assets/logo/laibe_header.png" alt="LaiBE Logo" class="h-[30px] md:h-[40px] w-auto object-contain" />
</a>
<nav class="hidden md:flex space-x-6 text-sm font-medium text-slate-500">
<a class="hover:text-laibe-red transition-colors" href="#">導引討論</a>
<a class="hover:text-laibe-red transition-colors" href="#">平面配置</a>
<a class="text-laibe-red border-b-2 border-laibe-red pb-1" href="#">預算總覽</a>
<a class="hover:text-laibe-red transition-colors" href="#">招標管理</a>
</nav>
</div>
<div class="flex items-center gap-4">
<div class="relative">
<input class="bg-slate-100 border-none rounded-full py-1.5 pl-4 pr-10 text-sm focus:ring-laibe-red w-48" placeholder="搜尋項目..." type="text"/>
<svg class="w-4 h-4 absolute right-3 top-2 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"></path></svg>
</div>
<div class="w-8 h-8 rounded-full bg-slate-200 overflow-hidden">
<img alt="User Avatar" src="https://lh3.googleusercontent.com/aida-public/AB6AXuDXyroKIS02eja4RlkI5gYbHJFUqWoJEu4bfU14zTnSWEJrfzjPMlYakd6qpU8WMrUqZJ5CdGyWOJeDHVnEQ5T5vw8EwTmKR385RjucNGJxq-dS9ixjdvmMTLB88XTqsQzkobCNA9Ctn5GDmPKEPHPS5CrxJKqPq-2N7EH7MHqyFFTbNM6HKUn7PvtVOwC84vNxsTLsX1Wz0f3xc_sVxqIRbL7Zo-g_E32HoF4nFxkG8CJj5O2up7anxklqm4kYCm4wivgA9_ngtcY"/>
</div>
</div>
</div>
</header>
<!-- END: Navigation Header -->
<main class="max-w-5xl mx-auto py-10 px-4">
<!-- BEGIN: Stepper Component -->
<section class="mb-12" data-purpose="stepper">
<div class="flex items-center justify-between max-w-3xl mx-auto">
<!-- Step 1 -->
<div class="flex flex-col items-center gap-2 group">
<div class="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-slate-500 text-xs font-bold border-2 border-white shadow-sm">
<svg class="w-4 h-4 text-emerald-500" fill="currentColor" viewBox="0 0 20 20"><path clip-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" fill-rule="evenodd"></path></svg>
</div>
<span class="text-xs text-slate-400 font-medium">1. 需求討論</span>
</div>
<div class="flex-1 h-px bg-slate-200 mb-6"></div>
<!-- Step 2 -->
<div class="flex flex-col items-center gap-2">
<div class="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-slate-500 text-xs font-bold border-2 border-white shadow-sm">
<svg class="w-4 h-4 text-emerald-500" fill="currentColor" viewBox="0 0 20 20"><path clip-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" fill-rule="evenodd"></path></svg>
</div>
<span class="text-xs text-slate-400 font-medium">2. 平面拼圖</span>
</div>
<div class="flex-1 h-px bg-slate-200 mb-6"></div>
<!-- Step 3 -->
<div class="flex flex-col items-center gap-2">
<div class="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-slate-500 text-xs font-bold border-2 border-white shadow-sm">
<svg class="w-4 h-4 text-emerald-500" fill="currentColor" viewBox="0 0 20 20"><path clip-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" fill-rule="evenodd"></path></svg>
</div>
<span class="text-xs text-slate-400 font-medium">3. 預算生成</span>
</div>
<div class="flex-1 h-px bg-slate-200 mb-6"></div>
<!-- Step 4 -->
<div class="flex flex-col items-center gap-2">
<div class="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-slate-500 text-xs font-bold border-2 border-white shadow-sm">
<svg class="w-4 h-4 text-emerald-500" fill="currentColor" viewBox="0 0 20 20"><path clip-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" fill-rule="evenodd"></path></svg>
</div>
<span class="text-xs text-slate-400 font-medium">4. 預算編輯</span>
</div>
<div class="flex-1 h-px bg-laibe-red mb-6"></div>
<!-- Step 5 (Active) -->
<div class="flex flex-col items-center gap-2">
<div class="w-10 h-10 rounded-full bg-laibe-red text-white flex items-center justify-center text-sm font-bold ring-4 ring-red-100 shadow-md">5</div>
<span class="text-xs text-laibe-red font-bold">5. 預算書預覽</span>
</div>
</div>
</section>
<!-- END: Stepper Component -->
<!-- BEGIN: Main Document Card -->
<article class="bg-white rounded-xl document-shadow mb-8 overflow-hidden relative" data-purpose="budget-document">
<!-- Document Header Decor -->
<div class="h-2 bg-laibe-red w-full"></div>
<div class="p-12 md:p-16">
<!-- Badge and Status -->
<div class="flex justify-between items-start mb-10">
<div class="flex flex-col gap-1">
<span class="inline-flex items-center px-3 py-1 bg-slate-100 text-slate-600 rounded-full text-xs font-bold tracking-widest uppercase">
<svg class="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20"><path clip-rule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.64.304 1.24.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" fill-rule="evenodd"></path></svg>
              預算定案總覽
            </span>
<p class="text-[10px] text-slate-400 mt-1">版本號：v1.2 (定案版) | 生成時間：2024-05-20</p>
</div>
<div class="text-right">
<h1 class="text-3xl font-bold text-laibe-dark tracking-tight">預算書</h1>
<p class="text-slate-400 text-xs mt-1">Budget Statement</p>
</div>
</div>
<!-- Project Info -->
<div class="text-center mb-12">
<h2 class="text-2xl font-bold text-laibe-dark mb-4">南崗工業區服務中心整修工程</h2>
<p class="text-slate-400 text-sm mb-6">總預算預估 Estimated Total Budget</p>
<div class="inline-block relative">
<span class="text-5xl md:text-6xl font-extrabold text-[#D29D8F] tracking-tight">$18,500,000</span>
<div class="h-1 bg-[#D29D8F]/20 absolute -bottom-2 left-0 w-full rounded-full"></div>
</div>
</div>
<!-- Budget Table -->
<div class="mb-12 border-t border-b border-laibe-border py-2">
<table class="w-full text-left" id="budget-summary-table">
<thead>
<tr class="text-xs text-slate-400 uppercase tracking-wider">
<th class="py-4 font-semibold w-16">項次</th>
<th class="py-4 font-semibold">工程大項</th>
<th class="py-4 font-semibold text-right">預估金額 (NT$)</th>
</tr>
</thead>
<tbody class="divide-y divide-slate-100">
<tr class="hover:bg-slate-50 transition-colors">
<td class="py-5 text-sm text-slate-400 font-mono">01</td>
<td class="py-5 text-base font-semibold text-laibe-dark">一、假設工程</td>
<td class="py-5 text-right font-mono text-lg text-[#D29D8F] font-bold">1,280,000</td>
</tr>
<tr class="hover:bg-slate-50 transition-colors">
<td class="py-5 text-sm text-slate-400 font-mono">02</td>
<td class="py-5 text-base font-semibold text-laibe-dark">二、拆除工程</td>
<td class="py-5 text-right font-mono text-lg text-[#D29D8F] font-bold">850,000</td>
</tr>
<tr class="hover:bg-slate-50 transition-colors">
<td class="py-5 text-sm text-slate-400 font-mono">03</td>
<td class="py-5 text-base font-semibold text-laibe-dark">三、外牆工程</td>
<td class="py-5 text-right font-mono text-lg text-[#D29D8F] font-bold">2,869,000</td>
</tr>
<tr class="hover:bg-slate-50 transition-colors">
<td class="py-5 text-sm text-slate-400 font-mono">04</td>
<td class="py-5 text-base font-semibold text-laibe-dark">四、泥作工程</td>
<td class="py-5 text-right font-mono text-lg text-[#D29D8F] font-bold">1,050,000</td>
</tr>
</tbody>
</table>
</div>
<!-- Footer Note -->
<div class="flex flex-col md:flex-row justify-between items-center gap-6">
<div class="flex items-start gap-3 bg-slate-50 p-4 rounded-lg flex-1">
<svg class="w-5 h-5 text-slate-400 mt-0.5 shrink-0" fill="currentColor" viewBox="0 0 20 20"><path clip-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" fill-rule="evenodd"></path></svg>
<p class="text-xs text-slate-500 leading-relaxed">
              價格已包含 5% 營業稅與相關管理費用。完整施工工法與材料細節另附於工法說明書，並可隨空白標單或整體明細表一併輸出。
            </p>
</div>
<div class="text-xs text-slate-400 whitespace-nowrap">
            第 1 頁 / 共 1 頁
          </div>
</div>
</div>
</article>
<!-- END: Main Document Card -->
"""

html_content_2 = """<!-- BEGIN: Attachment Status Area -->
<section class="mb-12 bg-white/50 backdrop-blur-sm border border-laibe-border rounded-xl p-6" data-purpose="attachment-status">
<div class="grid grid-cols-2 md:grid-cols-4 gap-4">
<!-- Status 1 -->
<div class="flex items-center gap-3 p-3 bg-white rounded-lg border border-emerald-100 shadow-sm">
<div class="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600">
<svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z"></path><path clip-rule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z" fill-rule="evenodd"></path></svg>
</div>
<div>
<p class="text-xs font-bold text-slate-700">預算書</p>
<span class="text-[10px] text-emerald-600 font-medium">已生成</span>
</div>
</div>
<!-- Status 2 -->
<div class="flex items-center gap-3 p-3 bg-white rounded-lg border border-emerald-100 shadow-sm">
<div class="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600">
<svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path d="M11 3a1 1 0 10-2 0v1a1 1 0 102 0V3zM5.884 6.923a1 1 0 10-1.414-1.414l-.707.707a1 1 0 101.414 1.414l.707-.707zm11.314 1.414a1 1 0 00-1.414-1.414l-.707.707a1 1 0 101.414 1.414l.707-.707zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zM5 11a1 1 0 100-2H4a1 1 0 100 2h1zM8 14a1 1 0 100 2h4a1 1 0 100-2H8z"></path></svg>
</div>
<div>
<p class="text-xs font-bold text-slate-700">工法說明書</p>
<span class="text-[10px] text-emerald-600 font-medium">已連結</span>
</div>
</div>
<!-- Status 3 -->
<div class="flex items-center gap-3 p-3 bg-white rounded-lg border border-laibe-border shadow-sm">
<div class="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
<svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path clip-rule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" fill-rule="evenodd"></path></svg>
</div>
<div>
<p class="text-xs font-bold text-slate-700">空白標單</p>
<span class="text-[10px] text-blue-600 font-medium">可下載</span>
</div>
</div>
<!-- Status 4 -->
<div class="flex items-center gap-3 p-3 bg-white rounded-lg border border-emerald-100 shadow-sm">
<div class="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600">
<svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path clip-rule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" fill-rule="evenodd"></path></svg>
</div>
<div>
<p class="text-xs font-bold text-slate-700">圖面對照</p>
<span class="text-[10px] text-emerald-600 font-medium">已附入</span>
</div>
</div>
</div>
</section>
<!-- END: Attachment Status Area -->
<!-- BEGIN: Bottom Action Cards -->
<section class="grid grid-cols-1 md:grid-cols-3 gap-6" data-purpose="bottom-actions">
<!-- Back Card -->
<button class="flex flex-col items-center justify-center p-8 bg-white border border-laibe-border rounded-2xl hover:bg-slate-50 transition-all group shadow-sm">
<div class="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mb-4 text-slate-400 group-hover:text-laibe-dark transition-colors">
<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M10 19l-7-7m0 0l7-7m-7 7h18" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"></path></svg>
</div>
<h3 class="text-lg font-bold text-laibe-dark mb-1">返回預算總覽</h3>
<p class="text-xs text-slate-400">返回 Step 4 修改細節</p>
</button>
<!-- Download Blank Card -->
<button class="flex flex-col items-center justify-center p-8 bg-laibe-gold/20 border border-laibe-gold/40 rounded-2xl hover:bg-laibe-gold/30 transition-all group shadow-sm">
<div class="w-12 h-12 bg-laibe-gold/40 rounded-full flex items-center justify-center mb-4 text-laibe-dark">
<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"></path></svg>
</div>
<h3 class="text-lg font-bold text-laibe-dark mb-1">下載空白標單</h3>
<p class="text-xs text-laibe-dark/60">隱藏單價供發包使用</p>
</button>
<!-- Primary Export Card -->
<button class="flex flex-col items-center justify-center p-8 bg-laibe-red text-white rounded-2xl hover:bg-red-800 transition-all group shadow-md shadow-red-200">
<div class="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center mb-4">
<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"></path></svg>
</div>
<h3 class="text-lg font-bold mb-1">匯出正式預算 (PDF)</h3>
<p class="text-xs text-white/70">產出附錄圖面之完整文件</p>
</button>
</section>
<!-- END: Bottom Action Cards -->
</main>
<footer class="mt-20 py-8 text-center text-[10px] text-slate-400 border-t border-laibe-border">
<p>© 2024 Laibe 智慧家裝室內設計。保留所有權利。僅供專業估算參考使用。</p>
</footer>
</body></html>
"""

full_html = html_content + html_content_2

WRITE_DESKTOP_COPY = False

path1 = r"c:\laibe_project\src\stitch_laibe_landing_onboarding\budget_document_preview\code.html"
path2 = r"c:\Users\J\Desktop\for_ai_studio\public_owner_preflow\budget_document_preview_code.html"

os.makedirs(os.path.dirname(path1), exist_ok=True)

with open(path1, "w", encoding="utf-8") as f:
    f.write(full_html)

if WRITE_DESKTOP_COPY:
    os.makedirs(os.path.dirname(path2), exist_ok=True)
    with open(path2, "w", encoding="utf-8") as f:
        f.write(full_html)

print("Files written successfully.")
