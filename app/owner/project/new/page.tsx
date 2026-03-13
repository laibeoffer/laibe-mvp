import React from 'react';
import { SystemForm, FormFieldLocked } from '../../../../components/forms/SystemForm';

export default function NewProjectPage() {
    // System Designer Rule: No skipping steps. 
    // If the user hasn't provided details in Step 1, Step 2 is literally disabled and visibly locked.

    return (
        <div className="max-w-3xl mx-auto space-y-8">
            <div>
                <h2 className="text-2xl font-bold text-slate-900">Initiate New Project</h2>
                <p className="text-sm text-slate-500 mt-1">
                    Complete the foundational requirements below. You will not be able to proceed until all requirements are met.
                </p>
            </div>

            {/* Step 1: Foundational Info */}
            <div className="bg-white border border-slate-200 rounded-lg p-6">
                <h3 className="text-lg font-bold text-slate-900 border-b border-slate-100 pb-3 mb-4">Step 1: Core Specifications</h3>
                <SystemForm
                    onSubmit={(e) => { e.preventDefault(); /* proceed logic */ }}
                    submitLabel="Lock Specifications & Proceed"
                >
                    <div className="space-y-4">
                        <div className="flex flex-col gap-1">
                            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Project Name</label>
                            <input type="text" className="bg-white border border-slate-300 rounded px-3 py-2 text-sm focus:border-slate-500 focus:ring-slate-500" placeholder="e.g. Taipei Office" />
                        </div>

                        <div className="flex flex-col gap-1">
                            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Intended Budget Limit ($)</label>
                            <input type="number" className="bg-white border border-slate-300 rounded px-3 py-2 text-sm focus:border-slate-500 focus:ring-slate-500" placeholder="e.g. 5000000" />
                        </div>

                        {/* Rule 4: System generated IDs or locked constraints must distinctively look un-editable */}
                        <FormFieldLocked
                            label="Assigned System ID"
                            value="PRJ-PENDING-ALLOCATION"
                            reason="Generated upon submission"
                        />
                    </div>
                </SystemForm>
            </div>

            {/* Step 2: Visually Disabled (Rule 10: No shortcuts, User knows current gate) */}
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-6 opacity-60">
                <div className="flex items-center gap-3 border-b border-slate-200 pb-3 mb-4">
                    <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                    <h3 className="text-lg font-bold text-slate-500">Step 2: Upload Floor Plans</h3>
                </div>
                <p className="text-sm text-slate-500 italic">
                    You must lock Step 1 core specifications before uploading documentation.
                </p>
            </div>
        </div>
    );
}
