export const mockProject = {
  project_id: "demo-method-spec-mock-project",
  source_type: "demo_budget_spec_fixture",
  title: "Demo method-spec mock project",
  candidate_only: true,
  productionReady: false,
  formalEstimateAllowed: false,
  productionQuantityAllowed: false,
  source_boundary: "DEMO_SPEC_FIXTURE_NOT_PRODUCTION_SOURCE",
  notes: [
    "Demo fixture for no-emit specs only.",
    "Not a production quantity source.",
  ],
} as const;
