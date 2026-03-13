import React from 'react';

export default function VendorMessagesPage() {
    // System Designer Rule: Messaging is structured, no free-form context-less chaos.
    return (
        <div className="space-y-6 flex flex-col h-full h-[calc(100vh-140px)]">
            <div className="border-b border-slate-200 pb-4 shrink-0">
                <h2 className="text-2xl font-bold text-slate-900">Contextual Inquiries</h2>
                <p className="text-sm text-slate-500 mt-1">Communicate directly regarding specific project line items.</p>
            </div>

            <div className="flex-1 flex gap-6 overflow-hidden">
                {/* Thread List */}
                <div className="w-1/3 border border-slate-200 bg-white rounded-lg flex flex-col">
                    <div className="p-4 border-b border-slate-200 bg-slate-50 text-xs font-bold uppercase text-slate-500 tracking-wider">
                        Your Active Threads
                    </div>
                    <div className="flex-1 overflow-y-auto">
                        <div className="p-4 border-b border-slate-100 bg-blue-50 cursor-pointer">
                            <span className="text-xs text-blue-600 font-bold block mb-1">PRJ-2026-001 • Line Item 4a</span>
                            <p className="text-sm font-semibold text-slate-900">HVAC Specification Clarification</p>
                        </div>
                    </div>
                </div>

                {/* Thread Content */}
                <div className="flex-1 border border-slate-200 bg-white rounded-lg flex flex-col">
                    <div className="p-4 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
                        <div>
                            <h3 className="font-bold text-slate-900">HVAC Specification Clarification</h3>
                            <p className="text-xs text-slate-500 font-mono">Context: [Spec Node ID: HVAC-DA-03]</p>
                        </div>
                        {/* Vendor-specific restriction visual rule */}
                        <span className="px-2 py-1 bg-amber-100 text-amber-800 text-[10px] font-bold rounded uppercase">
                            Waiting Owner Action
                        </span>
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/50">
                        {/* Message bubble from Vendor */}
                        <div className="bg-white border border-slate-200 p-3 rounded-lg max-w-md ml-auto text-right">
                            <span className="text-xs font-bold text-slate-800 block mb-1">You (Vendor)</span>
                            <p className="text-sm text-slate-600 text-left">The current specified unit model is discontinued. We propose substituting with equivalent Daikin model.</p>
                        </div>

                        <div className="mx-auto w-3/4 bg-slate-200 border border-slate-300 p-2 rounded text-center">
                            <span className="text-xs font-bold text-slate-600 block">System Event</span>
                            <p className="text-[10px] text-slate-500 mt-0.5">Substitution request logged. Waiting for Owner deviation workflow review.</p>
                        </div>
                    </div>

                    <div className="p-4 border-t border-slate-200 bg-slate-100 italic text-sm text-center text-slate-500">
                        Thread locked pending Owner resolution.
                    </div>
                </div>
            </div>
        </div>
    );
}
