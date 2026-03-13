/**
 * LaiBE Guardrail (憲法官守衛機制)
 * 負責 AI 輸出的合規性攔截、檢索憲法條文，並維護 SSOT 狀態。
 */

const fs = require('fs');
const path = require('path');

// SSOT 檔案路徑
const SESSION_STATE_PATH = path.join(__dirname, '../config/session_state.json');

/**
 * 違憲關鍵字清單
 */
const FORBIDDEN_PHRASES = [
    '我保證',
    '這絕對沒問題',
    '我幫你決定',
    '建議您可以這樣設計比較好',
    '可以試試看',
    '稍微修改一下即可通過'
];

/**
 * 書記官形容詞黑名單 (去形容詞化濾網)
 */
const ADJECTIVE_BLACKLIST = [
    '美觀', '充滿設計感', '豪華', '高檔', '舒適',
    '完美', '最好', '相當不錯', '極具CP值', '溫馨', '精美', '划算'
];

/**
 * 檢查 AI 輸出是否合規 (Compliance Check)
 * @param {string} agentOutput - AI 生成的回覆文字
 * @returns {object} - { isCompliant: boolean, output: string }
 */
function checkCompliance(agentOutput) {
    console.log("[Guardrail] 執行 AI 輸出合憲性掃描...");

    for (let phrase of FORBIDDEN_PHRASES) {
        if (agentOutput.includes(phrase)) {
            console.warn(`[Guardrail 警告] 偵測到違憲關鍵字：『${phrase}』`);
            return {
                isCompliant: false,
                output: "[⛔ 違憲攔截] 系統已阻擋此回應。AI 試圖給予非授權之承諾或越權裁決，請強制重寫並僅依據憲法條文回應。"
            };
        }
    }

    // 去形容詞化過濾邏輯：若偵測到感性詞彙，根據指示替換為客觀宣告
    let hasAdjectives = false;
    for (let adj of ADJECTIVE_BLACKLIST) {
        if (agentOutput.includes(adj)) {
            console.log(`[Guardrail] 觸發去形容詞化濾網，移除: ${adj}`);
            hasAdjectives = true;
        }
    }

    if (hasAdjectives) {
        return {
            isCompliant: true,
            output: "『[客觀數據描述]：此設計包含指定規格材料，報價位於 SpecDB 合理區間。』"
        };
    }

    return {
        isCompliant: true,
        output: filteredOutput
    };
}

/**
 * 模擬 RAG 檢索憲法條文 (Query Constitution)
 * @param {string} topic - 查詢主題 (例如: '預算', '幾何', '草稿')
 * @returns {string} - 回傳對應的條款內容
 */
function queryConstitution(topic) {
    console.log(`[RAG 模擬] 正在從 laibe_constitution.md 檢索涉及『${topic}』的條款...`);

    // 這裡運用簡單的關鍵字 mock 檢索，模擬向量搜尋的結果
    const constitutionMock = {
        '草稿': 'PCM-301｜草稿非判定：AI 或人工撰寫之「審查草稿」非正式 verdict，須經人工點選核准後方可通知乙方。',
        '條文': 'CLA-002｜條文為唯一規則依據：所有爭議與行為應回對一條 Spec 條文或憲法條款；無條文即不得判定違規。',
        '預算': 'Rule 4｜不能改的東西，看起來就要不能改：禁止在預覽階段直接修改，若需變更必須退回編輯階段。',
        '幾何': 'Rule 10｜禁止跳關：偵測到外框未閉合時，強制禁用下一步或匯出按鈕，並發出泥作/油漆預算失真警告。'
    };

    const result = constitutionMock[topic];
    if (result) {
        // 遵循 RAG-401: 向量查詢所得條文或判例僅能作為「補充背景」，不可構成獨立判定依據。
        return `[檢索結果] ${result}\n(註: RAG 僅供輔助說明，非獨立判定依據)`;
    } else {
        return "[系統提示] 相關條文檢索無果。請 AI 恪守預設「書記官」底線，無條文即不得判定違規。";
    }
}

/**
 * 系統單一真相來源 (SSOT) 管理
 * 確保所有狀態 (幾何是否閉合、PCM 是否通過) 都彙整到 session_state.json
 */
function getSessionState() {
    if (!fs.existsSync(SESSION_STATE_PATH)) {
        // 初始狀態
        const initialState = {
            "geometry_status": { "is_closed": false, "last_updated": null },
            "pcm_audit_status": { "has_rejected": false, "all_approved": false },
            "current_phase": "editing"
        };
        // 確保 config 目錄存在
        const dir = path.dirname(SESSION_STATE_PATH);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        fs.writeFileSync(SESSION_STATE_PATH, JSON.stringify(initialState, null, 2));
        return initialState;
    }
    return JSON.parse(fs.readFileSync(SESSION_STATE_PATH, 'utf-8'));
}

function updateSessionState(category, value) {
    const state = getSessionState();

    // 合併狀態
    state[category] = { ...state[category], ...value };
    state.last_system_update = new Date().toISOString();

    fs.writeFileSync(SESSION_STATE_PATH, JSON.stringify(state, null, 2));
    console.log(`[SSOT 更新] session_state.json 狀態已同步：更新了 [${category}] 類別`);
    return state;
}

// 輸出模組
if (typeof module !== 'undefined') {
    module.exports = {
        checkCompliance,
        queryConstitution,
        getSessionState,
        updateSessionState
    };
}

// 測試腳本
if (require.main === module) {
    const testInput = '這是一個非常精美且高檔的設計，我覺得很划算';
    console.log("=== 測試去形容詞化濾網 ===");
    console.log("輸入: " + testInput);
    const result = checkCompliance(testInput);
    console.log("輸出: " + result.output);
}
