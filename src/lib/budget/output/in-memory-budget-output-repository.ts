import type { BudgetOutputRepository } from "./budget-output-repository.ts";
import type { BudgetOutputSnapshot } from "./types.ts";

export class InMemoryBudgetOutputRepository implements BudgetOutputRepository {
  private snapshots = new Map<string, BudgetOutputSnapshot>();

  saveOutputSnapshot(snapshot: BudgetOutputSnapshot): void {
    this.snapshots.set(snapshot.snapshot_id, snapshot);
  }

  getOutputSnapshot(snapshotId: string): BudgetOutputSnapshot | undefined {
    return this.snapshots.get(snapshotId);
  }

  listOutputSnapshotsByProject(projectId: string): BudgetOutputSnapshot[] {
    return [...this.snapshots.values()].filter(
      (snapshot) => snapshot.project_id === projectId,
    );
  }
}
