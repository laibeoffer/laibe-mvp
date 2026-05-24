const internalTraceTerms = [
  "source_id",
  "recipe_id",
  "quantity_formula",
  "material_code",
  "internal_note",
  "price_source",
  "confidence",
  "requires_review",
];

const containsInternalTraceTerm = (value) =>
  internalTraceTerms.some((term) =>
    value.toLowerCase().includes(term.toLowerCase()),
  );

export const sanitizeCustomerWarnings = (warnings) => {
  const sanitized = warnings.map((warning) =>
    containsInternalTraceTerm(warning)
      ? "Some budget lines require internal review before formal export."
      : warning,
  );

  return [...new Set(sanitized)];
};
