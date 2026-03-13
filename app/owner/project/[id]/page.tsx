import React from 'react';
import DataTable from '../../../../components/tables/DataTable';
import DocumentUpload from '../../../../components/upload/DocumentUpload';
import { TraceableNumber, FormFieldLocked } from '../../../../components/forms/SystemForm';

export default function ProjectDetailsPage({ params }: { params: { id: string } }) {
    // Mock data for Phase 1 UI Skeleton
    const projectId = 'PRJ-2026-001'; // Fallback if params not passed directly in pure layout dev

    return (
        <div className="space-y-8">
            {/* Header Area */}
            <div className="flex justify-between items-start border-b border-slate-200 pb-6">
                <div>
                    <h2 className="text-2xl font-bold text-slate-900">Taipei Office Renovation</h2>
                    <div className="flex items-center gap-3 mt-2">
                        <span className="text-sm font-mono text-slate-500">ID: {projectId}</span>
                        <span className="px-2 py-0.5 bg-blue-100 text-blue-800 text-xs font-bold rounded border border-blue-200">
                            Execution Phase
                        </span>
                    </div>
                </div>

                {/* Rule 8: Overriding / Destructive action clearly separated and uncomfortable */}
                <button className="px-4 py-2 border border-red-200 text-red-600 rounded text-sm font-bold hover:bg-red-50 hover:border-red-300 transition-colors">
                    Request Request Abort (Penalty Applies)
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Column: Data and Status */}
                <div className="lg:col-span-2 space-y-8">

                    <section className="bg-white p-6 rounded-lg border border-slate-200 space-y-6">
                        <h3 className="text-lg font-bold text-slate-800 border-b border-slate-100 pb-2">Financial Overview</h3>
                        <div className="grid grid-cols-2 gap-6">
                            <TraceableNumber label="Approved Budget Ceiling" amount={1250000} />
                            <TraceableNumber label="Current Committed Spend" amount={450000} />
                        </div>
                    </section>

                    <section className="space-y-4">
                        <h3 className="text-lg font-bold text-slate-800">Assigned Vendors</h3>
                        <DataTable
                            columns={["Vendor Name", "Role", "Contract Status"]}
                            data={[
                                ["BuildCorp Taiwan", "General Contractor", "Signed & Bound"],
                                ["LumenLighting", "Lighting Subcontractor", "Pending Signature"]
                            ]}
                        />
                    </section>

                </div>

                {/* Right Column: Actions and Uploads */}
                <div className="space-y-6">
                    <section className="bg-slate-50 p-6 rounded-lg border border-slate-200 space-y-4">
                        <h3 className="text-lg font-bold text-slate-800 border-b border-slate-200 pb-2">Compliance Documents</h3>

                        <FormFieldLocked
                            label="Master Floor Plan"
                            value="v1.0.3_Approved.pdf"
                            reason="Locked by Vendor Submission"
                        />

                        <div className="pt-4 border-t border-slate-200">
                            <DocumentUpload
                                label="Upload Owner Acceptance Form"
                                accept=".pdf"
                                legalWarning="By uploading this document, you legally confirm acceptance of phase milestones. False submissions hold legal penalties."
                            />
                        </div>
                    </section>
                </div>
            </div>
        </div>
    );
}
