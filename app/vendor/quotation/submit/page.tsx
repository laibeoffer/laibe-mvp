import React from 'react';
import { SystemForm, FormFieldLocked, TraceableNumber } from '../../../../components/forms/SystemForm';

export default function VendorQuotationSubmitPage() {
    // System Designer Rule: Forms are structured to enforce validation and risk.

    return (
        <div className="max-w-3xl mx-auto space-y-8">
            <div>
                <h2 className="text-2xl font-bold text-slate-900">Submit Quotation (TND-2026-088)</h2>
                <p className="text-sm text-slate-500 mt-1">
                    Provide your binding quotation for the specified line items. Changes after submission require owner approval.
                </p>
            </div>

            <div className="bg-white border border-slate-200 rounded-lg p-6">
                <h3 className="text-lg font-bold text-slate-900 border-b border-slate-100 pb-3 mb-4">Line Item Breakdown</h3>

                {/* Mocking the item breakdown with disabled fields for spec definitions */}
                <div className="space-y-6">
                    <div className="border border-slate-200 rounded p-4 bg-slate-50">
                        <div className="grid grid-cols-2 gap-4 mb-4">
                            <FormFieldLocked label="Spec Node" value="ELECT-MAIN-01" reason="Defined by Owner" />
                            <FormFieldLocked label="Quantity / Unit" value="1 Set" reason="Master Plan Calculation" />
                        </div>
                        <div className="flex flex-col gap-1">
                            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Your Unit Price ($)</label>
                            <input type="number" className="bg-white border border-slate-300 rounded px-3 py-2 text-sm focus:border-slate-500 focus:ring-slate-500" placeholder="0" />
                        </div>
                    </div>

                    <div className="border border-slate-200 rounded p-4 bg-slate-50">
                        <div className="grid grid-cols-2 gap-4 mb-4">
                            <FormFieldLocked label="Spec Node" value="LIGHT-FIXTURE-TYPE-A" reason="Defined by Owner" />
                            <FormFieldLocked label="Quantity / Unit" value="45 Pieces" reason="Master Plan Calculation" />
                        </div>
                        <div className="flex flex-col gap-1">
                            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Your Unit Price ($)</label>
                            <input type="number" className="bg-white border border-slate-300 rounded px-3 py-2 text-sm focus:border-slate-500 focus:ring-slate-500" placeholder="0" />
                        </div>
                    </div>
                </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-lg p-6">
                <h3 className="text-lg font-bold text-slate-900 border-b border-slate-100 pb-3 mb-4">Final Submission</h3>
                <div className="mb-6">
                    <TraceableNumber label="Calculated Total Proposal" amount={0} />
                    <p className="text-xs text-slate-500 mt-1">Total dynamically calculates based on above inputs.</p>
                </div>
                {/* System form enforces dangerous/irreversible styling */}
                <SystemForm
                    onSubmit={(e) => { e.preventDefault(); }}
                    submitLabel="Lock and Submit Legally Binding Quote"
                    isDangerous={true}
                >
                    <div className="text-sm text-slate-700 bg-red-50 border border-red-200 p-3 rounded">
                        Check carefully. Submitting this establishes a legally binding offer to the Owner representing your company.
                    </div>
                </SystemForm>
            </div>
        </div>
    );
}
