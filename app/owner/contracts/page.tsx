import React from 'react';
import { FormFieldLocked, TraceableNumber } from '../../../components/forms/SystemForm';

export default function OwnerContractsPage() {
    // System Designer Rule: Contracts are final. Locked visually.
    return (
        <div className="space-y-6">
            <div className="border-b border-slate-200 pb-4">
                <h2 className="text-2xl font-bold text-slate-900">Contract Management</h2>
                <p className="text-sm text-slate-500 mt-1">Review generated, legally-binding contract versions.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Contract Card */}
                <div className="bg-white border border-slate-200 rounded-lg p-6 space-y-4 relative overflow-hidden">
                    {/* Lock watermark */}
                    <div className="absolute -right-8 -top-8 text-slate-100 rotate-12 select-none pointer-events-none">
                        <svg className="w-48 h-48 opacity-50" fill="currentColor" viewBox="0 0 24 24">
                            <path fillRule="evenodd" d="M12 1.5a5.25 5.25 0 00-5.25 5.25v3a3 3 0 00-3 3v6.75a3 3 0 003 3h10.5a3 3 0 003-3v-6.75a3 3 0 00-3-3v-3c0-2.9-2.35-5.25-5.25-5.25zm3.75 8.25v-3a3.75 3.75 0 10-7.5 0v3h7.5z" clipRule="evenodd" />
                        </svg>
                    </div>

                    <h3 className="text-lg font-bold text-slate-900">Contract #CON-2026-880</h3>
                    <div className="flex gap-2">
                        <span className="px-2 py-1 bg-green-100 text-green-800 text-xs font-bold rounded border border-green-200">Signed & Sealed</span>
                        <span className="px-2 py-1 bg-slate-100 text-slate-600 text-xs font-bold rounded border border-slate-200">Revision: v1.0.3</span>
                    </div>

                    <div className="space-y-4 mt-6">
                        <FormFieldLocked label="Assigned Vendor" value="BuildCorp Taiwan" reason="Contract bounded state" />
                        <TraceableNumber label="Final Stipulated Sum" amount={1248000} />
                    </div>

                    <div className="pt-6 border-t border-slate-100 mt-6 relative z-10 flex gap-4">
                        <button className="flex-1 px-4 py-2 bg-slate-900 text-white font-bold rounded text-sm hover:bg-slate-800 transition">
                            Download PDF Spec
                        </button>
                        {/* Rule 8: Override is very uncomfortable */}
                        <button className="px-4 py-2 bg-white text-red-600 border border-red-200 font-bold rounded text-sm hover:bg-red-50 hover:border-red-400 transition">
                            Initiate Penalty Clause
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
