import React from 'react';
import DataTable from '../../../components/tables/DataTable';
import { FormFieldLocked } from '../../../components/forms/SystemForm';

export default function PcmGovernancePage() {
    // System Designer Rule: Rules are strict protocols. Changing governance is heavily monitored.
    return (
        <div className="space-y-6">
            <div className="border-b border-slate-200 pb-4">
                <h2 className="text-2xl font-bold text-slate-900">Platform Governance Rules</h2>
                <p className="text-sm text-slate-500 mt-1">Manage global system parameters and AI arbiter guidelines setting.</p>
            </div>

            <div className="bg-white border border-slate-200 rounded-lg p-6">
                <h3 className="text-lg font-bold text-slate-800 mb-4">Hardcoded Legal Parameters</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                    <FormFieldLocked label="Default Penalty Fee" value="5% of Total Sum" reason="Core Laibe Policy (Requires DB admin to mutate)" />
                    <FormFieldLocked label="Dispute Lock Timeout" value="48 Hours" reason="Core Laibe Policy" />
                </div>

                <h3 className="text-lg font-bold text-slate-800 mb-4">AI Arbiter Heuristics Overview</h3>
                <DataTable
                    columns={["Rule ID", "Focus Area", "Status", "Last Modified"]}
                    data={[
                        ["RL-001", "Material Substitution", "Active Enforcing", "2025-10-12"],
                        ["RL-002", "Timeline Derivation", "Active Enforcing", "2025-11-20"],
                        ["RL-003", "Force Majeure Checks", "Learning Mode", "2026-01-05"]
                    ]}
                />
            </div>
        </div>
    );
}
