/**
 * PlanCraft Bridge - LaiBE System Integration
 * 
 * 核心功能：嫁接 PlanCraft 繪圖引擎與 LaiBE 制度限制系統。
 * 遵循制度：/config/laibe_policy.json - 空間幾何閉合原則 (Geometry Validation)
 */

/**
 * 驗證 PlanCraft 輸出的空間架構數據
 * @param {Object} schemaData - PlanCraft 輸出的 SpaceSchema JSON
 * @param {Array} schemaData.boundaries - 空間邊界數據
 * @param {Boolean} schemaData.isClosed - 幾何形狀是否完全閉合
 */
function validatePlanCraftSchema(schemaData) {
    console.log("[LaiBE Bridge] 正在校對空間幾何閉合狀態...");

    // 尋找受約束的動作按鈕
    const nextStepButton = findActionTrigger('下一步');
    const exportButtons = findAllActionTriggers('匯出');

    if (!schemaData || schemaData.isClosed === false) {
        // --- 執行制度攔截邏輯 (Violation Interception) ---
        
        // 1. 強制禁用決策入口 (Rule 1 & Rule 10: 禁止跳關與無效決策)
        if (nextStepButton) {
            nextStepButton.disabled = true;
            nextStepButton.style.opacity = "0.5";
            nextStepButton.style.cursor = "not-allowed";
            nextStepButton.innerHTML = `🔒 幾何未閉合 (鎖定)`;
            nextStepButton.classList.add('bg-gray-400');
            nextStepButton.classList.remove('bg-[#2C3E50]', 'hover:bg-[#1a252f]');
        }

        exportButtons.forEach(btn => {
            btn.disabled = true;
            btn.style.opacity = "0.5";
        });

        // 2. 渲染制度警告 (Risk as a Feature - Rule 7: 風險不能被隱藏)
        renderGeometryWarning();
        
        return {
            status: "疑似違規_需人工",
            reason: "空間幾何未閉合，將導致泥作/油漆預算失算。",
            allowTransition: false
        };
    } else {
        // --- 恢復合規狀態 (Compliance Path) ---
        if (nextStepButton) {
            nextStepButton.disabled = false;
            nextStepButton.style.opacity = "1.0";
            nextStepButton.style.cursor = "pointer";
            nextStepButton.innerHTML = `下一步：預算生成`;
            nextStepButton.classList.remove('bg-gray-400');
            nextStepButton.classList.add('bg-[#2C3E50]');
        }
        
        removeGeometryWarning();

        return {
            status: "合規",
            allowTransition: true
        };
    }
}

/**
 * 尋找介面上的動作觸發點 (模糊匹配)
 */
function findActionTrigger(text) {
    const buttons = Array.from(document.querySelectorAll('button'));
    return buttons.find(btn => btn.innerText.includes(text));
}

function findAllActionTriggers(text) {
    const buttons = Array.from(document.querySelectorAll('button'));
    return buttons.filter(btn => btn.innerText.includes(text));
}

/**
 * 渲染制度規定的警告 UI (Rule 8: Override 一定要讓人不舒服)
 */
function renderGeometryWarning() {
    let warningEl = document.getElementById('laibe-geometry-alert');
    if (!warningEl) {
        warningEl = document.createElement('div');
        warningEl.id = 'laibe-geometry-alert';
        // 使用 Morandi Red (#AD5A5A) 配合高強度提示
        warningEl.className = "fixed top-24 left-1/2 -translate-x-1/2 z-[9999] w-[90%] max-w-lg bg-[#FEF2F2] border-2 border-[#AD5A5A] p-6 rounded-xl shadow-2xl animate-bounce";
        warningEl.innerHTML = `
            <div class="flex items-start gap-4">
                <div class="bg-[#AD5A5A] text-white p-2 rounded-lg">
                    <span class="material-symbols-outlined">warning</span>
                </div>
                <div>
                    <h3 class="text-[#AD5A5A] font-bold text-lg mb-1">【強制攔截】空間幾何閉合異常</h3>
                    <p class="text-slate-600 text-sm leading-relaxed">
                        偵測到外框線段未完全閉合。根據 <span class="font-bold">LaiBE 制度 4.2 條</span>，形狀缺漏將導致「泥作工程」與「油漆面積」計算失真。
                        <br><br>
                        <span class="font-bold text-red-700">警告：系統已鎖定預算生成權限，請返回 PlanCraft 修正邊界。</span>
                    </p>
                </div>
            </div>
        `;
        document.body.appendChild(warningEl);
    }
}

function removeGeometryWarning() {
    const warningEl = document.getElementById('laibe-geometry-alert');
    if (warningEl) warningEl.remove();
}

// 輸出定義
if (typeof module !== 'undefined') {
    module.exports = { validatePlanCraftSchema };
}
