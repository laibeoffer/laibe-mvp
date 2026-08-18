import {
  addQuoteDecimals,
  multiplyQuoteDecimals,
  quoteDecimalsEqual,
} from "./decimal.ts";
import type {
  EvidencePointer,
  NormalizedQuoteRow,
  QuoteExtractionPacketV1,
  QuoteFindingCode,
  QuoteHealthFinding,
} from "./types.ts";

type FindingDraft = Omit<QuoteHealthFinding, "findingId">;

const finding = (
  code: QuoteFindingCode,
  category: QuoteHealthFinding["category"],
  severity: QuoteHealthFinding["severity"],
  message: string,
  evidence: EvidencePointer[],
): FindingDraft => ({ code, category, severity, message, evidence });

const known = (value: NormalizedQuoteRow["quantity"]): string | null =>
  value.status === "KNOWN" ? value.value : null;

const rowText = (row: NormalizedQuoteRow): string =>
  [row.itemName ?? "", ...row.notes].join(" ");

const duplicateSignature = (row: NormalizedQuoteRow): string =>
  JSON.stringify([
    row.itemName?.trim().toLocaleLowerCase() ?? null,
    row.unit?.trim().toLocaleLowerCase() ?? null,
    row.quantity,
    row.unitPrice,
    row.multiplier,
    row.declaredAmount,
    row.notes,
  ]);

const wordingRules: ReadonlyArray<{
  token: string;
  code: QuoteFindingCode;
  message: string;
}> = [
  {
    token: "\u4e00\u5f0f",
    code: "AMBIGUOUS_LUMP_SUM",
    message: "Lump-sum wording requires scope confirmation.",
  },
  {
    token: "\u4f9d\u73fe\u5834",
    code: "SITE_DEPENDENT_SCOPE",
    message: "Site-dependent wording requires human confirmation.",
  },
  {
    token: "\u66ab\u4f30",
    code: "PROVISIONAL_AMOUNT",
    message: "Provisional amount wording requires human confirmation.",
  },
  {
    token: "\u53e6\u8a08",
    code: "SEPARATE_ESTIMATE",
    message: "Separate-estimate wording requires scope confirmation.",
  },
  {
    token: "\u672a\u542b",
    code: "EXCLUDED_SCOPE",
    message: "Excluded scope must be recorded explicitly.",
  },
  {
    token: "\u7532\u4f9b",
    code: "OWNER_SUPPLIED",
    message: "Owner-supplied scope requires responsibility confirmation.",
  },
  {
    token: "\u9078\u914d",
    code: "OPTIONAL_ITEM",
    message: "Optional scope must not be assumed included.",
  },
];

export const evaluateQuoteFindings = (
  packet: QuoteExtractionPacketV1,
): QuoteHealthFinding[] => {
  const drafts: FindingDraft[] = [];
  const computedLineAmounts: string[] = [];
  const signatures = new Map<string, NormalizedQuoteRow>();
  const unitsByItem = new Map<string, NormalizedQuoteRow>();

  for (const row of packet.rows) {
    if (row.itemName === null) {
      drafts.push(
        finding(
          "MISSING_ITEM_NAME",
          "COMPLETENESS",
          "REVIEW_REQUIRED",
          "Item name is missing.",
          row.evidence,
        ),
      );
    }
    if (row.unit === null) {
      drafts.push(
        finding(
          "MISSING_UNIT",
          "COMPLETENESS",
          "REVIEW_REQUIRED",
          "Unit is missing.",
          row.evidence,
        ),
      );
    }
    const numberChecks: ReadonlyArray<{
      value: NormalizedQuoteRow["quantity"];
      code: QuoteFindingCode;
      label: string;
    }> = [
      { value: row.quantity, code: "UNKNOWN_QUANTITY", label: "Quantity" },
      { value: row.unitPrice, code: "UNKNOWN_UNIT_PRICE", label: "Unit price" },
      {
        value: row.multiplier,
        code: "UNKNOWN_MULTIPLIER",
        label: "Multiplier",
      },
      {
        value: row.declaredAmount,
        code: "UNKNOWN_AMOUNT",
        label: "Declared amount",
      },
    ];
    for (const check of numberChecks) {
      if (check.value.status === "UNKNOWN") {
        drafts.push(
          finding(
            check.code,
            "COMPLETENESS",
            "REVIEW_REQUIRED",
            `${check.label} is unknown.`,
            row.evidence,
          ),
        );
      }
    }

    const quantity = known(row.quantity);
    const unitPrice = known(row.unitPrice);
    const multiplier = known(row.multiplier);
    const declaredAmount = known(row.declaredAmount);
    if (quantity !== null && unitPrice !== null && multiplier !== null) {
      const calculated = multiplyQuoteDecimals([
        quantity,
        unitPrice,
        multiplier,
      ], 2);
      computedLineAmounts.push(calculated);
      if (
        declaredAmount !== null &&
        !quoteDecimalsEqual(calculated, declaredAmount, 2)
      ) {
        drafts.push(
          finding(
            "LINE_AMOUNT_MISMATCH",
            "ARITHMETIC",
            "REVIEW_REQUIRED",
            "Quantity times unit price times multiplier does not match the declared amount.",
            row.evidence,
          ),
        );
      }
    }

    const signature = duplicateSignature(row);
    const previousDuplicate = signatures.get(signature);
    if (previousDuplicate) {
      drafts.push(
        finding(
          "POSSIBLE_DUPLICATE",
          "DUPLICATE",
          "WARNING",
          "A row has the same normalized content as an earlier row.",
          [...previousDuplicate.evidence, ...row.evidence],
        ),
      );
    } else {
      signatures.set(signature, row);
    }

    if (row.itemName !== null && row.unit !== null) {
      const itemKey = row.itemName.trim().toLocaleLowerCase();
      const previousUnit = unitsByItem.get(itemKey);
      if (
        previousUnit && previousUnit.unit !== null &&
        previousUnit.unit.trim().toLocaleLowerCase() !==
          row.unit.trim().toLocaleLowerCase()
      ) {
        drafts.push(
          finding(
            "UNIT_CONFLICT",
            "UNIT",
            "REVIEW_REQUIRED",
            "The same item name uses different units.",
            [...previousUnit.evidence, ...row.evidence],
          ),
        );
      } else if (!previousUnit) {
        unitsByItem.set(itemKey, row);
      }
    }

    const text = rowText(row);
    for (const rule of wordingRules) {
      if (text.includes(rule.token)) {
        drafts.push(
          finding(
            rule.code,
            "SCOPE",
            "REVIEW_REQUIRED",
            rule.message,
            row.evidence,
          ),
        );
      }
    }
  }

  if (
    computedLineAmounts.length === packet.rows.length &&
    computedLineAmounts.length > 0
  ) {
    const computedSubtotal = addQuoteDecimals(computedLineAmounts, 2);
    const declaredSubtotal = known(packet.totals.declaredSubtotal);
    if (
      declaredSubtotal !== null &&
      !quoteDecimalsEqual(computedSubtotal, declaredSubtotal, 2)
    ) {
      drafts.push(
        finding(
          "SUBTOTAL_MISMATCH",
          "ARITHMETIC",
          "REVIEW_REQUIRED",
          "Calculated line amounts do not match the declared subtotal.",
          packet.totals.evidence,
        ),
      );
    }
    const taxRate = known(packet.totals.taxRate);
    const declaredTax = known(packet.totals.declaredTax);
    const declaredTotal = known(packet.totals.declaredTotal);
    if (taxRate !== null) {
      const computedTax = multiplyQuoteDecimals([computedSubtotal, taxRate], 2);
      if (
        declaredTax !== null && !quoteDecimalsEqual(computedTax, declaredTax, 2)
      ) {
        drafts.push(
          finding(
            "TAX_MISMATCH",
            "ARITHMETIC",
            "REVIEW_REQUIRED",
            "Calculated tax does not match the declared tax.",
            packet.totals.evidence,
          ),
        );
      }
      if (declaredTotal !== null) {
        const computedTotal = addQuoteDecimals(
          [computedSubtotal, computedTax],
          2,
        );
        if (!quoteDecimalsEqual(computedTotal, declaredTotal, 2)) {
          drafts.push(
            finding(
              "TOTAL_MISMATCH",
              "ARITHMETIC",
              "REVIEW_REQUIRED",
              "Calculated subtotal plus tax does not match the declared total.",
              packet.totals.evidence,
            ),
          );
        }
      }
    }
  }

  const isStale =
    packet.sourceDocumentVersionId !== packet.sourceDocumentCurrentVersionId ||
    packet.sourceDocumentSupersededByVersionId !== null;
  if (isStale) {
    drafts.push(
      finding(
        "DOCUMENT_VERSION_SUPERSEDED",
        "VERSION",
        "REVIEW_REQUIRED",
        "A newer immutable document version exists; this historical result must not drive a new decision.",
        packet.evidenceReferences,
      ),
    );
  }

  return drafts.map((item, index) => ({
    findingId: `finding_${
      String(index + 1).padStart(3, "0")
    }_${item.code.toLocaleLowerCase()}`,
    ...item,
  }));
};
