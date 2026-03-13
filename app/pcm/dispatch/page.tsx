import React from 'react';
import { FormFieldLocked } from '../../../components/forms/SystemForm';

export default function PcmDispatchPage() {
    // System Designer Rule: Override is dangerous. Must clearly indicate action consequences.
    return (
        <div className="max-w-5xl space-y-6">
            <div className="border-b border-slate-200 pb-4 flex justify-between items-end">
                <div>
                    <h2 className="text-2xl font-bold text-slate-900">Dispute & Dispatch Command</h2>
                    <p className="text-sm text-slate-500 mt-1">Review locked threads and force resolution through Arbiter Authority.</p>
                </div>
                <span className="bg-red-100 text-red-800 border border-red-200 px-3 py-1 rounded text-xs font-bold font-mono">
                    CAUTION: OVERRIDE INITIATES LEGAL PRECEDENT
                </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Dispute Source Information */}
                <div className="bg-white border border-slate-200 rounded-lg p-6 space-y-4">
                    <h3 className="text-lg font-bold text-slate-900 border-b border-slate-100 pb-3">Active Context: DISP-088</h3>
                    <FormFieldLocked label="Project ID" value="PRJ-2026-001" />
                    <FormFieldLocked label="Disputed Node" value="HVAC-DA-03" reason="Line Item Metadata" />
                    <FormFieldLocked label="AI Guardian Assessment" value="Vendor substituted specification violates original parameters. Liability leans Vendor." reason="System Generated Context" />
                </div>

                {/* Action Dispatcher */}
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-6 flex flex-col justify-between">
                    <div>
                        <h3 className="text-lg font-bold text-slate-900 border-b border-slate-200 pb-3 mb-4">Arbiter Decision Matrix</h3>
                        <p className="text-xs text-slate-600 mb-6">Select a binding resolution pathway below. This action will forcibly unlock the thread and alter project state.</p>
                    </div>

                    <div className="space-y-3">
                        <button className="w-full text-left px-4 py-3 bg-white border border-slate-300 hover:border-slate-500 rounded font-bold text-sm text-slate-700 transition">
                            1. Enforce Original Master Plan Specs (Deny Substitution)
                        </button>
                        <button className="w-full text-left px-4 py-3 bg-white border border-amber-300 hover:border-amber-500 rounded font-bold text-sm text-amber-800 transition">
                            2. Permit Deviation (Hold Vendor Liable for Price Delta)
                        </button>
                        <button className="w-full text-left px-4 py-3 bg-white border border-red-300 hover:bg-red-50 hover:border-red-500 rounded font-bold text-sm text-red-700 transition">
                            3. Trigger Formal Project Penalty / Suspension
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
