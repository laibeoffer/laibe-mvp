import type {
  BudgetSheetOutput,
  CustomerBudgetLine,
  InternalBudgetLine,
} from "./types.ts";

export const exportBudgetSheetToJson = (output: BudgetSheetOutput): string =>
  JSON.stringify(output, null, 2);

export const exportCustomerBudgetRows = (
  output: BudgetSheetOutput,
): CustomerBudgetLine[] => output.customer_view.flatMap((group) => group.lines);

export const exportInternalTraceRows = (
  output: BudgetSheetOutput,
): InternalBudgetLine[] => output.internal_view.flatMap((group) => group.lines);
