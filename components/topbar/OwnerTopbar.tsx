import React from 'react';

export default function OwnerTopbar() {
    // System Designer Rule: User always knows where they are and their status.
    return (
        <header className="h-16 border-b border-slate-200 bg-white flex items-center justify-between px-6 shrink-0">
            <div className="flex flex-col">
                {/* Context visualization */}
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-widest">Global Status</span>
                <h1 className="text-sm font-bold text-slate-800">Owner Portal Active</h1>
            </div>

            <div className="flex items-center gap-4">
                {/* Risk rule: User roles must be undeniable. No impersonation. */}
                <div className="text-sm text-slate-600 bg-slate-100 px-3 py-1 rounded-full border border-slate-200 cursor-not-allowed">
                    Role: Owner (Read-Only Badge)
                </div>
            </div>
        </header>
    );
}
