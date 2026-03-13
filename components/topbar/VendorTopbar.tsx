import React from 'react';

export default function VendorTopbar() {
    // System Designer Rule: User always knows where they are and their status.
    return (
        <header className="h-16 border-b border-slate-200 bg-white flex items-center justify-between px-6 shrink-0">
            <div className="flex flex-col">
                {/* Context visualization */}
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-widest">Global Status</span>
                <h1 className="text-sm font-bold text-slate-800">Vendor Workspace Active</h1>
            </div>

            <div className="flex items-center gap-4">
                {/* Risk rule: User roles must be undeniable. No impersonation. */}
                <div className="flex items-center gap-2 text-sm text-amber-800 bg-amber-50 px-3 py-1 rounded-full border border-amber-200 cursor-help" title="Your actions hold direct financial liability">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    <span className="font-bold">Role: Vendor (Liability Bound)</span>
                </div>
            </div>
        </header>
    );
}
