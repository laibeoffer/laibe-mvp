import type {
  BudgetOutputSnapshot,
  CustomerBudgetLine,
  InternalBudgetLine,
} from "../output/types.ts";
import {
  assertFormalRendererToken,
  type FormalRendererToken,
} from "./formal-renderer-token.ts";
import type {
  FormalLayoutProfile,
  FormalRendererAudience,
  RenderedBudgetCellValue,
  RenderedBudgetDocument,
  RenderedBudgetRow,
} from "./types.ts";

export interface FormalColumnSpec {
  key: string;
  label: string;
  width: number;
  align: "left" | "right" | "center";
  value_type: "text" | "number" | "boolean" | "object";
  customer_safe: boolean;
  visible: boolean;
}

export interface FormalSectionSpec {
  section_code: string;
  title: string;
  order: number;
  enabled: boolean;
}

export interface FormalSignatureBlock {
  enabled: boolean;
  signer_labels: string[];
  rows_reserved: number;
}

export interface FormalTotalsBlock {
  enabled: boolean;
  position: "after_trade_groups" | "document_footer";
  show_trade_subtotals: boolean;
  show_grand_total: boolean;
}

export interface FormalNotesBlock {
  enabled: boolean;
  position: "after_totals" | "document_footer";
  include_assumptions: boolean;
  include_warnings: boolean;
}

export interface FormalPaginationSpec {
  page_size: "A4";
  orientation: "portrait" | "landscape";
  rows_per_page: number;
  repeat_header: boolean;
  page_break_strategy: "by_row_count" | "by_trade_group";
}

export interface FormalLayoutContract {
  contract_id: string;
  audience: FormalRendererAudience;
  layout_profile: FormalLayoutProfile;
  page_header: {
    title: string;
    show_project_id: boolean;
    show_estimate_id: boolean;
    show_estimate_stage: boolean;
  };
  page_footer: {
    show_page_number: boolean;
    show_generated_at: boolean;
    footer_note: string;
  };
  columns: FormalColumnSpec[];
  sections: FormalSectionSpec[];
  signature_block: FormalSignatureBlock;
  totals_block: FormalTotalsBlock;
  notes_block: FormalNotesBlock;
  pagination: FormalPaginationSpec;
  style: {
    density: "standard" | "compact" | "trace";
    show_internal_trace: boolean;
  };
}

export interface FormalSkeletonInput {
  renderer_entry_token: FormalRendererToken;
  snapshot: BudgetOutputSnapshot;
  document: RenderedBudgetDocument;
  layout_contract: FormalLayoutContract;
  generated_at: string;
  render_id: string;
  title: string;
}

export const assertFormalSkeletonInputFromEntry = (
  input: FormalSkeletonInput,
): void => {
  assertFormalRendererToken(input.renderer_entry_token);
};

export const CUSTOMER_FORMAL_FIELD_KEYS = [
  "trade_category",
  "line_no",
  "item_name",
  "unit",
  "quantity",
  "unit_price",
  "amount",
  "customer_note",
];

export const INTERNAL_TRACE_FORMAL_FIELD_KEYS = [
  ...CUSTOMER_FORMAL_FIELD_KEYS,
  "item_code",
  "source_type",
  "source_id",
  "recipe_id",
  "material_code",
  "quantity_formula",
  "price_source",
  "confidence",
  "requires_review",
  "internal_note",
];

export const INTERNAL_TRACE_ONLY_FIELD_KEYS = INTERNAL_TRACE_FORMAL_FIELD_KEYS
  .filter((key) => !CUSTOMER_FORMAL_FIELD_KEYS.includes(key));

const customerColumns: FormalColumnSpec[] = [
  {
    key: "trade_category",
    label: "工程類別",
    width: 16,
    align: "left",
    value_type: "text",
    customer_safe: true,
    visible: true,
  },
  {
    key: "line_no",
    label: "項次",
    width: 8,
    align: "center",
    value_type: "text",
    customer_safe: true,
    visible: true,
  },
  {
    key: "item_name",
    label: "品名",
    width: 28,
    align: "left",
    value_type: "text",
    customer_safe: true,
    visible: true,
  },
  {
    key: "unit",
    label: "單位",
    width: 8,
    align: "center",
    value_type: "text",
    customer_safe: true,
    visible: true,
  },
  {
    key: "quantity",
    label: "數量",
    width: 10,
    align: "right",
    value_type: "number",
    customer_safe: true,
    visible: true,
  },
  {
    key: "unit_price",
    label: "單價",
    width: 12,
    align: "right",
    value_type: "number",
    customer_safe: true,
    visible: true,
  },
  {
    key: "amount",
    label: "金額",
    width: 14,
    align: "right",
    value_type: "number",
    customer_safe: true,
    visible: true,
  },
  {
    key: "customer_note",
    label: "備註",
    width: 36,
    align: "left",
    value_type: "text",
    customer_safe: true,
    visible: true,
  },
];

const internalTraceColumns: FormalColumnSpec[] = [
  ...customerColumns,
  {
    key: "item_code",
    label: "item_code",
    width: 24,
    align: "left",
    value_type: "text",
    customer_safe: false,
    visible: true,
  },
  {
    key: "source_type",
    label: "source_type",
    width: 18,
    align: "left",
    value_type: "text",
    customer_safe: false,
    visible: true,
  },
  {
    key: "source_id",
    label: "source_id",
    width: 30,
    align: "left",
    value_type: "text",
    customer_safe: false,
    visible: true,
  },
  {
    key: "recipe_id",
    label: "recipe_id",
    width: 28,
    align: "left",
    value_type: "text",
    customer_safe: false,
    visible: true,
  },
  {
    key: "material_code",
    label: "material_code",
    width: 24,
    align: "left",
    value_type: "text",
    customer_safe: false,
    visible: true,
  },
  {
    key: "quantity_formula",
    label: "quantity_formula",
    width: 34,
    align: "left",
    value_type: "text",
    customer_safe: false,
    visible: true,
  },
  {
    key: "price_source",
    label: "price_source",
    width: 36,
    align: "left",
    value_type: "object",
    customer_safe: false,
    visible: true,
  },
  {
    key: "confidence",
    label: "confidence",
    width: 12,
    align: "right",
    value_type: "number",
    customer_safe: false,
    visible: true,
  },
  {
    key: "requires_review",
    label: "requires_review",
    width: 14,
    align: "center",
    value_type: "boolean",
    customer_safe: false,
    visible: true,
  },
  {
    key: "internal_note",
    label: "internal_note",
    width: 40,
    align: "left",
    value_type: "text",
    customer_safe: false,
    visible: true,
  },
];

const makeSections = (audience: FormalRendererAudience): FormalSectionSpec[] => [
  {
    section_code: "budget_rows",
    title: "預算明細",
    order: 1,
    enabled: true,
  },
  {
    section_code: "trade_subtotals",
    title: "工程小計",
    order: 2,
    enabled: true,
  },
  {
    section_code: "notes",
    title: audience === "customer" ? "客戶備註" : "內部追溯備註",
    order: 3,
    enabled: true,
  },
  {
    section_code: "signatures",
    title: "簽核欄",
    order: 4,
    enabled: true,
  },
];

const profileConfig = (
  audience: FormalRendererAudience,
  profile: FormalLayoutProfile,
): Pick<FormalLayoutContract, "pagination" | "style" | "signature_block"> => {
  if (profile === "compact_a4") {
    return {
      pagination: {
        page_size: "A4",
        orientation: "portrait",
        rows_per_page: 28,
        repeat_header: true,
        page_break_strategy: "by_row_count",
      },
      style: {
        density: "compact",
        show_internal_trace: false,
      },
      signature_block: {
        enabled: true,
        signer_labels: ["甲方簽核", "萊比簽核"],
        rows_reserved: 3,
      },
    };
  }

  if (profile === "internal_trace_a4") {
    return {
      pagination: {
        page_size: "A4",
        orientation: "landscape",
        rows_per_page: 18,
        repeat_header: true,
        page_break_strategy: "by_trade_group",
      },
      style: {
        density: "trace",
        show_internal_trace: true,
      },
      signature_block: {
        enabled: true,
        signer_labels: ["Reviewer", "Estimator", "Approver"],
        rows_reserved: 4,
      },
    };
  }

  return {
    pagination: {
      page_size: "A4",
      orientation: "portrait",
      rows_per_page: 22,
      repeat_header: true,
      page_break_strategy: "by_trade_group",
    },
    style: {
      density: "standard",
      show_internal_trace: audience === "internal_trace",
    },
    signature_block: {
      enabled: true,
      signer_labels: ["甲方簽核", "萊比簽核"],
      rows_reserved: 4,
    },
  };
};

export const getFormalLayoutContract = (
  audience: FormalRendererAudience,
  profile: FormalLayoutProfile,
): FormalLayoutContract => {
  const config = profileConfig(audience, profile);

  return {
    contract_id: `formal-layout-${audience}-${profile}-v1`,
    audience,
    layout_profile: profile,
    page_header: {
      title:
        audience === "customer"
          ? "萊比裝潢預算單"
          : "萊比內部追溯預算單",
      show_project_id: true,
      show_estimate_id: true,
      show_estimate_stage: true,
    },
    page_footer: {
      show_page_number: true,
      show_generated_at: true,
      footer_note: "由 BudgetOutputSnapshot 產生，不重新計價。",
    },
    columns: audience === "customer" ? customerColumns : internalTraceColumns,
    sections: makeSections(audience),
    signature_block: config.signature_block,
    totals_block: {
      enabled: true,
      position: "after_trade_groups",
      show_trade_subtotals: true,
      show_grand_total: true,
    },
    notes_block: {
      enabled: true,
      position: "after_totals",
      include_assumptions: audience === "internal_trace",
      include_warnings: true,
    },
    pagination: config.pagination,
    style: config.style,
  };
};

const pickCells = (
  values: Record<string, RenderedBudgetCellValue>,
  columns: FormalColumnSpec[],
): Record<string, RenderedBudgetCellValue> =>
  columns.reduce<Record<string, RenderedBudgetCellValue>>((cells, column) => {
    cells[column.key] = values[column.key] ?? null;
    return cells;
  }, {});

const customerLineToValues = (
  line: CustomerBudgetLine,
): Record<string, RenderedBudgetCellValue> => ({
  trade_category: line.trade_category,
  line_no: line.line_no,
  item_name: line.item_name,
  unit: line.unit,
  quantity: line.quantity,
  unit_price: line.unit_price,
  amount: line.amount,
  customer_note: line.customer_note,
});

const internalLineToValues = (
  line: InternalBudgetLine,
): Record<string, RenderedBudgetCellValue> => ({
  trade_category: line.trade_category,
  line_no: line.line_no,
  item_name: line.item_name,
  unit: line.unit,
  quantity: line.quantity,
  unit_price: line.unit_price,
  amount: line.amount,
  customer_note: line.customer_note,
  item_code: line.item_code,
  source_type: line.source_type,
  source_id: line.source_id,
  recipe_id: line.recipe_id,
  material_code: line.material_code,
  quantity_formula: line.quantity_formula,
  price_source: JSON.stringify(line.price_source),
  confidence: line.confidence,
  requires_review: line.requires_review,
  internal_note: line.internal_note,
});

export const buildFormalRowsFromSnapshot = (
  snapshot: BudgetOutputSnapshot,
  layout: FormalLayoutContract,
): RenderedBudgetRow[] => {
  if (layout.audience === "customer") {
    return snapshot.customer_view.flatMap((group) =>
      group.lines.map((line) => ({
        cells: pickCells(customerLineToValues(line), layout.columns),
        metadata: {
          mode: "customer",
          trade_category: group.trade_category,
          line_no: line.line_no,
        },
      })),
    );
  }

  return snapshot.internal_view.flatMap((group) =>
    group.lines.map((line) => ({
      cells: pickCells(internalLineToValues(line), layout.columns),
      metadata: {
        mode: "internal_trace",
        trade_category: group.trade_category,
        line_no: line.line_no,
      },
    })),
  );
};

export const layoutHasInternalTraceColumns = (
  layout: FormalLayoutContract,
): boolean =>
  layout.columns.some((column) =>
    INTERNAL_TRACE_ONLY_FIELD_KEYS.includes(column.key),
  );
