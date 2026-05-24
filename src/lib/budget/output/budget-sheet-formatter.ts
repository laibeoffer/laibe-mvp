import type { BudgetEstimate } from "../types.ts";
import type { MethodSpecCatalog } from "../specs/types.ts";
import { enrichBudgetLines } from "./budget-line-enricher.ts";
import type {
  BudgetSheetOutput,
  BudgetSheetTradeGroup,
  CustomerBudgetLine,
  InternalBudgetLine,
} from "./types.ts";

const TRADE_CATEGORY_ORDER = [
  "保護工程",
  "木作工程",
  "泥作工程",
  "水電工程",
  "其他",
];

const roundMoney = (value: number): number => Math.round(value);

const groupSortIndex = (tradeCategory: string): number => {
  const index = TRADE_CATEGORY_ORDER.indexOf(tradeCategory);
  return index === -1 ? TRADE_CATEGORY_ORDER.length : index;
};

const toCustomerLine = (line: InternalBudgetLine): CustomerBudgetLine => ({
  trade_category: line.trade_category,
  line_no: line.line_no,
  item_name: line.item_name,
  unit: line.unit,
  quantity: line.quantity,
  unit_price: line.unit_price,
  amount: line.amount,
  customer_note: line.customer_note,
});

const buildGroups = (
  lines: InternalBudgetLine[],
): {
  customerGroups: BudgetSheetTradeGroup<CustomerBudgetLine>[];
  internalGroups: BudgetSheetTradeGroup<InternalBudgetLine>[];
} => {
  const categories = unique(lines.map((line) => line.trade_category)).sort(
    (left, right) => {
      const orderDiff = groupSortIndex(left) - groupSortIndex(right);
      return orderDiff === 0 ? left.localeCompare(right) : orderDiff;
    },
  );

  const internalGroups: BudgetSheetTradeGroup<InternalBudgetLine>[] = [];
  const customerGroups: BudgetSheetTradeGroup<CustomerBudgetLine>[] = [];

  categories.forEach((tradeCategory, groupIndex) => {
    const groupLines = lines
      .filter((line) => line.trade_category === tradeCategory)
      .map((line, lineIndex) => ({
        ...line,
        line_no: `${groupIndex + 1}.${lineIndex + 1}`,
      }));
    const subtotal = roundMoney(
      groupLines.reduce((sum, line) => sum + line.amount, 0),
    );

    internalGroups.push({
      trade_category: tradeCategory,
      lines: groupLines,
      subtotal,
    });
    customerGroups.push({
      trade_category: tradeCategory,
      lines: groupLines.map(toCustomerLine),
      subtotal,
    });
  });

  return {
    customerGroups,
    internalGroups,
  };
};

const unique = (values: string[]): string[] => [...new Set(values)];

export const formatBudgetSheetOutput = (
  estimate: BudgetEstimate,
  methodSpecCatalog: MethodSpecCatalog,
): BudgetSheetOutput => {
  const enrichedLines = enrichBudgetLines(estimate.lines, methodSpecCatalog);
  const { customerGroups, internalGroups } = buildGroups(enrichedLines);
  const internalLines = internalGroups.flatMap((group) => group.lines);
  const reviewRequiredLines = internalLines.filter((line) => line.requires_review);
  const totalAmount = roundMoney(
    internalLines.reduce((sum, line) => sum + line.amount, 0),
  );

  return {
    estimate_id: estimate.estimate_id,
    project_id: estimate.project_id,
    stage: estimate.estimate_stage,
    generated_at: estimate.generated_at,
    customer_view: customerGroups,
    internal_view: internalGroups,
    totals: {
      total_amount: totalAmount,
      customer_line_count: customerGroups.flatMap((group) => group.lines).length,
      internal_line_count: internalLines.length,
      trade_group_count: internalGroups.length,
      review_required_count: reviewRequiredLines.length,
    },
    warnings: reviewRequiredLines.map(
      (line) => `需複核: ${line.line_no} ${line.item_name}`,
    ),
  };
};
