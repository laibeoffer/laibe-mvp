import React from 'react';
import DataTable from '../../../components/tables/DataTable';
import { TraceableNumber } from '../../../components/forms/SystemForm';

export default function PcmEscrowPage() {
    // System Designer Rule: Escrow logic is locked entirely. No manual input to amounts. Only authorization toggles.
    return (
        <div className="space-y-6">
            <div className="border-b border-slate-200 pb-4">
                <h2 className="text-2xl font-bold text-slate-900">Escrow Tranche Control</h2>
                <p className="text-sm text-slate-500 mt-1">Global oversight of all platform-bound funds awaiting milestone validation.</p>
            </div>

            <div className="bg-white border border-slate-200 rounded-lg p-6">
                <h3 className="text-lg font-bold text-slate-800 mb-4">Pending Tranche Releases (Awaiting PCM Authorization)</h3>
                {/* Table representation of Escrow - amounts are rigidly defined and not editable */}
                <DataTable
                    columns={["Escrow UUID", "Project", "Milestone", "Bound Amount", "Action"]}
                    data={[
                        ["ESC-9901-A", "PRJ-2026-001", "Phase 1 Sign-off", <TraceableNumber key="num1" label="" amount={250000} />,
                            <button className="px-3 py-1 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded transition" key="btn1">Authorize Release</button>
                        ],
                        ["ESC-9942-B", "PRJ-2026-003", "Final Handover", <TraceableNumber key="num2" label="" amount={100000} />,
                            <button className="px-3 py-1 bg-slate-200 text-slate-500 text-xs font-bold rounded cursor-not-allowed" title="Blocked by active dispute" key="btn2">System Locked</button>
                        ]
                    ]}
                />
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-lg p-6 opacity-80 pt-4">
                <h3 className="text-sm font-bold text-slate-600 uppercase tracking-widest mb-4">Recently Cleared Ledgers</h3>
                <DataTable
                    columns={["Escrow UUID", "Release Date", "Beneficiary", "Amount"]}
                    data={[
                        ["ESC-8800-C", "2026-03-01", "BuildCorp Taiwan", "$150,000"],
                        ["ESC-8799-A", "2026-02-28", "LumenLighting", "$45,000"]
                    ]}
                />
            </div>
        </div>
    );
}
