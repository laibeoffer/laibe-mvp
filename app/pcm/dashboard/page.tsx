import React from 'react';
import DataTable from '../../../components/tables/DataTable';

export default function PcmDashboardPage() {
    // System Designer Rule: PCM overview serves risk governance, not just a pretty chart.
    return (
        <div className="space-y-6">
            <div className="border-b border-slate-200 pb-4">
                <h2 className="text-2xl font-bold text-slate-900">Global Arbiter Dashboard</h2>
                <p className="text-sm text-slate-500 mt-1">Real-time system health and critical dispute escalation queue.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="bg-white border border-slate-200 p-5 rounded-lg shadow-sm">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Active Disputes</span>
                    <p className="text-3xl font-bold text-red-600 mt-2">12</p>
                </div>
                <div className="bg-white border border-slate-200 p-5 rounded-lg shadow-sm">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Escrow Total Locked</span>
                    <p className="text-3xl font-bold text-slate-800 mt-2">$4.2M</p>
                </div>
                <div className="bg-white border border-slate-200 p-5 rounded-lg shadow-sm">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">System Health Score</span>
                    <p className="text-3xl font-bold text-green-600 mt-2">99.8%</p>
                </div>
            </div>

            <div className="bg-white border border-red-200 rounded-lg p-6 shadow-sm relative overflow-hidden">
                <div className="absolute top-0 left-0 w-1 h-full bg-red-500"></div>
                <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                    Action Required: T1 Escalations
                </h3>
                <DataTable
                    columns={["Thread ID", "Project Node", "SLA Breach Risk", "Action"]}
                    data={[
                        ["DISP-088", "PRJ-2026-001 (Line 4a)", "12 Hours",
                            <a href="/pcm/dispatch" className="px-3 py-1 bg-slate-900 text-white text-xs font-bold rounded" key="1">Intervene</a>
                        ]
                    ]}
                />
            </div>
        </div>
    );
}
