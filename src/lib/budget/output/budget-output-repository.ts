import type { BudgetOutputSnapshot } from "./types.ts";

export interface BudgetOutputRepository {
  saveOutputSnapshot(snapshot: BudgetOutputSnapshot): void;
  getOutputSnapshot(snapshotId: string): BudgetOutputSnapshot | undefined;
  listOutputSnapshotsByProject(projectId: string): BudgetOutputSnapshot[];
}
