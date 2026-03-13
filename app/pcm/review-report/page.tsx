import React from 'react';

export default function PcmReviewReportPage() {
    // System Designer Rule: Analytics exist to catch macro-level risks.
    return (
        <div className="space-y-6">
            <div className="border-b border-slate-200 pb-4">
                <h2 className="text-2xl font-bold text-slate-900">Risk Review & Reporting</h2>
                <p className="text-sm text-slate-500 mt-1">Macro-level system health metrics and automated risk flags.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Risk Vector Panel */}
                <div className="bg-white border border-slate-200 rounded-lg p-6 flex flex-col h-[400px]">
                    <h3 className="text-lg font-bold text-slate-800 border-b border-slate-100 pb-3 mb-4">Top Risk Vectors</h3>
                    <div className="flex-1 flex items-center justify-center border-2 border-dashed border-slate-200 rounded-lg bg-slate-50">
                        <div className="text-center">
                            <span className="block text-4xl mb-2">📊</span>
                            <p className="text-slate-500 font-semibold text-sm">Automated Chart Skeleton: Dispute by Subcontractor Type</p>
                        </div>
                    </div>
                </div>

                {/* Generated Audit Reports */}
                <div className="bg-white border border-slate-200 rounded-lg p-6 space-y-4">
                    <h3 className="text-lg font-bold text-slate-800 border-b border-slate-100 pb-3">Automated System Audit Logs</h3>
                    <ul className="space-y-3">
                        <li className="flex justify-between items-center p-3 bg-slate-50 border border-slate-100 rounded hover:bg-slate-100 cursor-pointer transition">
                            <div>
                                <span className="font-bold text-slate-700 block text-sm">February 2026 Financial Integrity Report</span>
                                <span className="text-xs text-slate-400">Contains Escrow mismatch scan results.</span>
                            </div>
                            <span className="text-xs font-bold text-blue-600 uppercase">View Report</span>
                        </li>
                        <li className="flex justify-between items-center p-3 bg-slate-50 border border-slate-100 rounded hover:bg-slate-100 cursor-pointer transition">
                            <div>
                                <span className="font-bold text-slate-700 block text-sm">Q4 2025 Vendor Capability Audit</span>
                                <span className="text-xs text-slate-400">Flags vendors with expired licenses attached to active projects.</span>
                            </div>
                            <span className="text-xs font-bold text-blue-600 uppercase">View Report</span>
                        </li>
                    </ul>
                </div>
            </div>
        </div>
    );
}
