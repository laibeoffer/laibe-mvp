import { takeoffQuantities } from "./quantity-takeoff.ts";
import { matchMethodRecipes } from "./recipe-matcher.ts";
import { getTemplateItemCode } from "./storage/budget-catalog.ts";
import { seedBudgetCatalog } from "./storage/seed-budget-catalog.ts";
import type {
  AIGuidanceQuestion,
  BudgetCatalog,
  BudgetEstimate,
  BudgetEstimateLine,
  BudgetTradeGroup,
  PriceSource,
  PricingRule,
  Project,
  RecipeMatch,
  TradeCode,
} from "./types.ts";

const ENGINE_PIPELINE = [
  "LayoutObject",
  "QuantityFact",
  "MethodRecipe",
  "QuoteItemTemplate",
  "BudgetEstimateLine",
  "BudgetEstimate",
];

const TRADE_ORDER: TradeCode[] = ["woodwork", "masonry", "mep", "other"];

const FORMAL_ESTIMATE_BLOCKED_REASON_CODE =
  "plancraft_plus_formal_estimate_blocked";
const FORMAL_ESTIMATE_BLOCKED_MESSAGE =
  "Plancraft+ adapter output is candidate-only and cannot enter formal estimate generation.";

export interface FormalEstimateBlockCheck {
  blocked: boolean;
  reasonCode?: string;
  message?: string;
  guard?: unknown;
}

export class BudgetEstimateBlockedError extends Error {
  reasonCode: string;
  guard: unknown;

  constructor(
    message: string = FORMAL_ESTIMATE_BLOCKED_MESSAGE,
    reasonCode: string = FORMAL_ESTIMATE_BLOCKED_REASON_CODE,
    guard: unknown = null,
  ) {
    super(message);
    this.name = "BudgetEstimateBlockedError";
    this.reasonCode = reasonCode;
    this.guard = guard;
  }
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

export const isFormalEstimateBlocked = (
  project: Project,
): FormalEstimateBlockCheck => {
  const requirements = project.user_requirements ?? {};
  const formalGuard = requirements.formal_estimate_generation;
  const formalGuardRecord = isRecord(formalGuard) ? formalGuard : null;
  const formalGuardBlocked =
    formalGuard === "blocked" ||
    formalGuardRecord?.blocked === true ||
    formalGuardRecord?.status === "blocked";
  const productionReadyBlocked =
    requirements.productionReady === false ||
    requirements.production_ready === false;
  const adapterModeBlocked =
    requirements.adapter_mode === "plancraft_plus_spike" ||
    requirements.adapterMode === "plancraft_plus_spike";

  if (!formalGuardBlocked && !productionReadyBlocked && !adapterModeBlocked) {
    return { blocked: false };
  }

  return {
    blocked: true,
    reasonCode:
      typeof formalGuardRecord?.code === "string"
        ? formalGuardRecord.code
        : FORMAL_ESTIMATE_BLOCKED_REASON_CODE,
    message:
      typeof formalGuardRecord?.message === "string"
        ? formalGuardRecord.message
        : FORMAL_ESTIMATE_BLOCKED_MESSAGE,
    guard: formalGuardRecord ?? formalGuard ?? null,
  };
};

export const assertBudgetInputProductionReady = (project: Project): void => {
  const blockCheck = isFormalEstimateBlocked(project);

  if (blockCheck.blocked) {
    throw new BudgetEstimateBlockedError(
      blockCheck.message,
      blockCheck.reasonCode,
      blockCheck.guard,
    );
  }
};

const roundMoney = (value: number): number => Math.round(value);

const findPricingRule = (
  pricingRules: PricingRule[],
  quoteItemTemplateId: string,
  itemCode: string,
): PricingRule | undefined =>
  pricingRules.find(
    (rule) =>
      rule.quote_item_template_id === quoteItemTemplateId ||
      rule.item_code === itemCode,
  );

const missingPriceSource = (templateId: string): PriceSource => ({
  type: "missing_price_source",
  id: `missing-price-source:${templateId}`,
  label: "缺少 deterministic pricing rule",
});

const buildLine = (
  estimateId: string,
  projectId: string,
  match: RecipeMatch,
  lineIndex: number,
  subtotalBeforeManagementFee: number,
  pricingRules: PricingRule[],
): BudgetEstimateLine => {
  const pricingRule = findPricingRule(
    pricingRules,
    match.template.id,
    getTemplateItemCode(match.template),
  );
  const isPercentageRule =
    pricingRule?.pricing_type === "percentage_of_subtotal";
  const quantity = isPercentageRule ? 1 : match.quantity;
  const unitPrice = pricingRule
    ? isPercentageRule
      ? roundMoney(
          subtotalBeforeManagementFee * (pricingRule.percentage_rate ?? 0),
        )
      : pricingRule.unit_price ?? 0
    : 0;
  const amount = roundMoney(quantity * unitPrice);
  const requiresReview =
    match.requires_review || !pricingRule || pricingRule.requires_review;
  const confidence = Math.min(
    match.confidence,
    pricingRule?.confidence ?? 0,
  );

  return {
    line_id: `line-${String(lineIndex).padStart(3, "0")}-${match.template.id}`,
    estimate_id: estimateId,
    project_id: projectId,
    trade_code: match.template.trade_code,
    engineering_category: match.template.engineering_category,
    item_no: "",
    item_name: match.template.item_name,
    unit: match.template.unit,
    quantity,
    unit_price: unitPrice,
    amount,
    notes: match.template.default_notes,
    quote_item_template_id: match.template.id,
    source_type: match.source_type,
    source_id: match.source_id,
    recipe_id: match.recipe.recipe_id,
    quantity_formula: match.quantity_formula,
    quantity_fact_ids: match.quantity_fact_ids,
    price_source: pricingRule?.price_source ?? missingPriceSource(match.template.id),
    confidence,
    requires_review: requiresReview,
    assumptions: match.recipe.default_assumptions,
    review_reason:
      match.review_reason ??
      pricingRule?.review_reason ??
      (!pricingRule ? "缺少 pricing rule，需人工補齊價格來源。" : undefined),
  };
};

const assignItemNumbersAndGroups = (
  lines: BudgetEstimateLine[],
): {
  lines: BudgetEstimateLine[];
  tradeGroups: BudgetTradeGroup[];
} => {
  const orderedLines = [...lines].sort((left, right) => {
    const tradeDiff =
      TRADE_ORDER.indexOf(left.trade_code) -
      TRADE_ORDER.indexOf(right.trade_code);
    if (tradeDiff !== 0) {
      return tradeDiff;
    }
    return left.line_id.localeCompare(right.line_id);
  });

  const groups: BudgetTradeGroup[] = [];

  for (const tradeCode of TRADE_ORDER) {
    const tradeLines = orderedLines.filter((line) => line.trade_code === tradeCode);
    if (tradeLines.length === 0) {
      continue;
    }

    const groupIndex = groups.length + 1;
    tradeLines.forEach((line, index) => {
      line.item_no = `${groupIndex}.${index + 1}`;
    });

    groups.push({
      trade_code: tradeCode,
      engineering_category: tradeLines[0].engineering_category,
      subtotal_amount: roundMoney(
        tradeLines.reduce((sum, line) => sum + line.amount, 0),
      ),
      line_ids: tradeLines.map((line) => line.line_id),
    });
  }

  return {
    lines: orderedLines,
    tradeGroups: groups,
  };
};

const makeGuidanceQuestions = (
  projectId: string,
  lines: BudgetEstimateLine[],
): AIGuidanceQuestion[] =>
  lines
    .filter((line) => line.requires_review)
    .map((line, index) => ({
      question_id: `guide-q-${String(index + 1).padStart(3, "0")}-${line.line_id}`,
      project_id: projectId,
      question_type: "review_prompt",
      trigger_source_type: line.source_type,
      trigger_source_id: line.source_id,
      related_recipe_id: line.recipe_id,
      related_line_id: line.line_id,
      question_text: `請確認「${line.item_name}」的範圍或條件是否符合實際專案。`,
      answer_options: [
        {
          label: "沿用目前 mock 假設",
          value: "keep_mock_assumption",
        },
        {
          label: "需要人工補充範圍",
          value: "needs_manual_scope_review",
        },
        {
          label: "暫不納入本次預算",
          value: "exclude_from_current_estimate",
        },
      ],
      user_answer: null,
      structured_assumption: null,
      risk_level: line.confidence < 0.6 ? "medium" : "low",
      requires_review: true,
      status: "open",
    }));

export const generateBudgetEstimate = (
  project: Project,
  catalog: BudgetCatalog = seedBudgetCatalog,
): BudgetEstimate => {
  assertBudgetInputProductionReady(project);

  const estimateId = `estimate-${project.id}-mock-v1`;
  const quantityFacts = takeoffQuantities(project);
  const matches = matchMethodRecipes(
    project,
    quantityFacts,
    catalog.method_recipes,
    catalog.quote_item_templates,
  );

  const nonManagementMatches = matches.filter(
    (match) => match.template.id !== "qit-other-management-fee",
  );
  const managementMatches = matches.filter(
    (match) => match.template.id === "qit-other-management-fee",
  );

  const baseLines = nonManagementMatches.map((match, index) =>
    buildLine(
      estimateId,
      project.id,
      match,
      index + 1,
      0,
      catalog.pricing_rules,
    ),
  );
  const subtotalBeforeManagementFee = roundMoney(
    baseLines.reduce((sum, line) => sum + line.amount, 0),
  );
  const managementLines = managementMatches.map((match, index) =>
    buildLine(
      estimateId,
      project.id,
      match,
      baseLines.length + index + 1,
      subtotalBeforeManagementFee,
      catalog.pricing_rules,
    ),
  );

  const { lines, tradeGroups } = assignItemNumbersAndGroups([
    ...baseLines,
    ...managementLines,
  ]);
  const totalAmount = roundMoney(
    lines.reduce((sum, line) => sum + line.amount, 0),
  );

  return {
    estimate_id: estimateId,
    project_id: project.id,
    estimate_stage: "mock",
    generated_at: new Date().toISOString(),
    pipeline: ENGINE_PIPELINE,
    total_amount: totalAmount,
    trade_groups: tradeGroups,
    lines,
    quantity_facts: quantityFacts,
    assumptions: [
      "目前使用本地 seed catalog 與 deterministic budget engine。",
      "所有單價皆來自 seed catalog 中的固定 mock PricingRule。",
      "浴室壁磚與地磚貼工先以每間浴室一式估算。",
      "工程管理費先以總工程款 8% 估算。",
    ],
    exclusions: [
      "不含真實 AI API、RAG、資料庫或歷史報價查詢。",
      "不含付款、escrow、listing fee 或 fund release。",
      "不含稅務、合約、法規或專業工程簽核。",
      "不含拆除、搬運、追加減項與實際現場丈量差異。",
    ],
    ai_guidance_questions: makeGuidanceQuestions(project.id, lines),
    review_required_lines: lines
      .filter((line) => line.requires_review)
      .map((line) => line.line_id),
  };
};
