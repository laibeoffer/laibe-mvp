/**
 * LaiBE Bidding Result Component
 * 決策儀表板邏輯：處理投標分數計算與業主翻盤免責聲明
 */

const fs = require('fs');
const path = require('path');

const SESSION_STATE_PATH = path.join(__dirname, '../config/session_state.json');

/**
 * 從系統狀態讀取並計算最終加權分數 (50% AI 量化, 50% 業主質化)
 * @param {string} bidId - 投標廠商 ID
 * @returns {object} 計算結果與翻盤免責聲明
 */
function calculateFinalScore(bidId) {
    if (!fs.existsSync(SESSION_STATE_PATH)) {
        throw new Error("系統真相來源 (session_state.json) 不存在，無法計算分數。");
    }

    const state = JSON.parse(fs.readFileSync(SESSION_STATE_PATH, 'utf-8'));
    const biddingData = state.bidding_scores || {};

    // 取得該廠商的量化與質化分數 (預設為 0)
    // 假設 state 結構擴展為 bidding_scores[bidId] 或依賴輸入，此處以範例結構模擬
    const quantitativeScore = typeof biddingData.quantitative_score === 'number' ? biddingData.quantitative_score : 80;
    const qualitativeScore = typeof biddingData.qualitative_score === 'number' ? biddingData.qualitative_score : 70;

    // 嚴格依照 laibe_policy.json 規範之 50% / 50% 權重計算
    const finalScore = (quantitativeScore * 0.5) + (qualitativeScore * 0.5);

    // 判定翻盤邏輯 (模擬系統最高分廠商ID為 'BID-SYS-TOP')
    const systemTopChoice = 'BID-SYS-TOP';
    const userSelection = bidId;

    let overrideWarning = null;

    if (userSelection !== systemTopChoice) {
        // 觸發甲方翻盤紀錄
        if (!Array.isArray(state.bidding_scores.user_override)) {
            state.bidding_scores.user_override = [];
        }
        state.bidding_scores.user_override.push({
            timestamp: new Date().toISOString(),
            selected_bid: userSelection,
            system_recommended_bid: systemTopChoice
        });

        // 寫回 SSOT
        fs.writeFileSync(SESSION_STATE_PATH, JSON.stringify(state, null, 2));

        // 生成法律免責聲明
        overrideWarning = `【系統免責宣告】
業主已行使裁量權，選擇非系統量化評分最高之廠商（${userSelection}）。
LaiBE 系統即刻起不對此選擇之「預算超支風險」、「工期延宕風險」承擔制度背書責任。
請業主確認已充分理解該廠商之 SpecDB 匹配率與文件完整度風險，並自行承擔後續履約之品質與成本變動。`;
    }

    return {
        bid_id: bidId,
        scores: {
            quantitative: quantitativeScore,
            qualitative: qualitativeScore,
            final_weighted: finalScore
        },
        warning: overrideWarning
    };
}

// 供 Node.js 環境測試或輸出
if (typeof module !== 'undefined') {
    module.exports = { calculateFinalScore };
}
