import React from 'react';
import DataTable from '../../../../components/tables/DataTable';
import { TraceableNumber, FormFieldLocked } from '../../../../components/forms/SystemForm';

export default function VendorProjectPage({ params }: { params: { id: string } }) {
    // System Designer Rule: Information is strictly bound. Actions are explicit.
    const projectId = 'PRJ-2026-001';

    return (
        <div className="space-y-8">
            {/* Header Area */}
            <div className="flex justify-between items-start border-b border-slate-200 pb-6">
                <div>
                    <h2 className="text-2xl font-bold text-slate-900">Taipei Office Renovation</h2>
                    <div className="flex items-center gap-3 mt-2">
                        <span className="text-sm font-mono text-slate-500">Project ID: {projectId}</span>
                        <span className="px-2 py-0.5 bg-blue-100 text-blue-800 text-xs font-bold rounded border border-blue-200">
                            Active Execution Phase
                        </span>
                    </div>
                </div>

                {/* Rule 8: Destructive warning */}
                <button className="px-4 py-2 border border-red-200 text-red-600 rounded text-sm font-bold hover:bg-red-50 hover:border-red-300 transition-colors">
                    Report Delay / Force Majeure
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Column: Data and Status */}
                <div className="lg:col-span-2 space-y-8">

                    <section className="bg-white p-6 rounded-lg border border-slate-200 space-y-6">
                        <h3 className="text-lg font-bold text-slate-800 border-b border-slate-100 pb-2">Your Bound Contract Details</h3>
                        <div className="grid grid-cols-2 gap-6">
                            <TraceableNumber label="Contracted Sum" amount={850000} />
                            <TraceableNumber label="Pending Milestone Payment" amount={200000} />
                        </div>
                        {/* Locked info showing fixed deadlines */}
                        <div className="mt-4 pt-4 border-t border-slate-100 grid grid-cols-2 gap-6">
                            <FormFieldLocked label="Execution Start" value="2026-03-01" reason="Contract Bound" />
                            <FormFieldLocked label="Required Handover" value="2026-06-30" reason="Contract Bound" />
                        </div>
                    </section>

                    <section className="space-y-4">
                        <h3 className="text-lg font-bold text-slate-800">Assigned Tasks (Master Plan Derived)</h3>
                        <DataTable
                            columns={["Task ID", "Spec Node", "Status", "Action"]}
                            data={[
                                ["TSK-A1", "HVAC-DA-03", "Pending Materials", <button className="text-blue-600 font-bold text-xs" key="1">Submit Materials</button>],
                                ["TSK-A2", "LIGHT-01", "In Progress", <button className="text-blue-600 font-bold text-xs" key="2">Mark Complete</button>]
                            ]}
                        />
                    </section>

                </div>

                {/* Right Column: Actions and Uploads */}
                <div className="space-y-6">
                    <section className="bg-slate-50 p-6 rounded-lg border border-slate-200 space-y-4">
                        <h3 className="text-lg font-bold text-slate-800 border-b border-slate-200 pb-2">Reference Documents</h3>

                        <FormFieldLocked
                            label="Approved Final Blueprint"
                            value="v1.0.3_Sealed.pdf"
                            reason="Source of Truth (SSOT)"
                        />

                        <div className="pt-4 border-t border-slate-200">
                            <button className="w-full bg-slate-900 text-white font-bold text-sm py-2 rounded hover:bg-slate-800 transition">
                                Open Blueprint Viewer
                            </button>
                        </div>
                    </section>
                </div>
            </div>
        </div>
    );
}
