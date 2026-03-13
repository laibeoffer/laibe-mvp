import React from 'react';

export default function PcmTopbar() {
    // System Designer Rule: User always knows their status. PCM topbar clearly denotes omnipotent arbiter state.
    return (
        <header className="h-16 border-b border-slate-200 bg-white flex items-center justify-between px-6 shrink-0">
            <div className="flex flex-col">
                {/* Context visualization */}
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-widest">Global Status</span>
                <h1 className="text-sm font-bold text-slate-800">PCM Governance Active</h1>
            </div>

            <div className="flex items-center gap-4">
                {/* Risk rule: Highest privilege must be visually distinct and undeniable */}
                <div className="flex items-center gap-2 text-sm text-purple-900 bg-purple-100 px-4 py-1.5 rounded-full border border-purple-300 font-bold shadow-sm cursor-help" title="Arbiter Privilege: Your actions override all users">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                    <span className="tracking-wide">Role: PCM Arbiter Base</span>
                </div>
            </div>
        </header>
    );
}
