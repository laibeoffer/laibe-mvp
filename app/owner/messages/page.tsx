import React from 'react';

export default function OwnerMessagesPage() {
    // System Designer Rule: Messaging is structured, no free-form context-less chaos.
    return (
        <div className="space-y-6 flex flex-col h-full h-[calc(100vh-140px)]">
            <div className="border-b border-slate-200 pb-4 shrink-0">
                <h2 className="text-2xl font-bold text-slate-900">Contextual Messages</h2>
                <p className="text-sm text-slate-500 mt-1">Communications are strictly bound to specific project clauses and line items.</p>
            </div>

            <div className="flex-1 flex gap-6 overflow-hidden">
                {/* Thread List */}
                <div className="w-1/3 border border-slate-200 bg-white rounded-lg flex flex-col">
                    <div className="p-4 border-b border-slate-200 bg-slate-50 text-xs font-bold uppercase text-slate-500 tracking-wider">
                        Active Disputes / Threads
                    </div>
                    <div className="flex-1 overflow-y-auto">
                        <div className="p-4 border-b border-slate-100 bg-blue-50 cursor-pointer">
                            <span className="text-xs text-blue-600 font-bold block mb-1">PRJ-2026-001 • Line Item 4a</span>
                            <p className="text-sm font-semibold text-slate-900">HVAC Specification Clarification</p>
                        </div>
                        <div className="p-4 border-b border-slate-100 cursor-pointer hover:bg-slate-50">
                            <span className="text-xs text-slate-500 font-bold block mb-1">PRJ-2026-002 • Payment Milestone 2</span>
                            <p className="text-sm font-semibold text-slate-700">Vendor Requesting Release</p>
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
                        {/* Read-only restriction visual rule */}
                        <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-[10px] font-bold rounded uppercase">
                            Pending AI Arbiter Rule
                        </span>
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/50">
                        {/* Message bubble from Vendor */}
                        <div className="bg-white border border-slate-200 p-3 rounded-lg max-w-md">
                            <span className="text-xs font-bold text-slate-800 block mb-1">Vendor: BuildCorp Taiwan</span>
                            <p className="text-sm text-slate-600">The current specified unit model is discontinued. We propose substituting with equivalent Daikin model.</p>
                        </div>
                        {/* System warning block instead of normal message */}
                        <div className="mx-auto w-3/4 bg-red-50 border border-red-200 p-3 rounded text-center">
                            <span className="text-xs font-bold text-red-800 block">System Guardrail Triggered</span>
                            <p className="text-xs text-red-600 mt-1">Substitution requires formal deviation request and spec update. Proceeding without formal change voids warranty.</p>
                        </div>
                    </div>

                    <div className="p-4 border-t border-slate-200 bg-white">
                        <div className="flex gap-2">
                            {/* Structured replies, not free text, to minimize unstructured risk */}
                            <button className="flex-1 bg-slate-100 border border-slate-300 px-4 py-2 rounded text-slate-700 font-semibold text-sm hover:bg-slate-200 transition">
                                Demand Spec Compliance
                            </button>
                            <button className="flex-1 bg-slate-900 text-white border border-slate-900 px-4 py-2 rounded font-semibold text-sm hover:bg-slate-800 transition">
                                Initiate Deviation Review Workflow
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
