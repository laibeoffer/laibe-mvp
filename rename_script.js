const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, 'src');

const renameMap = {
    'laibe_官網入口_(desktop)': 'laibe_landing_desktop',
    'step_1：需求表單填寫介面': 'step_1_requirement_form',
    '上架費繳交與功能解鎖_1': 'listing_fee_payment_1',
    '上架費繳交與功能解鎖_2': 'listing_fee_payment_2',
    '合約自動生成與參數調整介面_1': 'contract_generation_1',
    '合約自動生成與參數調整介面_2': 'contract_generation_2',
    '專業空間建模編輯器_-_功能微調版_1': 'spatial_modeling_editor_1',
    '專業空間建模編輯器_-_功能微調版_2': 'spatial_modeling_editor_2',
    '專業空間建模編輯器_-_功能微調版_3': 'spatial_modeling_editor_3',
    '工程流程時間軸與治理中心': 'project_timeline_and_governance',
    '工程結案與保固管理_(closeout_&_warranty)': 'closeout_and_warranty',
    '工程請款與審核工作流_(draw_request)': 'draw_request_workflow',
    '工程預算明細校對_(step_3)_-_結構重組版_1': 'step_3_budget_check_1',
    '工程預算明細校對_(step_3)_-_結構重組版_2': 'step_3_budget_check_2',
    '工程預算明細校對_(step_3)_-_結構重組版_3': 'step_3_budget_check_3',
    '標案條件設定頁_-_進度條修正版_1': 'tender_conditions_1',
    '標案條件設定頁_-_進度條修正版_2': 'tender_conditions_2',
    '標案條件設定頁_-_進度條修正版_3': 'tender_conditions_3',
    '標案條件設定頁_-_進度條修正版_4': 'tender_conditions_4',
    '標案發布成功狀態頁面': 'tender_publish_success',
    '獨立預覽：提案工法書_(new_tab)': 'preview_method_statement',
    '獨立預覽：提案平面圖_(new_tab)': 'preview_floor_plan',
    '獨立預覽：提案預算書_(new_tab)': 'preview_budget',
    '甲方文件選擇入口介面': 'client_document_selection',
    '發案流程起點與類型選定': 'project_initiation_and_type',
    '程序升級引擎設定_(escalation_builder)': 'escalation_builder',
    '競標方案比較與_ai_摘要介面': 'bid_comparison_and_ai_summary',
    '競標資金自動化退還流程頁面_(deposit_logic)': 'deposit_refund_logic',
    '里程碑與撥款節點設計器_(milestone_designer)': 'milestone_designer'
};

const results = {
    success: [],
    skipped: []
};

// 用以判斷字串是否包含中文
function hasChinese(str) {
    return /[\u4E00-\u9FFF]/.test(str);
}

function processDirectory(currentPath) {
    if (!fs.existsSync(currentPath)) return;

    let items;
    try {
        items = fs.readdirSync(currentPath);
    } catch (err) {
        results.skipped.push(`讀取目錄失敗 [${currentPath}]: ${err.message}`);
        return;
    }

    for (const item of items) {
        const fullPath = path.join(currentPath, item);

        let stat;
        try {
            stat = fs.statSync(fullPath);
        } catch (err) {
            results.skipped.push(`讀取狀態失敗 [${fullPath}]: ${err.message}`);
            continue;
        }

        if (stat.isDirectory()) {
            // 先遞迴處理子目錄
            processDirectory(fullPath);

            if (hasChinese(item)) {
                let newName = renameMap[item];
                if (!newName) {
                    // 如果沒有在 mapping 裡，嘗試用簡單拼音或預設名稱，這裡先加上 generic_ 名稱並將原本括號內英文保留
                    const match = item.match(/\(([a-zA-Z0-9_&]+)\)/);
                    if (match) {
                        newName = match[1].toLowerCase().replace(/[^a-z0-9_]/g, '_');
                    } else {
                        newName = 'dir_' + Date.now() + '_' + Math.floor(Math.random() * 1000);
                    }
                }

                const newFullPath = path.join(currentPath, newName);
                try {
                    fs.renameSync(fullPath, newFullPath);
                    results.success.push(`${item} -> ${newName}`);
                } catch (err) {
                    results.skipped.push(`重命名失敗 [${item} -> ${newName}]: ${err.message}`);
                }
            }
        }
        // 也可以處理檔案，如果有的話
        else if (stat.isFile() && hasChinese(item)) {
            let newName = item.replace(/[\u4E00-\u9FFF]/g, '').replace(/_+/g, '_').replace(/^_|_$/g, '');
            if (newName === '' || newName === '.html' || newName === '.js' || newName === '.css' || newName === '.png') {
                newName = 'file_' + Date.now() + path.extname(item);
            }

            const newFullPath = path.join(currentPath, newName);
            try {
                fs.renameSync(fullPath, newFullPath);
                results.success.push(`${item} -> ${newName}`);
            } catch (err) {
                results.skipped.push(`重命名檔案失敗 [${item} -> ${newName}]: ${err.message}`);
            }
        }
    }
}

console.log('開始掃描與重命名 /src 目錄...');
processDirectory(srcDir);

console.log('\n================ 重命名結果清單 ================');
if (results.success.length > 0) {
    console.log('✅ 成功重命名：');
    results.success.forEach(msg => console.log('  - ' + msg));
} else {
    console.log('無任何項目被重命名。');
}

if (results.skipped.length > 0) {
    console.log('\n⚠️ 被跳過 / 發生錯誤的漏網之魚：');
    results.skipped.forEach(msg => console.log('  - ' + msg));
} else {
    console.log('\n🎉 所有符合條件的項目皆成功處理，無任何漏網之魚！');
}
console.log('===============================================\n');
