import React from 'react';
import DataTable from '../../../components/tables/DataTable';

export default function VendorTendersPage() {
    // System Designer Rule: View open bids. Explicit constraints on clicking "Apply" if unqualified.
    return (
        <div className="space-y-6">
            <div className="border-b border-slate-200 pb-4">
                <h2 className="text-2xl font-bold text-slate-900">Open Tenders (Bids)</h2>
                <p className="text-sm text-slate-500 mt-1">Match your capabilities to active owner requests.</p>
            </div>

            <div className="bg-white border border-slate-200 rounded-lg p-6">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-bold text-slate-800">Matched to Your Profile</h3>
                    <span className="text-xs font-bold text-slate-500 uppercase bg-slate-100 px-2 py-1 rounded">2 Matches</span>
                </div>

                {/* Table showing read-only tender list */}
                <DataTable
                    columns={["Tender ID", "Project Type", "Est. Budget limit", "Deadline", "Action"]}
                    data={[
                        ["TND-2026-088", "Retail Renovation", "$500,000", "2026-04-01",
                            <a href="/vendor/quotation/submit" className="text-blue-600 hover:underline font-bold text-xs" key="1">Initiate Quote</a>
                        ],
                        ["TND-2026-092", "Office Fit-out", "$1,200,000", "2026-04-10",
                            <a href="/vendor/quotation/submit" className="text-blue-600 hover:underline font-bold text-xs" key="2">Initiate Quote</a>
                        ]
                    ]}
                />
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-lg p-6 opacity-75">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                        <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                        </svg>
                        Blocked Tenders
                    </h3>
                </div>
                <p className="text-xs text-slate-500 mb-4">The following tenders require capability tags you currently do not hold verified.</p>

                <DataTable
                    columns={["Tender ID", "Project Type", "Missing Capability"]}
                    data={[
                        ["TND-2026-105", "High-Voltage Setup", "Class A Electrical"],
                        ["TND-2026-110", "Structural Modification", "Civil Engineer License"]
                    ]}
                />
            </div>
        </div>
    );
}
