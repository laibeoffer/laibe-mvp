import React from 'react';
import DataTable from '../../../components/tables/DataTable';

export default function PcmArchivePage() {
    // System Designer Rule: Archives are immutable.
    return (
        <div className="space-y-6">
            <div className="border-b border-slate-200 pb-4 flex justify-between items-end">
                <div>
                    <h2 className="text-2xl font-bold text-slate-900">Immutable System Archive</h2>
                    <p className="text-sm text-slate-500 mt-1">Read-only ledger of all historical project closures, sealed contracts, and arbiter interventions.</p>
                </div>
                <div className="text-xs text-slate-400 font-mono bg-slate-50 px-2 py-1 rounded border border-slate-200">
                    Vault State: SECURE_APPEND_ONLY
                </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-lg p-6">
                <div className="flex gap-4 mb-6">
                    <input type="text" placeholder="Search UUID, PRJ-ID, Target Hash..." className="flex-1 border border-slate-300 rounded px-4 py-2 text-sm focus:border-slate-500" />
                    <button className="px-6 py-2 bg-slate-900 text-white rounded text-sm font-bold">Query Ledger</button>
                </div>

                <h3 className="text-lg font-bold text-slate-800 mb-4">Latest Sealed Records</h3>
                <DataTable
                    columns={["Timestamp (UTC)", "Record Type", "Reference ID", "Integrity Hash"]}
                    data={[
                        ["2026-03-12 14:00:21", "CONTRACT_SEAL", "CON-2025-011", <span className="font-mono text-xs text-slate-400" key="1">0x8f3c...9a12</span>],
                        ["2026-03-10 09:12:00", "ARBITER_OVERRIDE", "DISP-044", <span className="font-mono text-xs text-slate-400" key="2">0x11bA...4c33</span>],
                        ["2026-03-05 18:45:11", "PROJECT_CLOSE", "PRJ-2025-099", <span className="font-mono text-xs text-slate-400" key="3">0x99FF...0a11</span>]
                    ]}
                />
            </div>
        </div>
    );
}
